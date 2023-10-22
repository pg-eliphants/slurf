export type Pool = 'vis' | 'reserved' | 'active' | 'idle';

import type { SocketConnectOpts, Socket } from 'net';

export type CreateSocketSpec = (
    hints: { forPool: Exclude<Pool, 'active'> },
    createSock: (socket: typeof Socket) => void,
    allOptions: (conOptions: SocketConnectOpts) => void
) => void;

export type CreateSocketBuffer = () => Uint8Array;

export type MetaCreateSocketAttr = {
    jitter: number;
};

export type MetaSocketAttr = {
    placementTime: number; // ms since epoch since placed in a queue
    [index: string]: unknown;
};

export type SocketAttributes = {
    socket: Socket;
    meta: MetaCreateSocketAttr | MetaSocketAttr;
};
