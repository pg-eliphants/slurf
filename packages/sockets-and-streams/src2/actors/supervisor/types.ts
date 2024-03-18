import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket, NetConnectOpts } from 'net';
import type { ConnectionOptions, TLSSocket } from 'tls';
import type { List } from '../../utils/list';
import SocketActor from '../socket';

// internal housekeeping
export type PoolFirstResidence = Exclude<Pool, 'active' | 'terminal' |  'created'>;
export type Pool =  'reserved' | 'active' | 'idle' | 'terminal' | 'created';
export type ActivityWait = 'network' | 'iom_code' | 'connect' | 'sslConnect' | 'finish' | 'end' | 'close' | 'drained';

export type Residency = {
    [socketActor in Pool]: List<SocketActor>;
};

export type ResidencyCount = {
    [index in Pool]: number;
};

export type HistogramResidentTimes = {
    [time: number]: number;
};

export type PoolWaitTimes = {
    [index in Pool]: HistogramResidentTimes;
};

// developer config
// developer config
// developer config

export type PGConfig = {
    user: string;
    password?: () => string;
    database?: string;
    replication?: boolean;
};
export type ClientConfig = (forPool: PoolFirstResidence) => PGConfig;
export type SSLFallback = (forPool: PoolFirstResidence, config: PGConfig) => boolean;

export type CreateSocketSpecHints = {
    forPool: PoolFirstResidence;
};
export type SocketOtherOptions = {
    timeout: number;
};
export type CreateSocketConnection = (options: NetConnectOpts) => Socket;
export type SocketConnectOpts = (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts);

export type CreateSocketSpec = (hints: CreateSocketSpecHints) => {
    socketFactory: () => CreateSocketConnection;
    socketConnectOptions: () => SocketConnectOpts;
    extraOpt: () => SocketOtherOptions;
};

// developer config tsl/ssl
// developer config tsl/ssl
// developer config tsl/ssl

export interface SSLConfigRaw extends ConnectionOptions, ConnectOpts {}
export type SSLConfig = Omit<SSLConfigRaw, 'host' | 'path' | 'port'>;
export type CreateSLLConnection = (options: SSLConfig) => TLSSocket;
export type CreateSSLSocketSpec = () => {
    socketSSLFactory: () => false | CreateSLLConnection;
    sslOptions: () => false | SSLConfig;
};

export type ActivityWaitTimes = {
    [index in ActivityWait]: HistogramResidentTimes;
};

export type reduceValueToBin = (value: number) => number;

export type ActivityTimeToBins = {
    [index in ActivityWait]: reduceValueToBin;
};

// define the bin sizes
export type PoolTimeBins = {
    [index in Pool]: reduceValueToBin;
};
