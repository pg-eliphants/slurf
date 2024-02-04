/*
NotificationResponse (B) 
Byte1('A')
Identifies the message as a notification response.

Int32
Length of message contents in bytes, including self.

Int32
The process ID of the notifying backend process.

String
The name of the channel that the notify has been raised on.

String
The “payload” string passed from the notifying process.
*/

import { MSG_UNDECIDED, NOTIFICATION_RESPONSE } from './constants';
import ReadableStream from '../../../io/ReadableByteStream';
import { messageLength, match, i32 } from './helper';

export type Notification = {
    pid: number;
    name: string;
    payload: string;
};

export function parse(ctx: ReadableStream, txtDecoder: TextDecoder): null | undefined | Notification {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const endPosition = len + cursor;
    const pid = i32(buffer, cursor + 5);
    const idx = buffer.indexOf(0, cursor + 9);
    if (idx < 0 || idx >= endPosition) {
        return null;
    }
    const name = txtDecoder.decode(buffer.slice(cursor + 9, idx));
    const idx2 = buffer.indexOf(0, idx + 1);
    if (idx2 < 0 || idx2 >= endPosition) {
        return null;
    }
    const payload = txtDecoder.decode(buffer.slice(idx + 1, idx2));

    if (endPosition === idx2 + 1) {
        ctx.advanceCursor(len);
        return { pid, name, payload };
    }
    return null;
}
