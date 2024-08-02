/*
done
PortalSuspended (B) 
Byte1('s')
Identifies the message as a portal-suspended indicator. Note this only appears if an Execute message's row-count limit was reached.

Int32(4)
Length of message contents in bytes, including self.
*/

import ReadableByteStream from '../../../utils/ReadableByteStream';
import { MSG_NOT, MSG_UNDECIDED, PORTAL_SUSPEND } from '../constants';
import { match, messageLength } from '../helper';

export type PortalSuspend = {
    type: 'portal-susp';
};

export const PORTAL_SUSPEND_TYPE: PortalSuspend['type'] = 'portal-susp';

export function parse(ctx: ReadableByteStream): null | undefined | false | PortalSuspend {
    const { buffer, cursor } = ctx;
    const matched = match(PORTAL_SUSPEND, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const endPosition = cursor + len;
    if (endPosition !== cursor + 5) {
        return null;
    }
    ctx.advanceCursor(len);

    return { type: PORTAL_SUSPEND_TYPE };
}
