import type { PGConfig } from '../protocol/types';
import { SocketAttributes } from '../io/types';

export type SetSSLFallback = (config: Required<PGConfig>) => boolean;
export type GetSLLFallbackSpec = (setFallbackFn: (fallback: SetSSLFallback) => void) => void;
import type { ParseContext, Notifications } from '../protocol/messages/back/types';
import type { List } from '../utils/list';
export type SocketAttributeAuxMetadata = {
    sslRequestSent: boolean;
    startupSent: boolean;
    upgradedToSll: boolean;
    authenticationOk: boolean;
    authenticationMD5Sent: boolean;
    authenticationClearTextSent: boolean;
    readyForQuery?: number;
    pid?: number;
    cancelSecret?: number;
    runtimeParameters: Record<string, string>;
    parsingContext?: ParseContext;
    error: null | Notifications;
};

export interface IBaseInitializer<T = any> {
    startupAfterConnect(socket: SocketAttributes<T>): Promise<boolean>;
    startupAfterSSLConnect(socket: SocketAttributes<T>): Promise<boolean>;
    handleData(
        item: Exclude<List<SocketAttributes<SocketAttributeAuxMetadata>>, null>,
        data: Uint8Array
    ): Promise<boolean | 'done'>;
    handleEnd(item: SocketAttributes<T>): boolean;
    handleTimeout(item: SocketAttributes<T>): boolean;
    handleError(item: SocketAttributes<T>, err: Error & NodeJS.ErrnoException): boolean;
    handleClose(item: SocketAttributes<SocketAttributeAuxMetadata>): void;
}
