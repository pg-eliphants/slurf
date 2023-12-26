/*
done
    ReadyForQuery (B) 
    Byte1('Z')
    Identifies the message type. ReadyForQuery is sent whenever the backend is ready for a new query cycle.

    Int32(5)
    Length of message contents in bytes, including self.

    Byte1
    Current backend transaction status indicator. Possible values are 'I' if idle (not in a transaction block); 'T' if in a transaction block; or 'E' if in a failed transaction block (queries will be rejected until block is ended).
*/
import { READY_4_QUERY, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState } from './types';
import { createMatcher, messageLength } from './helper';

export const match = createMatcher(READY_4_QUERY);

export function parse(ctx: ParseContext): undefined | false | null | number {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = cursor + messageLength(buffer, cursor);
    const idx = cursor + 5;
    const result = buffer[idx];
    if (idx === endPosition - 1) {
        ctx.cursor = endPosition;
        return result;
    }
    return null;
}
