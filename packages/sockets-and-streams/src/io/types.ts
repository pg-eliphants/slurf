import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket, NetConnectOpts } from 'net';
import type SocketIOManager from './SocketIOManager';

export type Pool = 'vis' | 'reservedEmpherical' | 'reservedPermanent' | 'active' | 'idle' | 'terminal' | 'created';
export type Activity = 'network' | 'iom_code';
export type PoolFirstResidence = Exclude<Pool, 'active' | 'terminal' | 'reservedEmpherical' | 'created'>;

import type { ConnectionOptions, TLSSocket } from 'tls';
export interface PGSSLConfigRaw extends ConnectionOptions, ConnectOpts {}

export type PGSSLConfig = Omit<PGSSLConfigRaw, 'host' | 'path' | 'port'>;

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
    [index in Activity]: reduceValueToBin;
};

export type CreateSocketBuffer = () => Uint8Array;

export type MetaSocketAttr = {
    jitter: number; // random delay in ms when connecting
    pool: {
        createdFor: PoolFirstResidence;
        placementTime: number; // when the socket was placed into "pool"
        pool: Pool;
        lastChecked: number;
    };
    networkBytes: {
        ts: number;
        bytesRead: number;
        bytesWritten: number;
    };
};

type HistogramResidentTimes = {
    [time: number]: number;
};

export type PoolWaitTimes = {
    [index in Pool]: HistogramResidentTimes;
};

export type ActivityWaitTimes = {
    [index in Activity]: HistogramResidentTimes;
};

export type SocketAttributes = {
    socket: Socket | null;
    ioMeta: MetaSocketAttr;
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
