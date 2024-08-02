import { CreateSSLSocketSpec, Pool } from '../supervisor/types';
import type { EndConnection, UpgradeToSSL as _UpgradeToSSL, QueryInitDone } from '../messages';
import Enqueue from '../Enqueue';

// socket control messages (incomming)
export type Pause = {
    type: 'pause';
};

type Resume = {
    type: 'resume';
};

export type SetPool = {
    type: 'setpool';
    pool: Pool;
    placementTime: number;
};

export type Write = {
    type: 'write';
    data: Uint8Array;
};

export type WriteThrottle = {
    type: 'write-throttle';
    data: Uint8Array;
};

export type UpgradeToSSL = _UpgradeToSSL & {
    sslSpec: CreateSSLSocketSpec;
};

export type SetActor<T = any> = {
    type: 'setactor';
    pl: Enqueue<T>;
};



export type SocketControlMsgs =
    | Pause
    | Resume
    | SetPool
    | Write
    | WriteThrottle
    | UpgradeToSSL
    | SetActor
    | EndConnection
    | QueryInitDone;
