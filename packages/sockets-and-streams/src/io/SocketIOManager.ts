import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts } from 'net';
import dump from 'buffer-hexdump';
import createNS from '@mangos/debug-frontend';

import type { Jitter } from './Jitter';
import type {
    CreateSocketSpec,
    SocketAttributes,
    SocketOtherOptions,
    SocketConnectOpts,
    PoolFirstResidence,
    CreateSocketConnection,
    PoolWaitTimes,
    ActivityWaitTimes,
    PoolTimeBins,
    ActivityTimeBins,
    PGSSLConfig,
    CreateSSLSocketSpec,
    CreateSLLConnection,
    ActivityWait,
    SendingStatus,
    Residency,
    ResidencyCount,
    Pool,
    ActivityCountBins
} from './types';

import ProtocolManager from '../protocol/ProtocolManager';

import { createResolvePromiseExtended, isAggregateError, isInPools, validatePGSSLConfig } from './helpers';
import delay from '../utils/delay';
import { insertBefore, removeSelf, count } from '../utils/list';

import type { List } from '../utils/list';
import Initializer from '../initializer/Initializer';
import {
    SEND_STATUS_BACKPRESSURE,
    SEND_STATUS_CLOSED,
    SEND_STATUS_OK,
    SEND_STATUS_OK_WITH_BACKPRESSURE,
    SEND_STATUS_ONLY_READ
} from './constants';
import {
    ERR_IOMAN_NO_INTIALIZER,
    NFY_IOMAN_INITIAL_DONE,
    ERR_IOMAN_INTIALIZE_FAIL,
    NFY_IOMAN_SOCKET_CONNECT_EVENT_HANDLED,
    ERR_IOMAN_NO_PROTOCOL_HANDLER
} from '../tail/errors';
import { IO_NAMESPACE } from '../constants';

// const logger = createNS(IO_NAMESPACE);

export interface ISocketIOManager<T = any> {
    setProtocolManager(protocolMngr: ProtocolManager): void;
    setInitializer(Initializer): void;
    send<T>(attributes: SocketAttributes<T>, bin: Uint8Array): SendingStatus;
    getPoolWaitTimes(): PoolWaitTimes;
    createSocketForPool(forPool: PoolFirstResidence): Promise<void>;
    getSLLSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              createSSLConnection: CreateSLLConnection;
              conOpt: PGSSLConfig;
          }
        | { errors: Error[] }
        | false;
    getSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              createConnection: CreateSocketConnection;
              conOpt: SocketConnectOpts;
              extraOpt: SocketOtherOptions;
          }
        | { errors: Error[] };
    upgradeToSSL(item: Exclude<List<SocketAttributes>, null>);
}

const debug = createNS('io-manager');
const trace = createNS('io-manager/events');

export default class SocketIOManager implements ISocketIOManager {
    // pools
    // pools
    // pools
    private residencies: Residency;

    // statistics
    // statistics
    // statistics
    // the "resident time" histogram of all the pools above
    private readonly poolWaits: PoolWaitTimes;
    // time waits during task "network", "iom_code", "connect"
    private readonly activityWaits: ActivityWaitTimes;

    private readonly activityEvents: ActivityCountBins;

    // reference to protocol manager
    private protocolManager: ProtocolManager | null;

    private initializer: Initializer | null;

    private socketId: number;

    constructor(
        private readonly crfn: CreateSocketSpec,
        private readonly sslcrfn: CreateSSLSocketSpec,
        private readonly jitter: Jitter,
        private readonly now: () => number,
        private readonly reduceTimeToPoolBins: PoolTimeBins,
        private readonly reduceTimeToActivityBins: ActivityTimeBins // how are we going to do this?
    ) {
        this.socketId = 1;
        this.residencies = {
            active: null,
            vis: null,
            reservedPermanent: null,
            reservedEmpherical: null,
            idle: null,
            created: null,
            terminal: null
        };
        // wait times
        this.poolWaits = {
            active: {},
            vis: {},
            reservedPermanent: {},
            reservedEmpherical: {},
            idle: {},
            created: {},
            terminal: {}
        };
        this.activityWaits = {
            network: {},
            iom_code: {},
            connect: {},
            sslConnect: {},
            finish: {},
            end: {},
            close: {},
            drained: {}
        };
        this.activityEvents = {
            error: 0,
            idle: 0,
            end: 0
        };
        //
        this.protocolManager = null;
        this.initializer = null;
    }

