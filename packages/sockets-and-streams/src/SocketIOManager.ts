import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket } from 'net';
import type { Jitter } from './Jitter';
import type {
    Pool,
    CreateSocketBuffer,
    CreateSocketSpec,
    SocketAttributes,
    SocketOtherOptions,
    SocketConnectOpts,
    PoolExActive
} from './types';

import { isAggregateError } from './helpers';

import { insertAfter, insertBefore, remove } from './list';

import type { List } from './list';

type HistogramResidentTimes = {
    [time: number]: number;
};

type PoolWaitTimes = {
    vis: HistogramResidentTimes;
    reservedPermanent: HistogramResidentTimes;
    reservedEmpherical: HistogramResidentTimes;
    idle: HistogramResidentTimes;
    terminal: HistogramResidentTimes;
};

export default class SocketIOManager {
    // this socket pools are sorted on resident times
    private vis: List<SocketAttributes>;
    private reservedPermanent: List<SocketAttributes>;
    private reservedEmpherical: List<SocketAttributes>;
    private idle: List<SocketAttributes>;
    private terminal: List<SocketAttributes>;
    private created: List<SocketAttributes>;
    private waits: PoolWaitTimes;
    private jittered: Map<NodeJS.Timeout, Socket>;

    // private functions
    // this.decorate(_sock, jitter, forPool, conOpt);
    private decorate(socket: Socket, attributes: SocketAttributes, otherOptions: SocketOtherOptions) {
        const self = this;
        let totalIdleTimes = 0;
        socket.setTimeout(otherOptions.timeout);
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
        let nrBytesRead = socket.bytesRead;
        let nrBytesWritten = socket.bytesWritten;
        let cntTO = 0;
        const timeOut = otherOptions.timeout;
        //Misc
        socket.on('timeout', () => {
            if (nrBytesRead === socket.bytesRead && nrBytesWritten === socket.bytesWritten) {
                cntTO++;
            } else {
                const timeBin = Math.trunc((timeOut * cntTO) / 1e3); // 1 sec bins
                this.waits.idle[timeBin] = (this.waits.idle[timeBin] ?? 0) + 1;
                cntTO = 0;
            }
            nrBytesRead = socket.bytesRead;
            nrBytesWritten = socket.bytesWritten;
            socket.setTimeout(otherOptions.timeout);
        });
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
        /*socket.on('data', (buffer) => {
            console.log('data received: %s', buffer.byteLength);
        });*/
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
        socket.on('connect', () => {
            console.log('/connect received');
        });
        //
        socket.on('ready', (...args: unknown[]) => {
            console.log('/ready: [%o]', args);
        });
        //
        socket.on('lookup', (...args: unknown[]) => {
            console.log('/lookup: [%o]', args);
        });
        // todo: maybe return an object to query stats and for poolmigration
    }
    private processData(bytesWritten: number, buf: Uint8Array): boolean {
        console.log(bytesWritten, buf.length);
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
        // callback on the "onread" will be bound to global, nothing we can do about that, this is nodejs behavior
        // therefor we make a copy of this(=SocketIOManager) to self,
        const self = this;
        // unix domain socket?
        if ((conOpt as IpcSocketConnectOpts & ConnectOpts).path) {
            return {
                path: (conOpt as IpcSocketConnectOpts & ConnectOpts).path,
                onread: {
                    buffer: this.createBuffer(),
                    callback(bytesWritten: number, buf: Uint8Array): boolean {
                        // self = is socketIoManager
                        return self.processData(bytesWritten, buf);
                    }
                }
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
            ...(autoSelectFamilyAttemptTimeout && { autoSelectFamilyAttemptTimeout }),
            onread: {
                buffer: this.createBuffer,
                callback(bytesWritten: number, buf: Uint8Array): boolean {
                    // self = is socketIoManager
                    return self.processData(bytesWritten, buf);
                }
            }
        };
    }
    //
    private getSocketClassAndOptions(forPool: PoolExActive): {
        SocketClass: typeof Socket;
        conOpt: SocketConnectOpts;
        extraOpt: SocketOtherOptions;
    } {
        let SocketClass: typeof Socket | undefined;
        let conOpt: SocketConnectOpts | undefined;
        let extraOpt: SocketOtherOptions | undefined;
        //
        const createSocket = (socket: typeof Socket) => {
            SocketClass = socket;
        };
        const setAllOptions = (
            conOptions: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts),
            extraOptions?: SocketOtherOptions
        ): void => {
            conOpt = conOptions;
            extraOpt = extraOptions;
        };
        this.crfn({ forPool }, createSocket, setAllOptions);
        if (!SocketClass) {
            throw new Error('No socket class set in callback');
        }
        if (!conOpt) {
            throw new Error(`No connect options given`);
        }
        conOpt = this.normalizeConnectOptions(conOpt);
        extraOpt = this.normalizeExtraOptions(extraOpt)!;
        return { SocketClass, conOpt, extraOpt };
    }
    constructor(
        private readonly crfn: CreateSocketSpec,
        private readonly jitter: Jitter,
        private readonly createBuffer: CreateSocketBuffer,
        private readonly now: () => number
    ) {
        this.vis = null;
        this.reservedPermanent = null;
        this.reservedEmpherical = null;
        this.idle = null;
        this.created = null;
        this.terminal = null;
        this.waits = {
            vis: {},
            reservedPermanent: {},
            reservedEmpherical: {},
            idle: {},
            terminal: {}
        };
        this.jittered = new Map();
    }
    //
    public getPoolWaitTimes(): PoolWaitTimes {
        return {
            vis: Object.assign({}, this.waits.vis),
            reservedPermanent: Object.assign({}, this.waits.reservedPermanent),
            reservedEmpherical: Object.assign({}, this.waits.reservedEmpherical),
            idle: Object.assign({}, this.waits.idle),
            terminal: Object.assign({}, this.waits.terminal)
        };
    }

    // here only the socket is created and wired up, the actial connect sequence happens somewhere else
    public createSocketForPool(forPool: PoolExActive): void {
        const { SocketClass, conOpt, extraOpt } = this.getSocketClassAndOptions(forPool);

        const socket = new SocketClass();
        const placementTime = this.now();
        const jitter = this.jitter.getRandom();
        //
        const attributes: SocketAttributes = {
            socket,
            meta: {
                placementTime,
                jitter,
                pool: forPool
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
