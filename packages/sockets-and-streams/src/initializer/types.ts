import { PoolFirstResidence } from '../io/types';

// network
import type { TcpSocketConnectOpts, IpcSocketConnectOpts, ConnectOpts, Socket, NetConnectOpts } from 'net';
import type { ConnectionOptions, TLSSocket } from 'tls';
export interface PGSSLConfigRaw extends ConnectionOptions, ConnectOpts {}
export type PGSSLConfig = Omit<PGSSLConfigRaw, 'host' | 'path' | 'port'>;

export type PGConfig = {
    user: string;
    database?: string;
    replication?: boolean;
};
export type ClientConfig = () => PGConfig;
export type SSLFallback = (config: Required<PGConfig>) => boolean;

// tcp/icp
// tcp/icp
// tcp/icp

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

// ssl/tsl
// ssl/tsl
// ssl/tsl

export type CreateSLLConnection = (options: PGSSLConfig) => TLSSocket;
export type CreateSSLSocketSpec = (hints: CreateSocketSpecHints) => {
    socketSSLFactory: () => CreateSLLConnection;
    sslOptions: () => PGSSLConfig;
};

import type { ErrorAndNotices } from '../protocol/messages/back/types';
import type { List } from '../../src2/utils/list';
import { NegotiateProtocolResult } from '../protocol/messages/back/NegotiateProtocolVersion';

export type InitializerState = {
    sslRequestSent: boolean;
    sslReplyReceived: boolean;
    // states for initializer, login etc
    startupSent: boolean;
    upgradedToSll: boolean;
    authenticationOk: boolean;
    authenticationMD5Sent: boolean;
    authenticationClearTextSent: boolean;
    readyForQuery?: number;
    // states for user defined (post authentication initialization)
    postLoginDataCheck: boolean;
    postLoginInitialization: boolean;

    // these things should be part of the socket context maybe, or given to Agent that user will use
    pid?: number;
    cancelSecret?: number;
    runtimeParameters: Record<string, string>;
    errors: ErrorAndNotices[];
    notices: ErrorAndNotices[];
    negotiateVersion?: NegotiateProtocolResult;
};
