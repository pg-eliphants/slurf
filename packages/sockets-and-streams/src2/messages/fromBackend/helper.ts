import { MessageState } from './types';
import { MSG_UNDECIDED, MSG_IS, MSG_NOT } from './constants';
import ReadableByteStream from '../../utils/ReadableByteStream';
import { ErrorAndNotices, PGErrorResponse, PGNoticeResponse } from './ErrorAndNoticeResponse/types';
import { parse as parseErrorOrNotice } from '../../messages/fromBackend/ErrorAndNoticeResponse';
import { ERROR, NOTICE } from '../../messages/fromBackend/constants';

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
    const errorFields: ErrorAndNotices[] = [];
    const noticeFields: ErrorAndNotices[] = [];
    let inTransit = false;
    let brokenMsg = false;
    for (; readable.bytesLeft() > 0; ) {
        const rcErr = parseErrorOrNotice(ERROR, readable, decoder);
        if (rcErr === undefined) {
            inTransit = true;
            break;
        }
        if (rcErr === null) {
            brokenMsg = true;
            break;
        }
        if (rcErr !== false) {
            errorFields.push(rcErr);
            continue;
        }
        // here rcErr === false
        const rcNotice = parseErrorOrNotice(NOTICE, readable, decoder);
        if (rcNotice === undefined) {
            inTransit = true;
            break;
        }
        if (rcNotice === null) {
            brokenMsg = true;
            break;
        }
        if (rcNotice !== false) {
            noticeFields.push(rcNotice);
            continue;
        }
        // rcNotice === false and rcErr === false
        break;
    }
    const notices: PGNoticeResponse[] = noticeFields.map((fields) => ({ type: 'pg.N', pl: fields }));
    const errors: PGErrorResponse[] = errorFields.map((fields) => ({ type: 'pg.E', pl: fields }));
    return { notices, errors, inTransit, brokenMsg };
}
