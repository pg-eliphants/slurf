/*
ParseComplete (B) #
Byte1('1')
Identifies the message as a Parse-complete indicator.

Int32(4)
Length of message contents in bytes, including self.
*/

import { PARSE_COMPLETE, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState } from './types';
import { createMatcher, messageLength } from './helper';

const match = createMatcher(PARSE_COMPLETE);

// true -> complete message received
// undefined -> is the message but wait for more data (for this message case 1 or 2 bytes)
// false -> not this message
export function parse(ctx: ParseContext): null | undefined | boolean {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    if (len !== 4) {
        return null;
    }
    return true;
}
