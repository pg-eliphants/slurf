import Enqueue from '../Enqueue';
import { SuperVisorControlMsgs } from './messages';
import {
    addToStore,
    getRandomDelayInMs,
    getSLLSocketClassAndOptions,
    getStore,
    isInformationalMessage,
    normalizePGConfig,
    validatePGConnectionParams
} from './helper';
import {
    ActivityTimeToBins,
    ActivityWait,
    ActivityWaitTimes,
    ClientConfig,
    CreateSSLSocketSpec,
    CreateSocketSpec,
    Pool,
    PoolFirstResidence,
    PoolTimeBins,
    PoolWaitTimes,
    Residency,
    SSLFallback
} from './types';
import SocketActor from '../socket';
import type { Item } from '../../utils/list';
import { insertBefore, removeSelf } from '../../utils/list';
import { TERMINALPOOL, SETPOOL, INFO_TOKENS, ACTIVEPOOL } from './constants';
import { delayMillis } from '../helpers';
import Encoder from '../../utils/Encoder';
import { AUTH_END, BOOTEND, BOOTEND_NO_SSL, END_CONNECTION, NETCLOSE, NETWORKERR, QID, SESSION_INFO_END, SSL } from '../constants';
import Boot from '../boot';
import { SocketControlMsgs, UpgradeToSSL } from '../socket/messages';
import AuthenticationActor from '../auth';
import { SET_ACTOR } from '../socket/constants';
import SessionInfoExchange from '../sessionInfo';
import { SES_START } from '../sessionInfo/constants';
import Query from '../query';
import {
    BufferStuffingAttack as _BufferStuffingAttack,
    EndConnection as _EndConnection,
    NetworkError as _NetworkError,
    MangledData as _MangledData,
    NegotiateProtocolVersion as _NegotiateProtocolVersion,
    PasswordMissing as _PasswordMissing
} from '../messages';
import { SelectedMessages } from '../../messages/fromBackend/types';
import { QUERY_START } from '../query/constants';
import { PromiseExtended, createResolvePromiseExtended } from '../../utils/PromiseExtended';
import { AUTH_START } from '../auth/constants';

export default class SuperVisor implements Enqueue<SuperVisorControlMsgs> {
    // primary key generator for SocketAgents
    private pk: number;
    //
    // global arrgregate metrics,
    private readonly activityWaits: ActivityWaitTimes = {
        network: {},
        iom_code: {},
        connect: {},
        sslConnect: {},
        finish: {},
        end: {},
        close: {},
        drained: {}
    };
    // pools
    // pools
    // pools
    // pool lists
    private readonly residencies: Residency = {
        reserved: null,
        active: null,
        idle: null,
        terminal: null,
        created: null
    }; // pools
    // the "resident time" histogram of all the pools above
    private readonly poolWaits: PoolWaitTimes = {
        reserved: {},
        active: {},
        idle: {},
        terminal: {},
        created: {}
    };

    private readonly weakSocketToInfoMap = new WeakMap<
        Enqueue<SocketControlMsgs>,
        (
            | SelectedMessages
            | _NegotiateProtocolVersion
            | _EndConnection
            | _NetworkError
            | _BufferStuffingAttack
            | _MangledData
            | _PasswordMissing
        )[]
    >();

    private readonly weakSocketToReadyMap = new WeakMap<Enqueue<SocketControlMsgs>, PromiseExtended<Query>>();

    private updateActivityWaitTimes(activity: ActivityWait, bin: number): void {
        this.activityWaits[activity][bin] = (this.activityWaits[activity][bin] ?? 0) + 1;
    }

    private removeFromPool(saw: Item<SocketActor>, currentPool: Pool) {
        const next = saw.next ?? null;
        removeSelf(saw);
        // if i was the first item in the list then the list is also empty
        if (this.residencies[currentPool] === saw) {
            this.residencies[currentPool] = next;
        }
    }

