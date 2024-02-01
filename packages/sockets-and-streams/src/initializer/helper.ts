import type { ParseContext, Notifications } from '../protocol/messages/back/types';
import { parse as parseErrorResponse } from '../protocol/messages/back/ErrorResponse';
import { parse as parseNoticeResponse } from '../protocol/messages/back/NoticeResponse';

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

export function createParseContext(newData: Uint8Array, txtDecoder): ParseContext {
    return {
        buffer: newData,
        cursor: 0,
        txtDecoder
    };
}

export function optionallyHandleUnprocessedBinary(ctx: ParseContext): Uint8Array | false {
    if (!bytesLeft(ctx)) {
        return false;
    }
    return ctx.buffer.slice(ctx.cursor);
}

export function optionallyHandleErrorAndNoticeResponse(ctx: ParseContext): null | undefined | false | { notices: Notifications[], errors: Notifications[] } {
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
