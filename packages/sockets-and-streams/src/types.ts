export type Pool = 'vis' | 'reserved' | 'active' | 'idle';
export type PoolExActive = Exclude<Pool, 'active'>;

import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket } from 'net';
import type SocketIOManager from './SocketIOManager';

export type SocketOtherOptions = {
    noDelay: boolean;
    keepAlive: boolean;
    timeout: number;
};

export type CreateSocketSpec = (
    hints: { forPool: Exclude<Pool, 'active'> },
    createSock: (socket: typeof Socket) => void,
    allOptions: (conOptions: SocketConnectOpts, extraOpt?: SocketOtherOptions) => void
) => void;

export type CreateSocketBuffer = () => Uint8Array;

export type MetaSocketAttr = {
    jitter: number; // random delay in ms when connecting
    placementTime: number;
    pool: Pool; // current/target pool this socket was created
};

export type SocketAttributes = {
    socket: Socket;
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