    private updatePoolWaits(start: number, stop: number, pool: Pool) {
        const delay = stop - start;
        const bin = this.reduceTimeToPoolBins[pool](delay);
        this.poolWaits[pool][bin] = (this.poolWaits[pool][bin] ?? 0) + 1;
        return delay;
    }

    private migrateToPool(saw: Item<SocketActor>, current: Pool, target: Pool, placementTime: number) {
        if (current === target) {
            return false;
        }
        const stop = this.now();
        const start = placementTime;
        //
        this.updatePoolWaits(start, stop, current);
        this.removeFromPool(saw, current);
        this.residencies[target] = insertBefore(this.residencies[target], saw);
        return stop;
    }

    constructor(
        private readonly getSSLFallback: SSLFallback,
        private readonly getClientConfig: ClientConfig,
        private readonly createSocketSpec: CreateSocketSpec,
        private readonly createSSLSocketSpec: CreateSSLSocketSpec,
        private readonly now: () => number,
        private readonly reduceTimeToPoolBins: PoolTimeBins,
        private readonly reduceActivityWaitTime2Bins: ActivityTimeToBins,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder
    ) {
        this.residencies = {
            active: null,
            reserved: null,
            idle: null,
            created: null,
            terminal: null
        };
        this.pk = 0;
    }

    public enqueue(msg: SuperVisorControlMsgs) {
        const { socketActor } = msg;
        if (msg.type === NETWORKERR) {
            addToStore(this.weakSocketToInfoMap, socketActor, { type: msg.type, pl: msg.pl });
            return;
        }
        if (msg.type === NETCLOSE) {
            const { wsa, currentPool, poolPlacementTime, socketActor } = msg;
            const newplt = this.migrateToPool(wsa, currentPool, TERMINALPOOL, poolPlacementTime);
            if (newplt) {
                socketActor.enqueue({ type: SETPOOL, pool: TERMINALPOOL, placementTime: newplt });
            }
            const promiseExt = this.weakSocketToReadyMap.get(socketActor);
            promiseExt?.forceReject(getStore(this.weakSocketToInfoMap, socketActor) as any);
            return;
        }
        // sent when the "end" event is received on the socket object
        if (msg.type === END_CONNECTION) {
            const { socketActor } = msg;

            addToStore(this.weakSocketToInfoMap, socketActor, { type: msg.type });
            return;
        }
        if (isInformationalMessage(msg)) {
            const { socketActor } = msg;
            const pl: any = 'pl' in msg ? msg.pl : undefined;
            addToStore(this.weakSocketToInfoMap, socketActor, { type: msg.type, ...(pl && { pl }) });
            return;
        }
        if (msg.type === SSL) {
            const socketActor = msg.socketActor;
            const sockMsg: UpgradeToSSL = {
                type: SSL,
                sslSpec: this.createSSLSocketSpec
            };
            socketActor.enqueue(sockMsg);
            return;
        }
        if (msg.type === BOOTEND || msg.type === BOOTEND_NO_SSL) {
            const socketActor = msg.socketActor;
            const readable = msg.pl;
            const authActor = new AuthenticationActor(
                readable,
                normalizePGConfig(this.getClientConfig(msg.forPool)),
                socketActor,
                this,
                this.encoder,
                this.decoder
            );
            socketActor.enqueue({ type: SET_ACTOR, pl: authActor });
            if (msg.type === BOOTEND_NO_SSL){
                authActor.enqueue({ type: AUTH_START});
            }
            return;
        }
        if (msg.type === INFO_TOKENS) {
            const { socketActor, pl } = msg;
            pl.forEach((token) => {
                addToStore(this.weakSocketToInfoMap, socketActor, token);
            });
            return;
        }
        if (msg.type === AUTH_END) {
            const socketActor = msg.socketActor;
            const readable = msg.pl;
            const sessionActor = new SessionInfoExchange(readable, socketActor, this, this.encoder, this.decoder);
            socketActor.enqueue({ type: SET_ACTOR, pl: sessionActor });
            sessionActor.enqueue({ type: SES_START });
            return;
        }
        if (msg.type === SESSION_INFO_END) {
            const { socketActor, pl } = msg;
            const tokens = getStore(this.weakSocketToInfoMap, socketActor);
            const queryActor = new Query(pl, this, socketActor, this.encoder, this.decoder, tokens || []);
            socketActor.enqueue({ type: SET_ACTOR, pl: queryActor });
            queryActor.enqueue({ type: QUERY_START });
            return;
        }
        if (msg.type === QID){
            const { wsa, currentPool, poolPlacementTime, socketActor, query, finalPool } = msg;
            const promiseExt = this.weakSocketToReadyMap.get(socketActor);
            const targetPool =  promiseExt ? ACTIVEPOOL : finalPool
            const newplt = this.migrateToPool(wsa, currentPool, targetPool, poolPlacementTime);
            if (newplt) {
               socketActor.enqueue({ type: SETPOOL, pool: targetPool, placementTime: newplt });
            }
            this.weakSocketToReadyMap.delete(socketActor);
            promiseExt?.forceResolve(query as any);
            return;
        }
        // process other events or defer their operations
    }

