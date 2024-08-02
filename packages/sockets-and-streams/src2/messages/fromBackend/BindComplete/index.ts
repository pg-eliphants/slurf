/*
    BindComplete (B) 
    Byte1('2')
    Identifies the message as a Bind-complete indicator.

    Int32(4)
    Length of message contents in bytes, including self.
*/

import ReadableByteStream from "../../../utils/ReadableByteStream";
import { MSG_NOT, MSG_UNDECIDED } from "../constants";
import { match, messageLength } from '../helper';

export type BindComplete = {
    type: 'bind-c'
}

export const BIND_COMPLETE_TYPE: BindComplete['type'] = 'bind-c';

export function parse(ctx: ReadableByteStream): null | undefined | false | BindComplete {
    const { buffer, cursor } = ctx;
    const matched = match(50 ,buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    if (len === 5) {
        ctx.advanceCursor(len);
        return { type: BIND_COMPLETE_TYPE };
    }
    return null;
}
