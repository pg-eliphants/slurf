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
    Activity,
    SendingStatus,
    Residency,
    ResidencyCount,
    Pool
} from './types';

import ProtocolManager from '../protocol/ProtocolManager';

import { isAggregateError, validatePGSSLConfig } from './helpers';
import delay from '../utils/delay';
import { insertBefore, removeSelf, count } from '../utils/list';

import type { List } from '../utils/list';
import Initializer from '../initializer/Initializer';
import { SEND_NOT_OK, SEND_STATUS_BACKPRESSURE, SEND_STATUS_OK } from './constants';
import {
    ERR_IOMAN_NO_INTIALIZER,
    NFY_IOMAN_INITIAL_DONE,
    ERR_IOMAN_INTIALIZE_FAIL,
    NFY_IOMAN_SOCKET_CONNECT_EVENT_HANDLED,
    ERR_IOMAN_NO_PROTOCOL_HANDLER
} from './errors';
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

    // reference to protocol manager
    private protocolManager: ProtocolManager | null;

    private initializer: Initializer | null;

    constructor(
        private readonly crfn: CreateSocketSpec,
        private readonly sslcrfn: CreateSSLSocketSpec,
        private readonly jitter: Jitter,
        private readonly now: () => number,
        private readonly reduceTimeToPoolBins: PoolTimeBins,
        private readonly reduceTimeToActivityBins: ActivityTimeBins // how are we going to do this?
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
            sslConnect: {}
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

    private updateActivityWaitTimes(activity: Activity, start: number, stop: number) {
        const delay = stop - start;
        const bin = this.reduceTimeToActivityBins[activity](delay);
        this.activityWaits[activity][bin] = (this.activityWaits[activity][bin] ?? 0) + 1;
        return delay;
    }

    private updateNetworkStats(item: List<SocketAttributes>): number {
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
        const delay = this.updateActivityWaitTimes('network', ts, now);
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
        // Writable
        const self = this;
        socket.on('finish', () => {
            // todo: should already be in terminal
            console.log('/finish'); // writable surely ended when finish is emitted
            console.log('readableEnded', socket.readableEnded);
            console.log('writableEnded', socket.writableEnded);
            console.log('writableFinished', socket.writableFinished);
        });
        // Readable
        // when pause is called (wait for 'pause' to be omitted)
        // todo: get this documented
        socket.on('resume', () => {
            console.log('/resume');
        });
        // Readable
        // todo: do we need this?
        socket.on('pause', () => {
            console.log('/pause');
        });

        if (otherOptions.timeout) {
            const timeOut = otherOptions.timeout;
            socket.setTimeout(timeOut);
            socket.on('timeout', () => {
                socket.setTimeout(timeOut);
                const {
                    networkBytes: { bytesRead, bytesWritten },
                    time: { ts }
                } = attributes.ioMeta;
                const current = this.now();
                const delay = current - ts;
                console.log('/timout delay:%s', delay);
                if (delay > 12e3) {
                    // migrate socket to idle queue
                    // todo: migrate to idel queue depending it is not actively involved in a query or notification channel
                    console.log('should migrate socket to idle queue');
                }
            });
        }
        // Socket, other side signalled an end of transmission
        socket.on('end', () => {
            // todo, put socket in termainal queue
            console.log('/event/end');
            console.log('/event/end/endreadableEnded', socket.readableEnded); // start teardown
            console.log('/event/end/writableEnded', socket.writableEnded); // flush buffers
            console.log('/event/end/writableFinished', socket.writableFinished);
        });
        // todo: manage backpressure, it is managed eventually by the underlying tcp/ip protocol itself
        // drain = resume from backpressure(d)
        socket.on('drain', () => {
            console.log('/event/drain');
        });
        socket.on('data', (buf: Uint8Array) => {
            // todo: send as notification
            console.log('/event/data received: %s', buf.byteLength);
            console.log(dump(buf));
            item.value.socket = socket;
            const rc = self.processData(buf, item);
            if (rc === false) {
                const srcPool = item.value.ioMeta.pool.current;
                this.migrateToPool(item, 'terminal');
                socket.end();
            } else if (rc === true) {
                return; // wait for more data to arrive
            }
        });
        //
        socket.on('error', (err: Error & NodeJS.ErrnoException) => {
            // todo: mark socket for termination
            // todo: if it is not already in terminal pool put it there
            if (err.syscall) {
                // todo: log error
                console.log('/error occurred [%o]:', { syscall: err.syscall, name: err.name, code: err.code });
                return;
            }
            if (isAggregateError(err)) {
                const prunedErrors = Array.from(err.errors).map((err: Error) => ({
                    message: String(err)
                }));
                // todo: log error
                console.log('/error occurred [%o]:', prunedErrors);
            }
        });
        //
        socket.on('close', (hadError) => {
            // todo: mark socket for termination
            // todo: if it is not already in terminal pool put it there
            // todo: log event
            console.log('/close: hadError: [%s]', hadError);
        });
        // there is no argument for "connect" callback
        // use "once" instead of "on", sometimes connect is re-emitted after the connect happens immediatly after a socket disconnect, its weird!
        // todo: observe this occurrance again, this could have been an issue with a tsl upgrade
        socket.once('connect', () => {
            console.log('/event/connect');
            const t0 = attributes.ioMeta.time.ts;
            const t1 = self.markTime(item);
            self.updateActivityWaitTimes('connect', t0, t1);
            if (!this.initializer) {
                // todo; replace with bound logger
                // logger(ERR_IOMAN_NO_INTIALIZER, 'connect');
                socket.end();
                this.migrateToPool(item, 'terminal');
                return;
            }
            // note: startup will be responsible to callback to socketIoManager to terminate connection on error
            const rc = this.initializer.startupAfterConnect(attributes);
            const t2 = self.markTime(item);
            self.updateActivityWaitTimes('iom_code', t1, t2);
            if (rc === false) {
                // todo; replace with bound logger
                // logger(ERR_IOMAN_INTIALIZE_FAIL);
                socket.end();
                this.migrateToPool(item, 'terminal');
                return;
            }
            // todo; replace with bound logger
            // logger(NFY_IOMAN_SOCKET_CONNECT_EVENT_HANDLED);
        });
        // use "once" instead of "on", sometimes connect is re-emitted after the connect happens immediatly after a socket disconnect, its weird!
        // todo, validate this again
        // what is the order 'connect','lookup', 'ready' document please for linux and windows
        socket.once('ready', (...args: unknown[]) => {
            console.log('/ready: [%o]', args);
        });
        //
        socket.on('lookup', (...args: unknown[]) => {
            console.log('/lookup: [%o]', args);
        });
    }
    private processData(buf: Uint8Array, item: Exclude<List<SocketAttributes>, null>): boolean {
        this.updateNetworkStats(item);
        const start = item!.value.ioMeta.time.ts;
        let rc: boolean | 'done' = false;
        if (item.value.ioMeta.pool.current === 'created') {
            if (this.initializer === null) {
                // todo: logger(ERR_IOMAN_NO_INTIALIZER, 'data');
                return false;
            }
            rc = this.initializer.handleData(item, buf);
            if (rc === 'done') {
                const { current: srcPool, createdFor: targetPool } = item.value.ioMeta.pool;
                this.migrateToPool(item, targetPool);
                // todo: logger(NFY_IOMAN_INITIAL_DONE);
                return true;
            }
            return rc;
        } else {
            if (this.protocolManager === null) {
                // todo: logger(ERR_IOMAN_NO_PROTOCOL_HANDLER);
                return false;
            }
            rc = this.protocolManager.binDump(item, buf);
        }
        // other pools and states
        const stop = this.markTime(item);
        this.updateActivityWaitTimes('iom_code', start, stop);
        // todo: log this as trace info
        console.log('after data received and processes, activityWaits:[%o]', this.activityWaits);
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
        sslSocket.on('secureConnect', () => {
            // todo log this in "notification"
            console.log('/secureConnect authorized', sslSocket.authorized);
            console.log('/secureConnect authorizationError', sslSocket.authorizationError);
            // for debugging
            // const certificate = sslSocket.getPeerCertificate();
            // console.log('/cerficate', certificate);
            //
            const t1 = this.markTime(item);
            this.updateActivityWaitTimes('sslConnect', t0, t1);

            this.initializer!.startupAfterSSLConnect(attr);

            const t2 = this.markTime(item);
            this.updateActivityWaitTimes('iom_code', t1, t2);
        });
        sslSocket.on('tlsClientError', (exception: Error) => {
            // todo should we terminate the socket?
            console.error('/tlsClientError', exception);
        });
        sslSocket.on('error', (error: Error) => {
            // todo:  // todo should we terminate the socket?
            console.error('/ssl/error:', String(error));
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
        if (socket.closed) {
            return SEND_NOT_OK; // todo: this socket is closed
        }
        if (socket.writableEnded || socket.writableFinished) {
            return SEND_NOT_OK; // todo: this socket not closed but not usefull for writing
        }
        if (socket.writableNeedDrain) {
            return SEND_STATUS_BACKPRESSURE; // todo: return status for backpressure
        }
        socket.write(bin);
        // todo: send this as notification
        console.log('sending:', dump(bin));
        return SEND_STATUS_OK; // todo: return OK status
    }

    public getActivityWaits(): ActivityWaitTimes {
        return {
            network: Object.assign({}, this.activityWaits.network),
            iom_code: Object.assign({}, this.activityWaits.iom_code),
            connect: Object.assign({}, this.activityWaits.connect),
            sslConnect: Object.assign({}, this.activityWaits.sslConnect)
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
                aux: null
            }
        };
        const item: List<SocketAttributes> = { value: attributes };
        this.decorate(item, extraOpt);
        this.residencies.created = insertBefore(this.residencies.created, item);
    }
}
