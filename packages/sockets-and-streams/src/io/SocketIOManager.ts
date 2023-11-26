import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket } from 'net';
import dump from 'buffer-hexdump';

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
    SendingStatus
} from './types';

import ProtocolManager from '../protocol/ProtocolManager';

import { isAggregateError, validatePGSSLConfig } from './helpers';
import delay from '../utils/delay';
import { insertAfter, insertBefore, remove } from '../utils/list';

import type { List } from '../utils/list';
import Initializer from '../initializer/Initializer';
import { SEND_NOT_OK, SEND_STATUS_BACKPRESSURE, SEND_STATUS_OK } from './constants';

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

export class SocketIOManager<T = any> implements ISocketIOManager<T> {
    // pools
    // pools
    // pools

    // [v]ery [i]mportant [s]ocket
    private vis: List<SocketAttributes<T>>;
    // sockets reserved by the user and not a pooled in a pool
    private reservedPermanent: List<SocketAttributes<T>>;
    // sockets taken out of the pool just for execution of one query/task
    private reservedEmpherical: List<SocketAttributes<T>>;
    // sockets that have not been used for some time
    private idle: List<SocketAttributes<T>>;
    // connections of these sockets are planned for gracefull shutdown
    private terminal: List<SocketAttributes<T>>;
    // sockets created and connected
    private created: List<SocketAttributes<T>>;

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
        private readonly reduceTimeToActivityBins: ActivityTimeBins
    ) {
        this.vis = null;
        this.reservedPermanent = null;
        this.reservedEmpherical = null;
        this.idle = null;
        this.created = null;
        this.terminal = null;

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
            console.log('/finish'); // writable surely ended when finish is emitted
            console.log('readableEnded', socket.readableEnded);
            console.log('writableEnded', socket.writableEnded);
            console.log('writableFinished', socket.writableFinished);
        });
        // Readable
        // when pause is called (wait for 'pause' to be omitted)
        socket.on('resume', () => {
            console.log('/resume');
        });
        // Readable
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
                    console.log('should migrate socket to idle queue');
                }
            });
        }
        // Socket, other side signalled an end of transmission
        socket.on('end', () => {
            console.log('/event/end');
            console.log('/event/end/endreadableEnded', socket.readableEnded); // start teardown
            console.log('/event/end/writableEnded', socket.writableEnded); // flush buffers
            console.log('/event/end/writableFinished', socket.writableFinished);
        });
        // manage backpressure, it is managed eventually by the underlying tcp/ip protocol itself
        // drain = resume from backpressure(d)
        socket.on('drain', () => {
            console.log('/event/drain');
        });
        socket.on('data', (buf: Uint8Array) => {
            console.log('/event/data received: %s', buf.byteLength);
            console.log(dump(buf));
            item.value.socket = socket;
            if (self.processData(buf, item) === false) {
                socket.end();
                remove(item);
            }
        });
        //
        socket.on('error', (err: Error & NodeJS.ErrnoException) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            if (err.syscall) {
                console.log('/error occurred [%o]:', { syscall: err.syscall, name: err.name, code: err.code });
                return;
            }
            if (isAggregateError(err)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const prunedErrors = Array.from(err.errors).map((err: Error) => ({
                    message: String(err)
                }));
                console.log('/error occurred [%o]:', prunedErrors);
            }
        });
        //
        socket.on('close', (hadError) => {
            console.log('/close: hadError: [%s]', hadError);
        });
        // there is no argument for "connect" callback
        // use "once" instead of "on", sometimes connect is re-emitted after the connect happens immediatly after a socket disconnect, its weird!
        socket.once('connect', () => {
            console.log('/event/connect');
            const t0 = attributes.ioMeta.time.ts;
            const t1 = self.markTime(item);
            self.updateActivityWaitTimes('connect', t0, t1);
            if (!this.initializer) {
                // todo: log errors
                // todo: close socket
                console.log('iomanager has no initializer');
                socket.end();
                remove(item);
                return;
            }
            // note: startup will be resonsible to callaback to socketIoManager to terminate connection on error
            const rc = this.initializer.startupAfterConnect(attributes);
            const t2 = self.markTime(item);
            self.updateActivityWaitTimes('iom_code', t1, t2);
            // todo, trace or debug
            if (rc === false) {
                // just close socket, remove from pool, errors msg already handled
                console.log('initializer.startup failed');
                socket.end();
                remove(item);
                return;
            }
            console.log('/event/connect time=[%o]', self.activityWaits);
        });
        // use "once" instead of "on", sometimes connect is re-emitted after the connect happens immediatly after a socket disconnect, its weird!
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
        let rc = false;
        if (item.value.ioMeta.pool.current === 'created') {
            if (this.initializer === null) {
                // todo: log errors
                // todo: close socket
                return false;
            }
            rc = this.initializer.handleData(item, buf);
        } else {
            if (this.protocolManager === null) {
                // todo: log errors
                // todo: close socket
                return false;
            }
            rc = this.protocolManager.binDump(item, buf);
        }
        const stop = this.markTime(item);
        this.updateActivityWaitTimes('iom_code', start, stop);
        // todo: remove this after we have some debug/trace logging
        console.log('after data received and processes:[%o]', this.activityWaits);
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
            console.error('/tlsClientError', exception);
        });
        sslSocket.on('error', (error: Error) => {
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

    public send<T>(attributes: SocketAttributes<T>, bin: Uint8Array): SendingStatus {
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
        console.log('sending:', dump(bin));
        return SEND_STATUS_OK; // todo: return OK status
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
        this.created = insertBefore(this.created, item);
    }
}
