export type Pool = 'vis' | 'reserved' | 'active' | 'idle';
export type PoolExActive = Exclude<Pool, 'active'>;

import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket, NetConnectOpts } from 'net';
import type SocketIOManager from './SocketIOManager';

export type SocketOtherOptions = {
    timeout: number;
};

export type CreateSocketSpecHints = {
    forPool: Exclude<Pool, 'active'>;
};

export type CreateSocketConnection = (options: NetConnectOpts) => Socket;

export type CreateSocketSpec = (
    hints: CreateSocketSpecHints,
    createSock: (createSocket: CreateSocketConnection) => void,
    allOptions: (conOptions: SocketConnectOpts, extraOpt?: SocketOtherOptions) => void
) => void;

export type CreateSocketBuffer = () => Uint8Array;

export type MetaSocketAttr = {
    jitter: number; // random delay in ms when connecting
    placementTime: number;
    pool: Pool; // current/target pool
};

export type SocketAttributes = {
    socket: Socket | null;
    meta: MetaSocketAttr;
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

