import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket } from 'net';
import type { Jitter } from './Jitter';
import type {
    Pool,
    CreateSocketBuffer,
    CreateSocketSpec,
    SocketAttributes,
    MetaSocketAttr,
    SocketOtherOptions,
    SocketConnectOpts,
    PoolExActive
} from './types';

type HistogramResidentTimes = {
    [time: number]: number;
};

type PoolWaitTimes = {
    vis: HistogramResidentTimes;
    reserved: HistogramResidentTimes;
    active: HistogramResidentTimes;
    idle: HistogramResidentTimes;
    [poolName: string]: HistogramResidentTimes;
};

export default class SocketIOManager {
    // this socket pools are sorted on resident times
    private vis: SocketAttributes[];
    private reservedPermanent: SocketAttributes[];
    private reservedEmpherical: SocketAttributes[];
    private idle: SocketAttributes[];
    private created: SocketAttributes[];
    private waits: PoolWaitTimes;
    private jittered: Map<NodeJS.Timeout, Socket>;

    // private functions
    // this.decorate(_sock, jitter, forPool, conOpt);
    private decorate(socket: Socket, jitter: number, forPool: Pool, otherOptions: SocketOtherOptions) {
        let totalIdleTimes = 0;
        socket.setNoDelay(otherOptions.noDelay);
        socket.setKeepAlive(otherOptions.keepAlive);
        socket.setTimeout(otherOptions.timeout);
        let cntTO = 0;
        socket.on('timeout', () => {
            socket.setTimeout(otherOptions.timeout);
            cntTO++;
        });
        /* socket.on('error', (err: Error & NodeJS.ErrnoException) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            if (err.syscall) {
                console.log('/error occurred [%o]:', { syscall: err.syscall, name: err.name, code: err.code });
                return;
            }
            if (isAggregateError(err)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const prunedErrors = Array.from(err.errors).map((err: Error) => ({
                    message: err.message
                }));
                console.log('/error occurred [%o]:', prunedErrors);
            }
        });*/
        return;
    }
    private processData(bytesWritten: number, buf: Uint8Array): boolean {
        console.log(bytesWritten, buf.length);
        return true;
    }
    private normalizeExtraOptions(extraOpt?: SocketOtherOptions): SocketOtherOptions {
        const { keepAlive = true, noDelay = true, timeout = 0 } = extraOpt ?? {};
        return {
            keepAlive,
            noDelay,
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
                buffer: this.createBuffer(),
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
        this.vis = [];
        this.reservedPermanent = [];
        this.reservedEmpherical = [];
        this.idle = [];
        this.created = [];
        this.waits = {
            vis: {},
            reserved: {},
            active: {},
            idle: {}
        };
        this.jittered = new Map();
    }
    //
    public getPoolWaitTimes(): PoolWaitTimes {
        return {
            vis: Object.assign({}, this.waits.vis),
            reserved: Object.assign({}, this.waits.reserved),
            active: Object.assign({}, this.waits.active),
            idle: Object.assign({}, this.waits.idle)
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
        this.decorate(socket, jitter, forPool, extraOpt);
        this.created.push(attributes); //
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
