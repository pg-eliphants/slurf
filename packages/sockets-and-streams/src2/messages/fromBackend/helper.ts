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
