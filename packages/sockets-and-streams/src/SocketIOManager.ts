import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket, SocketConstructorOpts } from 'net';
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
    ActivityTimeBins
} from './types';

import { isAggregateError } from './helpers';

import { insertAfter, insertBefore, remove } from './list';

import type { List } from './list';

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

    constructor(
        private readonly crfn: CreateSocketSpec,
        private readonly jitter: Jitter,
        private readonly createBuffer: CreateSocketBuffer,
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
    }

    private updateProcessStats(start: number, stop: number) {
        const delay = stop - start;
        const bin = this.reduceTimeToActivityBins.iom_code(delay);
        this.activityWaits.iom_code[bin] = (this.activityWaits.iom_code[bin] ?? 0) + 1;
        return delay;
    }

    private updateNetworkStats(item: List<SocketAttributes>): number {
        const {
            socket,
            meta: { networkBytes }
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
    // this.decorate(_sock, jitter, forPool, conOpt);
    private decorate(socket: Socket, attributes: SocketAttributes, otherOptions: SocketOtherOptions) {
        // Writable
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
                const { ts, bytesRead, bytesWritten } = attributes.meta.networkBytes;
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
        socket.on('data', (buffer) => {
            console.log('data received: %s', buffer.byteLength);
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
    private processData(buf: DataView, item: List<SocketAttributes>): boolean {
        if (!item) {
            console.error('big bad error: "item" was null');
            // TODO: log this as an internal consistency error
            return false;
        }
        const networkDelay = this.updateNetworkStats(item);
        const s0 = this.now();
        for (let i = 0; i < 1e9; i++) {}
        const s1 = this.now();
        const processTime = this.updateProcessStats(s0, s1);

        console.log(
            'network transit:[%s ms], [%s]: bytes in buffer, [%s] total bytes received, processTime:[%s ms], networkTimes: [%o], processTimes:[%o]',
            networkDelay,
            buf.byteLength,
            item.value.meta.networkBytes.bytesRead,
            processTime,
            this.activityWaits.network,
            this.activityWaits.iom_code
        );
        return true;
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

    //
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

    // here only the socket is created and wired up, the actial connect sequence happens somewhere else
    public createSocketForPool(forPool: PoolFirstResidence): void {
        const { createConnection, conOpt, extraOpt } = this.getSocketClassAndOptions(forPool);
        const self = this;
        const socket = createConnection({
            ...conOpt,
            onread: {
                buffer: this.createBuffer,
                callback(bytesWritten: number, buf: Uint8Array): boolean {
                    // self = is socketIoManager, keep it simple no complex stuff here
                    return self.processData(new DataView(buf.buffer, 0, bytesWritten), item);
                }
            }
        });

        const placementTime = this.now();
        const jitter = this.jitter.getRandom();
        //
        const attributes: SocketAttributes = {
            socket,
            meta: {
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
        //
        this.decorate(socket, attributes, extraOpt);
        const item: List<SocketAttributes> = { next: null, prev: null, value: attributes };
        this.created = insertBefore(this.created, item); //
        // generate 32 bit cryptographic random number
        // _sock._id = <primary_key>
        // todo:
        const timeoutId = setTimeout(
            (self: SocketIOManager) => {
                if (self.jittered.delete(timeoutId)) {
                    socket.connect(conOpt);
                }
            },
            jitter,
            this
        );
        this.jittered.set(timeoutId, socket);
    }
}
