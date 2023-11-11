import type { SocketAttributes } from '../io/types';
export type PGConfig = {
    user: string;
    database?: string;
    replication?: boolean | string;
};

export type PGSSLConfig = {
    ca: string;
};

export type ProtocolAttributes = {
    tag: string;
    meta: {
        // add more
        state: string;
    };
    connection: SocketAttributes;
};

export type SSLFallback = (config: Required<PGConfig>) => boolean;
export type SetClientConfig = (config: PGConfig) => void;
export type GetClientConfig = (setConfig: SetClientConfig) => void;
export type SetSSLConfig = (config: PGSSLConfig, sslFallback: SSLFallback) => void;
export type GetSSLConfig = (setSSLConfig: SetSSLConfig) => void;
