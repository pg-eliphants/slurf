/*
done
PortalSuspended (B) 
Byte1('s')
Identifies the message as a portal-suspended indicator. Note this only appears if an Execute message's row-count limit was reached.

Int32(4)
Length of message contents in bytes, including self.
*/
import { MSG_NOT, MSG_UNDECIDED, PORTAL_SUSPEND } from './constants';
import { ParseContext, Notifications } from './types';
import { createMatcher, messageLength } from './helper';

export const match = createMatcher(PORTAL_SUSPEND);

export function parse(ctx: ParseContext): null | undefined | boolean {
    const { buffer, cursor, txtDecoder } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = cursor + messageLength(buffer, cursor);
    if (endPosition !== cursor + 5) {
        return null;
    }
    return true;
}
