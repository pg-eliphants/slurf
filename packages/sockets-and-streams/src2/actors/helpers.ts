import { parseError, parseNotice } from '../messages/fromBackend/ErrorAndNoticeResponse';
import { PG_ERROR, PG_NOTICE } from '../messages/fromBackend/ErrorAndNoticeResponse/constants';
import { SelectedMessages } from '../messages/fromBackend/types';
import ReadableByteStream from '../utils/ReadableByteStream';
import Enqueue from './Enqueue';
import { ErrorResponse, NoticeResponse } from './messages';
import { SocketControlMsgs } from './socket/messages';
import { INFO_TOKENS } from './supervisor/constants';
import { SuperVisorControlMsgs } from './supervisor/messages';

export const defaultActivityTimeReducer = (delay: number) => {
    const bin = delay; //Math.trunc(Math.sqrt(Math.max(delay, 0)));
    return bin;
};

export function delayMillis(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
export function sendToSuperVisor<S extends SelectedMessages, T extends (a: S) => boolean>(
    supervisor: Enqueue<SuperVisorControlMsgs>,
    actor: Enqueue<SocketControlMsgs>,
    tokens: S[],
    filter: T
) {
    const sendTokens = tokens.filter(filter);
    supervisor.enqueue({ type: INFO_TOKENS, pl: sendTokens, socketActor: actor });
}

export function optionallyHandleErrorAndNoticeResponse(
    readable: ReadableByteStream,
    decoder: TextDecoder
): { notices: NoticeResponse[]; errors: ErrorResponse[]; inTransit: boolean; brokenMsg: boolean } {
    const errors: ErrorResponse[] = [];
    const notices: NoticeResponse[] = [];
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
            errors.push({ type: PG_ERROR, pl: rcErr });
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
            notices.push({ type: PG_NOTICE, pl: rcNotice });
            continue;
        }
        // rcNotice === false and rcErr === false
        break;
    }
    return { notices, errors, inTransit, brokenMsg };
}
