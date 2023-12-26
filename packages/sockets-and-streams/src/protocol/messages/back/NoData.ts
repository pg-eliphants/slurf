/* done
NoData (B) 
Byte1('n')
Identifies the message as a no-data indicator.

Int32(4)
Length of message contents in bytes, including self.
*/
import { MSG_NOT, MSG_UNDECIDED, NO_DATA } from './constants';
import { ParseContext } from './types';
export { matcherLength } from './helper';
import { createMatcher, messageLength } from './helper';

// export { messageLength };

export const match = createMatcher(NO_DATA);

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
    if (endPosition !== cursor + 5) {
        return null;
    }
    ctx.cursor = endPosition;
    return true; // there is no actual data to return other then true
}
