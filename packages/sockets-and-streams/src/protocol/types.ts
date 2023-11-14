import type { SocketAttributes, PGSSLConfig } from '../io/types';
import { toBeContinued, errMissing, errOverflow } from './constants';
export type PGConfig = {
    user: string;
    database?: string;
    replication?: boolean | string;
};

export type ProtocolAttributes = {
    tag: string;
    meta: {
        // add more
        state: string;
        continue?: boolean; // the messages was/is being received partially
        currentMsgTyp?: string;
    };
    connection: SocketAttributes;
};

export type SetClientConfig = (config: PGConfig) => void;
export type GetClientConfig = (setConfig: SetClientConfig) => void;

export type SetSSLFallback = (config: Required<PGConfig>) => boolean;
export type GetSLLFallbackSpec = (setFallbackFn: (fallback: SetSSLFallback) => void) => void;

export type Fields =
    | 'S'
    | 'V'
    | 'C'
    | 'M'
    | 'D'
    | 'H'
    | 'P'
    | 'p'
    | 'q'
    | 'W'
    | 's'
    | 't'
    | 'c'
    | 'd'
    | 'n'
    | 'F'
    | 'L'
    | 'R';

export type ErrorResponse = {
    [T in Fields]?: string;
};

export type ToBeContinued = typeof toBeContinued;
export type ErrMissing = typeof errMissing;
export type ErrOverflow = typeof errOverflow;
