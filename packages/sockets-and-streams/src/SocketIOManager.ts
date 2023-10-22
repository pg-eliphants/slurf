import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket } from 'net';
import type { Jitter } from './Jitter';
import type { Pool, CreateSocketBuffer, CreateSocketSpec, SocketAttributes } from './types';

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
    // private functions
    private decorate(_socket: Socket) {
        return;
    }
    private processData(bytesWritten: number, buf: Uint8Array): boolean {
        console.log(bytesWritten, buf.length);
        return true;
    }
    private normalizeConnectOptions(
        conOpt: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts)
    ): (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts) | never {
        if ((conOpt as IpcSocketConnectOpts & ConnectOpts).path) {
            // unix domain socket
            return {
                path: (conOpt as IpcSocketConnectOpts & ConnectOpts).path,
                onread: {
                    buffer: this.createBuffer(),
                    callback: this.processData.bind(this)
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
                callback: this.processData.bind(this)
            }
        };
    }
    //
    constructor(
        private readonly crfn: CreateSocketSpec,
        private readonly jitter: Jitter,
        private readonly createBuffer: CreateSocketBuffer
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
    public createSocketForPool(forPool: Exclude<Pool, 'active'>): void {
        let SocketClass: typeof Socket | undefined;
        let conOpt: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts) | undefined;
        //
        const createSocket = (socket: typeof Socket) => {
            SocketClass = socket;
        };
        const setAllOptions = (
            conOptions: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts)
        ): void => {
            conOpt = conOptions;
        };
        this.crfn({ forPool }, createSocket, setAllOptions);
        if (!SocketClass) {
            throw new Error('No socket class set in callback');
        }
        if (!conOpt) {
            throw new Error(`No connect options given`);
        }
        conOpt = this.normalizeConnectOptions(conOpt);
        const _sock = new SocketClass();
        this.decorate(_sock);
        const structure = {
            socket: _sock,
            meta: {
                jitter: this.jitter.getRandom(),
                pool: forPool
            }
        };
        this.created.push(structure);
    }
}
