import type { MessageState } from './types';
import type { PGErrorResponse, PGNoticeResponse } from './ErrorAndNoticeResponse/types';

import ReadableByteStream from '../../utils/ReadableByteStream';
import { parseError, parseNotice } from '../../messages/fromBackend/ErrorAndNoticeResponse';

// constants
import { MSG_UNDECIDED, MSG_IS, MSG_NOT } from './constants';

export function i32(bin: Uint8Array, start: number): number {
    return (bin[start] << 24) + (bin[start + 1] << 16) + (bin[start + 2] << 8) + bin[start + 3];
}

export function i16(bin: Uint8Array, start: number): number {
    return (bin[start] << 8) + bin[start + 1];
}

export function messageLength(bin: Uint8Array, cursor: number) {
    return i32(bin, cursor + 1) + 1;
}

export function match(tag: number, bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (bin[start] !== tag) {
        return MSG_NOT;
    }
    if (len < 5) {
        return MSG_UNDECIDED;
    }
    const msgLen = messageLength(bin, start);
    if (len < msgLen) {
        return MSG_UNDECIDED;
    }
    return MSG_IS;
}

export function optionallyHandleErrorAndNoticeResponse(
    readable: ReadableByteStream,
    decoder: TextDecoder
): { notices: PGNoticeResponse[]; errors: PGErrorResponse[]; inTransit: boolean; brokenMsg: boolean } {
    const errors: PGErrorResponse[] = [];
    const notices: PGNoticeResponse[] = [];
    let inTransit = false;
    let brokenMsg = false;
    for (; readable.bytesLeft() > 0; ) {
        const rcErr = parseError(readable, decoder);
        if (rcErr === undefined) {
            inTransit = true;
            break;
        }
        if (rcErr === null) {
            brokenMsg = true;
            break;
        }
        if (rcErr !== false) {
            errors.push(rcErr);
            continue;
        }
        // here rcErr === false
        const rcNotice = parseNotice(readable, decoder);
        if (rcNotice === undefined) {
            inTransit = true;
            break;
        }
        if (rcNotice === null) {
            brokenMsg = true;
            break;
        }
        if (rcNotice !== false) {
            notices.push(rcNotice);
            continue;
        }
        // rcNotice === false and rcErr === false
        break;
    }
    return { notices, errors, inTransit, brokenMsg };
}
