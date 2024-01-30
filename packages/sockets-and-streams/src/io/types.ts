import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket, NetConnectOpts } from 'net';

export type Pool = 'vis' | 'reservedEmpherical' | 'reservedPermanent' | 'active' | 'idle' | 'terminal' | 'created';
export type ActivityWait = 'network' | 'iom_code' | 'connect' | 'sslConnect' | 'finish' | 'end' | 'close' | 'drained';
export type ActivityCount = 'error' | 'idle' | 'end' | 'close';
export type PoolFirstResidence = Exclude<Pool, 'active' | 'terminal' | 'reservedEmpherical' | 'created'>;

import type { ConnectionOptions, TLSSocket } from 'tls';
export interface PGSSLConfigRaw extends ConnectionOptions, ConnectOpts {}

export type PGSSLConfig = Omit<PGSSLConfigRaw, 'host' | 'path' | 'port'>;

import type { List } from '../utils/list';

import { PromiseExtended } from './helpers';

export type CreateSocketSpecHints = {
    forPool: PoolFirstResidence;
};

export type SocketOtherOptions = {
    timeout: number;
};

export type CreateSocketConnection = (options: NetConnectOpts) => Socket;

export type CreateSocketSpec = (
    hints: CreateSocketSpecHints,
    setSocketCreator: (createSocket: CreateSocketConnection) => void,
    allOptions: (conOptions: SocketConnectOpts, extraOpt?: SocketOtherOptions) => void
) => void;

export type CreateSLLConnection = (options: PGSSLConfig) => TLSSocket;

export type CreateSSLSocketSpec = (
    hints: CreateSocketSpecHints,
    setSocketCreator: (createSocket: CreateSLLConnection) => void,
    setSSLOptions: (options: PGSSLConfig) => void
) => void;

export type reduceValueToBin = (value: number) => number;

// define the bin sizes
export type PoolTimeBins = {
    [index in Pool]: reduceValueToBin;
};

export type ActivityTimeBins = {
    [index in ActivityWait]: reduceValueToBin;
};

export type ActivityCountBins = {
    [index in ActivityCount]: number;
};

export type MetaSocketAttr<T> = {
    id: Number; // unique uuid for socket
    jitter: number; // random delay in ms when connecting
    pool: {
        createdFor: PoolFirstResidence;
        placementTime: number; // when the socket was placed into "pool"
        current: Pool;
        lastChecked: number;
    };
    time: {
        ts: number;
    };
    networkBytes: {
        bytesRead: number;
        bytesWritten: number;
    };
    idleCounts: number;
    backPressure: PromiseExtended;
    ready4Use: PromiseExtended;
    lastWriteTs: number;
    timeout: number;
    aux: T;
};

type HistogramResidentTimes = {
    [time: number]: number;
};

export type PoolWaitTimes = {
    [index in Pool]: HistogramResidentTimes;
};

export type ActivityWaitTimes = {
    [index in ActivityWait]: HistogramResidentTimes;
};

export type Residency = {
    [index in Pool]: List<SocketAttributes>;
};

export type ResidencyCount = {
    [index in Pool]: number;
};

export type SocketAttributes<T = any> = {
    socket: Socket | null;
    ioMeta: MetaSocketAttr<T>;
    // reference to procolState,
    // we can keep it "unknown" because SocketIOManager will never touch it and has no knowledge
    // whatso-ever about the the protocol (pg, mysql, memcached)
    protoMeta?: unknown;
};

export type SocketConnectOpts = (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts);

export interface AggregateError extends Error {
    errors: any[];
}

export interface AggregateErrorConstructor {
    new (errors: Iterable<any>, message?: string): AggregateError;
    (errors: Iterable<any>, message?: string): AggregateError;
    readonly prototype: AggregateError;
}

export type SendingStatus = 'ok' | 'backpressure' | 'closed' | 'only-read' | 'ok-but-backpressure';
