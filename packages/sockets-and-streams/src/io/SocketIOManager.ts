import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket } from 'net';
import dump from 'buffer-hexdump';

import type { Jitter } from './Jitter';
import type {
    Pool,
    CreateSocketBuffer,
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
    CreateSLLConnection
} from './types';

import ProtocolManager from '../protocol/ProtocolManager';

import { isAggregateError, validatePGSSLConfig } from './helpers';
import delay from '../utils/delay';
import { insertAfter, insertBefore, remove } from '../utils/list';

import type { List } from '../utils/list';

export default class SocketIOManager {
    // this socket pools are sorted on resident times
    private vis: List<SocketAttributes>;
    private reservedPermanent: List<SocketAttributes>;
    private reservedEmpherical: List<SocketAttributes>;
    private idle: List<SocketAttributes>;
    private terminal: List<SocketAttributes>;
    private created: List<SocketAttributes>;
    private poolWaits: PoolWaitTimes;
    private activityWaits: ActivityWaitTimes;
    private jittered: Map<NodeJS.Timeout, Socket>;
    private protocolManager: ProtocolManager | null;

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
            iom_code: {}
        };
        this.jittered = new Map();
        this.protocolManager = null;
    }

    private updateProcessStats(start: number, stop: number) {
        const delay = stop - start;
        const bin = this.reduceTimeToActivityBins.iom_code(delay);
        this.activityWaits.iom_code[bin] = (this.activityWaits.iom_code[bin] ?? 0) + 1;
        return delay;
    }

    private updateNetworkStats(item: List<SocketAttributes>): number {
        // deconstruct
        const {
            socket,
            ioMeta: { networkBytes }
        } = item!.value;
        const { ts, bytesRead, bytesWritten } = networkBytes;
        const now = this.now();
        const delay = now - ts;
        networkBytes.bytesRead = socket!.bytesRead;
        networkBytes.bytesWritten = socket!.bytesWritten;
        networkBytes.ts = now;
        const bin = this.reduceTimeToActivityBins.network(delay);
        this.activityWaits.network[bin] = (this.activityWaits.network[bin] ?? 0) + 1;
        return delay;
    }

    private decorate(item: Exclude<List<SocketAttributes>, null>, otherOptions: SocketOtherOptions) {
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
                const { ts, bytesRead, bytesWritten } = attributes.ioMeta.networkBytes;
                const current = this.now();
                const delay = current - ts;
                console.log('/timout delay:%s', delay);
                if (delay > 12e3) {
                    // migrate socket to idle queue
                    console.log('migrate socket to idle queue');
                }
            });
        }
        // Socket, other side signalled an end of transmission
        socket.on('end', () => {
            console.log('/end');
            console.log('readableEnded', socket.readableEnded); // start teardown
            console.log('writableEnded', socket.writableEnded); // flush buffers
            console.log('writableFinished', socket.writableFinished);
        });
        // manage backpressure, it is managed eventually by the underlying tcp/ip protocol itself
        // drain = resume from backpressure(d)
        socket.on('drain', () => {
            console.log('/drain');
        });
        socket.on('data', (buf: Uint8Array) => {
            console.log('data received: %s', buf.byteLength);
            self.processData(buf, buf.byteLength, item);
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
            console.log('/connect received, readyState=[%s], connecting=[%s]', socket.readyState, socket.connecting);
            this.init(attributes);
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
    private processData(buf: Uint8Array, byteLength: number, item: List<SocketAttributes>): boolean {
        if (!item) {
            console.error('big bad error: "item" was null');
            // TODO: log this as an internal consistency error
            return false;
        }
        const networkDelay = this.updateNetworkStats(item);
        const s0 = this.now();
        const s1 = this.now();
        const processTime = this.updateProcessStats(s0, s1);

        console.log(
            'network transit:[%s ms], [%s]: bytes in buffer, [%s] total bytes received, processTime:[%s ms], networkTimes: [%o], processTimes:[%o]',
            networkDelay,
            buf.byteLength,
            item.value.ioMeta.networkBytes.bytesRead,
            processTime,
            this.activityWaits.network,
            this.activityWaits.iom_code
        );
        if (!this.protocolManager) {
            return true;
        }
        return this.protocolManager.binDump(item, buf, byteLength);
    }
    private normalizeExtraOptions(extraOpt?: SocketOtherOptions): SocketOtherOptions {
        const { timeout = 0 } = extraOpt ?? {};
        return {
            timeout
        };
    }
    private normalizeConnectOptions(
        conOpt: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts)
    ): (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts) {
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
            throw new Error(`no port or path specified in connect options, ${JSON.stringify(conOpt)}]`);
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
    //
    private getSocketClassAndOptions(forPool: PoolFirstResidence): {
        createConnection: CreateSocketConnection;
        conOpt: SocketConnectOpts;
        extraOpt: SocketOtherOptions;
    } {
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
            throw new Error('No "createConnection" set in callback');
        }
        if (!conOpt) {
            throw new Error(`No connect options given`);
        }
        conOpt = this.normalizeConnectOptions(conOpt);
        extraOpt = this.normalizeExtraOptions(extraOpt)!;
        return { createConnection, conOpt, extraOpt };
    }

    /*private requestSSLConnectionParams(): { errors?: Error[]; config?: PGSSLConfig } {
        let config: PGSSLConfig | undefined;
        const setSSLConfig: SetSSLConfig = ($config: PGSSLConfig) => {
            config = $config;
        };
        this.getSSLConfig(setSSLConfig);
        const result = validatePGSSLConfig(config);
        if (result === false) {
            return {}; // no error, no config
        }
        if (result === true) {
            return { config: config! };
        }
        return { errors: result.errors };
    }*/

    private getSLLSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              createConnection: CreateSLLConnection;
              conOpt: PGSSLConfig;
          }
        | { errors: Error[] }
        | false {
        let createConnection: CreateSLLConnection | undefined;
        let conOpt: PGSSLConfig | undefined;

        const createSocket = (cc: CreateSLLConnection) => {
            createConnection = cc;
        };

        const setSSLOptions = (conOptions: PGSSLConfig): void => {
            conOpt = conOptions;
        };

        this.sslcrfn({ forPool }, createSocket, setSSLOptions);
        if (createConnection && conOpt) {
            const result = validatePGSSLConfig(conOpt);
            if (result === false) {
                // todo: warning, not error, you gave a  createSSLSocket but no sockopts
                return false;
            } else if (result === true) {
                // todo: log this as a warning!!
                return { createConnection, conOpt };
            }
            // todo log errors
            result.errors;
            return { errors: result.errors };
        } else if (!createConnection && conOpt) {
            // error if specifiy createSSLConnection function not set when requested
            return { errors: [new Error('SSL options specified, but createSSLConnection function not set')] };
        }
        // createConnection && !conOpt -> false
        // !createConnection && !conOpt -> false
        return false;
    }

    private init(item: SocketAttributes): void {
        const r = this.getSLLSocketClassAndOptions(item.ioMeta.pool.createdFor);
        if (r === false) {
            // use normal startup connection, ssl not specified
            if (this.protocolManager) {
                this.protocolManager.protocalWrap(item);
                this.protocolManager.startupMsg(item);
            }
        } else if ('errors' in r) {
            // we want to use ssl but misconfigured,
            // log error
            // stop!  end the socket
            // remove from pool
        } else {
            if (this.protocolManager) {
                this.protocolManager.protocalWrap(item);
                this.protocolManager.startSSL(item);
            }
        }
    }

    //
    public setProtocolManager(protocolMngr: ProtocolManager): void {
        this.protocolManager = protocolMngr;
    }

    public send(attributes: SocketAttributes, bin: Uint8Array): unknown {
        const socket = attributes.socket!;
        if (socket.closed) {
            return; // todo: this socket is closed
        }
        if (socket.writableEnded || socket.writableFinished) {
            return; // todo: this socket not closed but not usefull for writing
        }
        if (socket.writableNeedDrain) {
            return; // todo: return status for backpressure
        }
        socket.write(bin);
        console.log(dump(bin));
        return; // todo: return OK status
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
        const { createConnection, conOpt, extraOpt } = this.getSocketClassAndOptions(forPool);
        const self = this;
        const placementTime = this.now();
        const jitter = this.jitter.getRandom();

        // wait daily ms
        await delay(jitter);

        const socket = createConnection(conOpt);

        //
        const attributes: SocketAttributes = {
            socket,
            ioMeta: {
                jitter,
                pool: {
                    placementTime,
                    createdFor: forPool,
                    lastChecked: placementTime,
                    pool: 'created'
                },
                networkBytes: {
                    ts: placementTime,
                    bytesRead: 0,
                    bytesWritten: 0
                }
            }
        };
        const item: List<SocketAttributes> = { value: attributes };
        this.decorate(item, extraOpt);
        this.created = insertBefore(this.created, item);
    }

    public upgradeToSSL(item: Exclude<List<SocketAttributes>, null>) {
        const attr = item.value;
        // we already checked this during "init"
        const r = this.getSLLSocketClassAndOptions(attr.ioMeta.pool.createdFor);
        if (r === false) {
            // todo: error, not possible, 1st time ok, but 2nd time no?
            return;
        } else if ('errors' in r) {
            // todo: error, not possible, 1st time ok, but 2nd time no?
            return;
        } else {
            r.conOpt.socket = attr.socket!;
            //r.conOpt.minVersion = 'TLSv1.3';
            //r.conOpt.maxVersion = 'TLSv1.3';
            attr.socket!.removeAllListeners();
            const { extraOpt } = this.getSocketClassAndOptions(attr.ioMeta.pool.createdFor);
            const self = this;
            const sslSocket = r.createConnection(r.conOpt);
            attr.socket = sslSocket;
            this.decorate(item, extraOpt);
            sslSocket.on('secureConnect', () => {
                console.log('/secureConnect authorized', sslSocket.authorized);
                console.log('/secureConnect authorizationError', sslSocket.authorizationError);
                // for debugging
                // const certificate = sslSocket.getPeerCertificate();
                // console.log('/cerficate', certificate);
                //
                this.protocolManager!.startupMsg(attr);
            });
            sslSocket.on('tlsClientError', (exception: Error) => {
                console.log('/tlsClientError', exception);
            });
            sslSocket.on('error', (error: Error) => {
                console.log('/ssl/error:', String(error));
            });
            // sslSocket.on('session', (session: Uint8Array) => {
            //     console.log('ssl/session', session.slice(0, 10));
            // });
            // sslSocket.on('keylog', (line: Uint8Array) => {
            //     console.log('ssl/keylog', line.slice(0, 10));
            // });
        }
    }
}
