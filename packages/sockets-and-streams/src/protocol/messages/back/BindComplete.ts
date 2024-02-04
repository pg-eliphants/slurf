/*
    BindComplete (B) 
    Byte1('2')
    Identifies the message as a Bind-complete indicator.

    Int32(4)
    Length of message contents in bytes, including self.
*/

import { MSG_NOT, MSG_UNDECIDED, BIND_COMPLETE } from './constants';
import { messageLength, createMatcher } from './helper';
import ReadableStream from '../../../io/ReadableByteStream';

export const match = createMatcher(BIND_COMPLETE);

export function parse(ctx: ReadableStream): null | undefined | boolean {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = messageLength(buffer, cursor);
    if (endPosition === 5) {
        ctx.advanceCursor(endPosition);
        return true;
    }
    return null;
}