    private markTime(item: List<SocketAttributes>) {
        return (item!.value.ioMeta.time.ts = this.now());
    }

    private removeFromPool(item: List<SocketAttributes>) {
        const currentPool = item!.value.ioMeta.pool.current;
        const next = item!.next ?? null;
        removeSelf(item);
        // if i was the first item in the list then the list is also empty
        if (this.residencies[currentPool] === item) {
            this.residencies[currentPool] = next;
        }
    }

    private migrateToPool(item: Exclude<List<SocketAttributes>, null>, dst: Pool) {
        const current = item.value.ioMeta.pool.current;
        if (current === dst) {
            return;
        }
        const stop = this.now();
        const start = item.value.ioMeta.pool.placementTime;
        //
        this.updatePoolWaits(item, start, stop, current);
        this.removeFromPool(item);
        this.residencies[dst] = insertBefore(this.residencies[dst], item);
        //
        item.value.ioMeta.pool.lastChecked = stop;
        item.value.ioMeta.pool.placementTime = stop;
    }

    private updateActivityWaitTimes(activity: ActivityWait, start: number, stop: number) {
        const delay = stop - start;
        const bin = this.reduceTimeToActivityBins[activity](delay);
        this.activityWaits[activity][bin] = (this.activityWaits[activity][bin] ?? 0) + 1;
        return delay;
    }

    private updateNetworkStats(item: List<SocketAttributes>, activity: ActivityWait = 'network'): number {
        const now = this.now();
        const {
            socket,
            ioMeta: {
                networkBytes,
                time: { ts }
            }
        } = item!.value;
        item!.value.ioMeta.time.ts = now;
        networkBytes.bytesRead = socket!.bytesRead;
        networkBytes.bytesWritten = socket!.bytesWritten;
        const delay = this.updateActivityWaitTimes(activity, ts, now);
        return delay;
    }

    private updatePoolWaits(item: List<SocketAttributes>, start: number, stop: number, pool: Pool) {
        const delay = stop - start;
        const bin = this.reduceTimeToPoolBins[pool](delay);
        this.poolWaits[pool][bin] = (this.poolWaits[pool][bin] ?? 0) + 1;
        return delay;
    }

