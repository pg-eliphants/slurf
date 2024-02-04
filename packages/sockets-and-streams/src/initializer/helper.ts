import type { ConnectOpts, IpcSocketConnectOpts, TcpSocketConnectOpts } from 'net';

import type { ParseContext, Notifications } from '../protocol/messages/back/types';
import { parse as parseErrorResponse } from '../protocol/messages/back/ErrorResponse';
import { parse as parseNoticeResponse } from '../protocol/messages/back/NoticeResponse';
import { PGSSLConfig, SocketOtherOptions } from './types';

export function bytesLeft(pc: ParseContext): number {
    return pc.buffer.byteLength - pc.cursor;
}
// create parsing context if not exist
// todo: use memory object for this
export function addBufferToParseContext(ctx: ParseContext, newData: Uint8Array): ParseContext {
    const old = ctx.buffer;
    ctx.buffer = new Uint8Array(old.byteLength + newData.byteLength);
    ctx.buffer.set(old, 0);
    ctx.buffer.set(newData, old.byteLength);
    return ctx;
}

export function normalizeExtraOptions(extraOpt?: SocketOtherOptions): SocketOtherOptions {
    const { timeout = 0 } = extraOpt ?? {};
    return {
        timeout
    };
}

export function optionallyHandleUnprocessedBinary(ctx: ParseContext): Uint8Array | false {
    if (!bytesLeft(ctx)) {
        return false;
    }
    return ctx.buffer.slice(ctx.cursor);
}

export function normalizeConnectOptions(
    conOpt: (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts)
): (TcpSocketConnectOpts & ConnectOpts) | (IpcSocketConnectOpts & ConnectOpts) | { errors: Error[] } {
    const errors: Error[] = [];
    if ((conOpt as IpcSocketConnectOpts & ConnectOpts).path) {
        return {
            path: (conOpt as IpcSocketConnectOpts & ConnectOpts).path
        };
    }
    const {
        port,
        host,
        localAddress,
        localPort,
        hints,
        family,
        lookup,
        noDelay,
        keepAlive,
        keepAliveInitialDelay,
        autoSelectFamily,
        autoSelectFamilyAttemptTimeout
    } = (conOpt || {}) as TcpSocketConnectOpts & ConnectOpts;
    // tcp connection
    if (!port) {
        errors.push(new Error(`no port or path specified in connect options, [${JSON.stringify(conOpt)}]`));
        return { errors };
    }
    return {
        port,
        ...(host && { host }),
        ...(localAddress && { localAddress }),
        ...(localPort && { localPort }),
        ...(hints && { hints }),
        ...(family && { family }),
        ...(noDelay && { noDelay }),
        ...(lookup && { lookup }),
        ...(keepAlive && { keepAlive }),
        ...(keepAliveInitialDelay && { keepAliveInitialDelay }),
        ...(autoSelectFamily && { autoSelectFamily }),
        ...(autoSelectFamilyAttemptTimeout && { autoSelectFamilyAttemptTimeout })
    };
}

export function validatePGSSLConfig(config?: PGSSLConfig): { errors: Error[] } | boolean {
    const errors: Error[] = [];
    if (config === undefined) {
        return false;
    }
    if (!config?.ca) {
        errors.push(new Error('no ssl.ca set'));
        return { errors };
    }

    if (typeof config.ca !== 'string' || config.ca.length === 0) {
        errors.push(new Error('ssl.ca must be a non-empty string'));
    }
    return errors.length ? { errors } : true;
}

export function optionallyHandleErrorAndNoticeResponse(
    ctx: ParseContext
): null | undefined | false | { notices: Notifications[]; errors: Notifications[] } {
    const errors: Notifications[] = [];
    const notices: Notifications[] = [];
    for (;;) {
        const rcErr = parseErrorResponse(ctx);
        if (rcErr === undefined) {
            return undefined;
        }
        if (rcErr === null) {
            return null;
        }
        if (rcErr !== false) {
            errors.push(rcErr);
            continue;
        }
        // here rcErr === false
        const rcNotice = parseNoticeResponse(ctx);
        if (rcNotice === undefined) {
            return undefined;
        }
        if (rcNotice === null) {
            return null;
        }
        if (rcNotice !== false) {
            notices.push(rcNotice);
            continue;
        }
        break;
    }
    if (notices.length === 0 && errors.length === 0) {
        return false;
    }
    return { notices, errors };
}
