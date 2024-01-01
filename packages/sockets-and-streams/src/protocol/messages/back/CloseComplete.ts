/*
CloseComplete (B) 
Byte1('3')
Identifies the message as a Close-complete indicator.

Int32(4)
Length of message contents in bytes, including self.
*/
import { MSG_NOT, MSG_UNDECIDED, CLOSE_COMPLETE } from './constants';
import { ParseContext } from './types';
import { messageLength, createMatcher } from './helper';

export const match = createMatcher(CLOSE_COMPLETE);

export function parse(ctx: ParseContext): null | undefined | boolean {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = messageLength(buffer, cursor) + cursor;
    if (endPosition === cursor + 5) {
        return true;
    }
    return null;
}