    private decorate(
        // opaque value for the io manager
        item: Exclude<List<SocketAttributes>, null>,
        otherOptions: SocketOtherOptions
    ) {
        const attributes = item.value;
        const socket = attributes.socket!;
        const id = attributes.ioMeta.id;
        // Writable
        const self = this;
        // finish event indicates that after this side "end()" pun the steam
        // and all pending data has been received by counterparty
        // at the very least it's "readyState" is marked as 'read-only'
        // only when a close event is emitted can we safely say there will be no more data transmitted over the socket
        // 1. end() -> writableEnded=true, writableFinished=false
        // 2. pending write data flushed -> writableFinished=true
        // by definition do not keep writing data after you have ended the stream yourself ofc
        // to only action to be taken here is log the time it took from the last network transmit (send) to when this event occurred
        socket.on('finish', () => {
            const pool = attributes.ioMeta.pool.current;
            this.updateNetworkStats(item, 'finish');
            trace('finish', id, pool);
        });
        if (otherOptions.timeout) {
            const timeOut = otherOptions.timeout;
            socket.setTimeout(timeOut);
            socket.on('timeout', () => {
                socket.setTimeout(timeOut);
                const pool = attributes.ioMeta.pool.current;
                trace('timeout', id, pool);
                if (pool === 'idle') {
                    // idling sockets are idle so ofc they will get timeouts
                    attributes.ioMeta.idleCounts = 0;
                    return;
                }
                attributes.ioMeta.idleCounts++;
                this.activityEvents.idle++;
                const rc =
                    pool === 'created'
                        ? this.initializer?.handleTimeout(attributes)
                        : this.protocolManager?.handleTimeout(attributes);
                if (rc === false) {
                    this.migrateToPool(item, 'terminal');
                    attributes.socket!.end();
                }
            });
        }
        socket.on('end', () => {
            const pool = attributes.ioMeta.pool.current;
            trace('end', id, pool);
            this.updateNetworkStats(item, 'end');
            if (socket.writableEnded) {
                // was intentional on our side
                this.migrateToPool(item, 'terminal');
                return;
            }
            if (pool === 'created') {
                this.initializer?.handleEnd(item.value);
            } else {
                this.protocolManager?.handleEnd(item.value);
            }
            this.migrateToPool(item, 'terminal');
            this.activityEvents.end++;
        });
        // todo: send notification
        socket.on('drain', () => {
            const pool = attributes.ioMeta.pool.current;
            trace('drain', id, pool);
            this.updateActivityWaitTimes('drained', this.now(), attributes.ioMeta.lastWriteTs);
            attributes.ioMeta.backPressure.resolve(undefined);
        });
        socket.on('data', async (buf: Uint8Array) => {
            const pool = attributes.ioMeta.pool.current;
            trace('data', id, buf, pool);
            item.value.socket = socket;
            const rc = await self.processData(buf, item);
            if (rc === false) {
                const srcPool = item.value.ioMeta.pool.current;
                this.migrateToPool(item, 'terminal');
                socket.end();
            } else if (rc === true) {
                return; // wait for more data to arrive
            }
        });
        //todo: should be in global statistics
        socket.on('error', (err: Error & NodeJS.ErrnoException) => {
            const pool = attributes.ioMeta.pool.current;
            const rc =
                pool === 'created'
                    ? this.initializer?.handleError(item.value, err)
                    : this.protocolManager?.handleError(item.value, err);
            this.activityEvents.error++;

            const error = err.syscall
                ? { syscall: err.syscall, name: err.name, code: err.code }
                : isAggregateError(err)
                ? Array.from(err.errors).map((err: Error) => ({ message: String(err) }))
                : undefined;
            trace('error', id, error || err, pool);

            if (rc === false) {
                /*
                    WritableEnded    closed      action
                    F                  F         end(), move to terminal
                    X                  T         move to terminal
                    T                  F         move to terminal
                */
                // upper layer want to terminate if connection is still open
                this.migrateToPool(item, 'terminal');
                const closed = socket.closed;
                const writableEnded = socket.writableEnded;
                if (!writableEnded && !closed) {
                    socket.end();
                }
            }
        });
        //
        socket.on('close', (hadError) => {
            const pool = attributes.ioMeta.pool.current;
            this.updateNetworkStats(item, 'close');
            trace('close', id, hadError, pool);
            if (pool === 'created') {
                this.initializer?.handleClose(item.value);
            } else {
                this.protocolManager?.handleClose(item.value);
            }
            this.migrateToPool(item, 'terminal');
            // todo: clean up socket, release resources, update global state
        });
        // there is no argument for "connect" callback
        // use "once" instead of "on", sometimes connect is re-emitted after the connect happens immediatly after a socket disconnect, its weird!
        // todo: observe this occurrance again, this could have been an issue with a tsl upgrade
        socket.once('connect', async () => {
            trace('connect', id);
            const t0 = attributes.ioMeta.time.ts;
            const t1 = self.markTime(item);
            self.updateActivityWaitTimes('connect', t0, t1);
            if (!this.initializer) {
                trace('connect', id, 'no-intializer');
                socket.destroy();
                this.migrateToPool(item, 'terminal');
                return;
            }
            const rc = await this.initializer.startupAfterConnect(attributes);
            const t2 = self.markTime(item);
            self.updateActivityWaitTimes('iom_code', t1, t2);
            if (rc === false) {
                trace('connect', id, 'initializer-fail');
                socket.end();
                this.migrateToPool(item, 'terminal');
                return;
            }
            trace('connect', id, 'ok');
        });
        // use "once" instead of "on", sometimes connect is re-emitted after the connect happens immediatly after a socket disconnect, its weird!
        // todo, validate this again
        // what is the order 'connect','lookup', 'ready' document please for linux and windows
        socket.once('ready', (...args: unknown[]) => {
            trace('ready', id, args);
        });
        //
        socket.on('lookup', (...args: unknown[]) => {
            trace('lookup', id, args);
        });
    }
    private async processData(buf: Uint8Array, item: Exclude<List<SocketAttributes>, null>): Promise<boolean> {
        this.updateNetworkStats(item);
        const {
            value: {
                ioMeta: {
                    id,
                    time: { ts: start },
                    pool: { current: pool }
                }
            }
        } = item;
        let rc: boolean | 'done' = false;
        if (pool === 'created') {
            rc = await this.initializer!.handleData(item, buf);
            if (rc === 'done') {
                const { current: srcPool, createdFor: targetPool } = item.value.ioMeta.pool;
                this.migrateToPool(item, targetPool);
                const stop = this.markTime(item);
                this.updateActivityWaitTimes('iom_code', start, stop);
                debug('processData', id, 'initializer-done');
                return true;
            }
            return rc;
        }
        if (this.protocolManager === null) {
            debug('err', id, 'absent-protocol-manager');
            return false;
        }
        rc = this.protocolManager.binDump(item.value, buf);
        const stop = this.markTime(item);
        this.updateActivityWaitTimes('iom_code', start, stop);
        return rc;
    }
    private normalizeExtraOptions(extraOpt?: SocketOtherOptions): SocketOtherOptions {
        const { timeout = 0 } = extraOpt ?? {};
        return {
            timeout
        };
    }
    private normalizeConnectOptions(
        conOpt: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts)
    ): (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts) | { errors: Error[] } {
        const errors: Error[] = [];
        if ((conOpt as IpcSocketConnectOpts & ConnectOpts).path) {
            return {
                path: (conOpt as IpcSocketConnectOpts & ConnectOpts).path
            };
        }
        const {
            port,
            host,
            localAddress,
            localPort,
            hints,
            family,
            lookup,
            noDelay,
            keepAlive,
            keepAliveInitialDelay,
            autoSelectFamily,
            autoSelectFamilyAttemptTimeout
        } = (conOpt || {}) as TcpSocketConnectOpts & ConnectOpts;
        // tcp connection
        if (!port) {
            errors.push(new Error(`no port or path specified in connect options, [${JSON.stringify(conOpt)}]`));
            return { errors };
        }
        return {
            port,
            ...(host && { host }),
            ...(localAddress && { localAddress }),
            ...(localPort && { localPort }),
            ...(hints && { hints }),
            ...(family && { family }),
            ...(noDelay && { noDelay }),
            ...(lookup && { lookup }),
            ...(keepAlive && { keepAlive }),
            ...(keepAliveInitialDelay && { keepAliveInitialDelay }),
            ...(autoSelectFamily && { autoSelectFamily }),
            ...(autoSelectFamilyAttemptTimeout && { autoSelectFamilyAttemptTimeout })
        };
    }

    public upgradeToSSL(item: Exclude<List<SocketAttributes>, null>) {
        const attr = item.value;
        const id = attr.ioMeta.id;
        // we already checked this during "init"
        const { createSSLConnection, conOpt } = this.getSLLSocketClassAndOptions(attr.ioMeta.pool.createdFor) as {
            createSSLConnection: CreateSLLConnection;
            conOpt: PGSSLConfig;
        };
        conOpt.socket = attr.socket!;
        attr.socket!.removeAllListeners();
        const { extraOpt } = this.getSocketClassAndOptions(attr.ioMeta.pool.createdFor) as {
            createConnection: CreateSocketConnection;
            conOpt: SocketConnectOpts;
            extraOpt: SocketOtherOptions;
        };
        const self = this;
        const sslSocket = createSSLConnection(conOpt); // this call takes 29ms
        attr.socket = sslSocket;
        const t0 = this.markTime(item);
        this.decorate(item, extraOpt);
        sslSocket.on('secureConnect', async () => {
            trace('secureConnect', id, sslSocket.authorized, sslSocket.authorizationError);
            const t1 = this.markTime(item);
            this.updateActivityWaitTimes('sslConnect', t0, t1);

            await this.initializer!.startupAfterSSLConnect(attr);

            const t2 = this.markTime(item);
            this.updateActivityWaitTimes('iom_code', t1, t2);
        });
        sslSocket.on('tlsClientError', (exception: Error) => {
            trace('tlsClientError', id, exception);
        });
        sslSocket.on('error', (error: Error) => {
            trace('errorssl', id, error);
        });
    }
    //
    public setProtocolManager(protocolManager: ProtocolManager): void {
        this.protocolManager = protocolManager;
    }

    public setInitializer(initializer: Initializer): void {
        this.initializer = initializer;
    }

    public getSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              createConnection: CreateSocketConnection;
              conOpt: SocketConnectOpts;
              extraOpt: SocketOtherOptions;
          }
        | { errors: Error[] } {
        const errors: Error[] = [];
        let createConnection: CreateSocketConnection | undefined;
        let conOpt: SocketConnectOpts | undefined;
        let extraOpt: SocketOtherOptions | undefined;
        //
        const createSocket = (cc: CreateSocketConnection) => {
            createConnection = cc;
        };
        const setAllOptions = (
            conOptions: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts),
            extraOptions?: SocketOtherOptions
        ): void => {
            conOpt = conOptions;
            extraOpt = extraOptions;
        };
        this.crfn({ forPool }, createSocket, setAllOptions);
        if (!createConnection) {
            errors.push(new Error('No "createConnection" set in callback'));
        }
        if (!conOpt) {
            errors.push(new Error('No connect options given'));
        }
        const r = this.normalizeConnectOptions(conOpt!);
        if ('errors' in r) {
            errors.push(...r.errors);
            return { errors }; // I have to put a "return" here otherwise typescript nags below
        }
        if (errors.length) {
            return { errors };
        }
        extraOpt = this.normalizeExtraOptions(extraOpt)!;
        return { createConnection: createConnection!, conOpt: r, extraOpt };
    }

    public getSLLSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              createSSLConnection: CreateSLLConnection;
              conOpt: PGSSLConfig;
          }
        | { errors: Error[] }
        | false {
        let createSSLConnection: CreateSLLConnection | undefined;
        let conOpt: PGSSLConfig | undefined;

        const createSocket = (cc: CreateSLLConnection) => {
            createSSLConnection = cc;
        };

        const setSSLOptions = (conOptions: PGSSLConfig): void => {
            conOpt = conOptions;
        };

        this.sslcrfn({ forPool }, createSocket, setSSLOptions);
        if (!conOpt) {
            return false;
        }
        if (!createSSLConnection) {
            // error if specifiy createSSLConnection function not set when requested
            return { errors: [new Error('SSL options specified, but createSSLConnection function not set')] };
        }
        const result = validatePGSSLConfig(conOpt);
        if (result === false) {
            // ssl configuration absent
            return false;
        } else if (result === true) {
            // ssl configuration exist
            return { createSSLConnection, conOpt };
        }
        return { errors: result.errors };
    }

    public send(attributes: SocketAttributes, bin: Uint8Array): SendingStatus {
        const socket = attributes.socket!;
        const id = attributes.ioMeta.id;
        if (socket.closed) {
            return SEND_STATUS_CLOSED; // this socket is closed
        }
        if (socket.writableEnded || socket.writableFinished) {
            return SEND_STATUS_ONLY_READ; // this socket not closed but not usefull for writing
        }
        if (socket.writableNeedDrain) {
            return SEND_STATUS_BACKPRESSURE; // return status for backpressure
        }
        const rc = socket.write(bin);
        // create promise for backPressure
        if (rc === false) {
            attributes.ioMeta.backPressure = createResolvePromiseExtended(rc);
            attributes.ioMeta.lastWriteTs = this.now();
        }
        debug('sending', id, bin);
        return rc === true ? SEND_STATUS_OK : SEND_STATUS_OK_WITH_BACKPRESSURE; // return OK status
    }

    public getActivityWaits(): ActivityWaitTimes {
        return {
            network: { ...this.activityWaits.network },
            iom_code: { ...this.activityWaits.iom_code },
            connect: { ...this.activityWaits.connect },
            sslConnect: { ...this.activityWaits.sslConnect },
            finish: { ...this.activityWaits.finish },
            end: { ...this.activityWaits.end },
            close: { ...this.activityWaits.close },
            drained: { ...this.activityWaits.drained }
        };
    }

    // this is very expensive since it has to scan a list to get a count
    public getPoolResidencies(): ResidencyCount {
        return {
            active: count(this.residencies.active),
            vis: count(this.residencies.vis),
            reservedPermanent: count(this.residencies.reservedPermanent),
            reservedEmpherical: count(this.residencies.reservedEmpherical),
            idle: count(this.residencies.idle),
            created: count(this.residencies.created),
            terminal: count(this.residencies.terminal)
        };
    }

    public getPoolWaitTimes(): PoolWaitTimes {
        return {
            active: Object.assign({}, this.poolWaits.active),
            vis: Object.assign({}, this.poolWaits.vis),
            reservedPermanent: Object.assign({}, this.poolWaits.reservedPermanent),
            reservedEmpherical: Object.assign({}, this.poolWaits.reservedEmpherical),
            idle: Object.assign({}, this.poolWaits.idle),
            terminal: Object.assign({}, this.poolWaits.terminal),
            created: Object.assign({}, this.poolWaits.created)
        };
    }
    // Socket creation and connection starts here
    // here only the socket is created and wired up, the actial connect sequence happens somewhere else
    public async createSocketForPool(forPool: PoolFirstResidence): Promise<void> {
        const r = this.getSocketClassAndOptions(forPool);
        if ('errors' in r) {
            return Promise.reject({ errors: r.errors });
        }
        const { createConnection, conOpt, extraOpt } = r;
        const self = this;
        const placementTime = this.now();
        const jitter = this.jitter.getRandom();

        // wait daily ms
        await delay(jitter);

        // action network connection is made
        const socket = createConnection(conOpt);

        const attributes: SocketAttributes = {
            socket,
            ioMeta: {
                id: this.socketId++,
                jitter,
                pool: {
                    placementTime,
                    createdFor: forPool,
                    lastChecked: placementTime,
                    current: 'created'
                },
                time: {
                    ts: placementTime
                },
                networkBytes: {
                    bytesRead: 0,
                    bytesWritten: 0
                },
                backPressure: createResolvePromiseExtended(true), // resolved promise
                lastWriteTs: 0,
                idleCounts: 0,
                aux: null
            }
        };
        const item: List<SocketAttributes> = { value: attributes };
        this.decorate(item, extraOpt);
        this.residencies.created = insertBefore(this.residencies.created, item);
    }
}
