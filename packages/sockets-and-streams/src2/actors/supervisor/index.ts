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
import {
    TERMINALPOOL,
    SETPOOL,
    BOOTEND,
    NEGOTIATE_PROTOCOL,
    OOD_AUTH,
    AUTH_PW_MISSING,
    AUTH_END,
    OOD_SESSION_INFO,
    INFO_TOKENS
} from './constants';
import { delayMillis } from '../helpers';
import Encoder from '../../utils/Encoder';
import { PG_ERROR, PG_NOTICE } from '../../messages/fromBackend/ErrorAndNoticeResponse/constants';
import { END_CONNECTION, NETCLOSE, NETWORKERR, SESSION_INFO_END, SSL } from '../constants';
import Boot from '../boot';
import { SocketControlMsgs, UpgradeToSSL } from '../socket/messages';
import AuthenticationActor from '../auth';
import { SET_ACTOR } from '../socket/constants';
import SessionInfoExchange from '../sessionInfo';
import { SES_START } from '../sessionInfo/constants';
import Query from '../query';

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
        vis: null,
        reservedEmpherical: null,
        reservedPermanent: null,
        active: null,
        idle: null,
        terminal: null,
        created: null
    }; // pools
    // the "resident time" histogram of all the pools above
    private readonly poolWaits: PoolWaitTimes = {
        vis: {},
        reservedEmpherical: {},
        reservedPermanent: {},
        active: {},
        idle: {},
        terminal: {},
        created: {}
    };

    private readonly weakSocketMap = new WeakMap<Enqueue<SocketControlMsgs>, []>();

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
            vis: null,
            reservedPermanent: null,
            reservedEmpherical: null,
            idle: null,
            created: null,
            terminal: null
        };
        this.pk = 0;
    }

    public enqueue(msg: SuperVisorControlMsgs) {
        if (msg.type === NETCLOSE) {
            const { wsa, currentPool, poolPlacementTime, socketActor } = msg;
            const newplt = this.migrateToPool(wsa, currentPool, TERMINALPOOL, poolPlacementTime);
            if (newplt) {
                wsa.value.enqueue({ type: SETPOOL, pool: TERMINALPOOL, placementTime: newplt });
            }
            console.log(getStore(this.weakSocketMap, socketActor));
            return;
        }
        // sent when the "end" event is received on the socket object
        if (msg.type === END_CONNECTION) {
            const { socketActor } = msg;
            addToStore(this.weakSocketMap, socketActor, { type: msg.type });
            return;
        }
        if (isInformationalMessage(msg)) {
            const { socketActor } = msg;
            addToStore(this.weakSocketMap, socketActor, { type: msg.type, ...('pl' in msg && { pl: msg.pl }) });
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
        if (msg.type === BOOTEND) {
            const socketActor = msg.socketActor;
            const readable = msg.pl;
            const authActor = new AuthenticationActor(
                readable,
                normalizePGConfig(this.getClientConfig()),
                socketActor,
                this,
                this.encoder,
                this.decoder
            );
            socketActor.enqueue({ type: SET_ACTOR, pl: authActor });
            return;
        }
        if (msg.type === INFO_TOKENS) {
            const { socketActor, pl } = msg;
            pl.forEach((token) => {
                addToStore(this.weakSocketMap, socketActor, {
                    type: token.type,
                    ...('pl' in token && { pl: token.pl })
                });
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
            const {
                socketActor,
                readable,
                backendKey,
                paramStatus,
                poolPlacementTime,
                finalPool,
                currentPool,
                r4q,
                wsa
            } = msg;
            const sessionActor = new Query(this, socketActor, this.encoder, this.decoder, paramStatus, backendKey, r4q);
            const newplt = this.migrateToPool(wsa, currentPool, finalPool, poolPlacementTime);
            if (newplt) {
                socketActor.enqueue({ type: SETPOOL, pool: finalPool, placementTime: newplt });
            }
            socketActor.enqueue({ type: SET_ACTOR, pl: sessionActor });
            return;
        }
        // process other events or defer their operations
    }

    public async addConnection(forPool: PoolFirstResidence, jitter = getRandomDelayInMs()): Promise<boolean> {
        // validation
        // pg connection params (use, host, session params, etc)
        const pgConfig = this.getClientConfig();
        const isValidPGConfig = validatePGConnectionParams(pgConfig);

        if (Array.isArray(isValidPGConfig)) {
            // todo: handle error logging
            console.log(isValidPGConfig.map((err) => err.message).join('\n'));
            return false;
        }
        // ssl connection params, false (no ssl), true (ssl), or error (ssl configuration errors)
        const isSSLValid = getSLLSocketClassAndOptions(this.createSSLSocketSpec);

        if (Array.isArray(isSSLValid)) {
            //todo: comminicate this back to the api caller somehow
            console.log(isSSLValid.map((err) => err.message).join('\n'));
            return false;
        }
        // fallback possible?
        const doFallBackFromSSL = isSSLValid ? this.getSSLFallback(pgConfig) : false;

        // I AM HERE:
        // todo: isSSLValid, doFallBackFromSSL are needed by boot upfront to make good decisions about connection
        // create the bootActor here and attach it to SocketActor
        let socketActor: SocketActor;
        const bootActor = new Boot(this, () => socketActor, isSSLValid, doFallBackFromSSL, this.encoder, this.decoder);

        // wait daily ms
        await delayMillis(jitter);
        // action network connection is made
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
        return true;
    }
}