    public async addConnection(forPool: PoolFirstResidence, jitter = getRandomDelayInMs()): Promise<Query> {
        // validation
        // pg connection params (use, host, session params, etc)
        const pgConfig = this.getClientConfig(forPool);
        const isValidPGConfig = validatePGConnectionParams(pgConfig);

        if (Array.isArray(isValidPGConfig)) {
            // todo: handle error logging
            // for now return array of errors
            return Promise.reject(isValidPGConfig.map((err) => err.message).join('\n'));
        }
        // ssl connection params, false (no ssl), true (ssl), or error (ssl configuration errors)
        const isSSLValid = getSLLSocketClassAndOptions(this.createSSLSocketSpec);

        if (Array.isArray(isSSLValid)) {
            //todo: comminicate this back to the api caller somehow
            // for now return array of errors
            return Promise.reject(isSSLValid.map((err) => err.message).join('\n'));
        }
        // fallback possible?
        const doFallBackFromSSL = isSSLValid ? this.getSSLFallback(forPool, pgConfig) : false;

        // create the bootActor here and attach it to SocketActor
        let socketActor: SocketActor;
        const bootActor = new Boot(this, () => socketActor, isSSLValid, doFallBackFromSSL, this.encoder, this.decoder, forPool);

        // wait daily ms
        await delayMillis(jitter);
        // network connection is made
        const { socketFactory, socketConnectOptions, extraOpt } = this.createSocketSpec({ forPool });
        const createConnection = socketFactory();
        const extraOptions = extraOpt();
        const socket = createConnection(socketConnectOptions());
        const item: Item<unknown> = { value: null };
        const wsa: () => Item<SocketActor> = () => {
            item.value = socketActor;
            return item as Item<SocketActor>;
        };
        socketActor = new SocketActor(
            this, // supervisor
            this.reduceActivityWaitTime2Bins,
            socket,
            this.now,
            wsa,
            jitter,
            extraOptions,
            ++this.pk,
            forPool,
            bootActor
        );
        this.residencies.created = insertBefore(this.residencies.created, wsa());
        const promiseExt = createResolvePromiseExtended<Query>(false);
        // no we dont do this here
        this.weakSocketToReadyMap.set(socketActor, promiseExt);
        return promiseExt.promise;
    }
}

/*

scenario 1: Need to add a bunch of sockets to idle at startup of an api, so its ready to service multiple DB request
scenario 2: Need a single connection to directly do stuff
scenario 3: Pick from the "idle", "vis", "reservedPool" pool a Socket (will be transferred to 'active'),

devs only work with the Query Object so when asking for a "endpoint"

-> socket moves to active
-> returns query object to endpoint

supervisor -> socketActor -> Query
     returns    <-           <- returns itself
*/