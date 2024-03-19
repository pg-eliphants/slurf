/*
CloseComplete (B) 
Byte1('3')
Identifies the message as a Close-complete indicator.

Int32(4)
Length of message contents in bytes, including self.
*/

import ReadableByteStream from "../../../utils/ReadableByteStream";
import { CLOSE_COMPLETE, MSG_NOT, MSG_UNDECIDED } from "../constants";
import { match, messageLength } from "../helper";

export type CloseComplete = {
    type: 'c-c';
}

export const CLOSE_COMPLETE_TYPE: CloseComplete['type'] = 'c-c';


export function parse(ctx: ReadableByteStream): null | undefined | false | CloseComplete {
    const { buffer, cursor } = ctx;
    const matched = match(CLOSE_COMPLETE,buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    if (len === 5) {
        ctx.advanceCursor(len);
        return { type: CLOSE_COMPLETE_TYPE };
    }
    return null;
}
