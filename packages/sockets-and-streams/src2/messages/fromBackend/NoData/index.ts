/* done
NoData (B) 
Byte1('n')
Identifies the message as a no-data indicator.

Int32(4)
Length of message contents in bytes, including self.
*/

import ReadableByteStream from "../../../utils/ReadableByteStream";
import { MSG_NOT, MSG_UNDECIDED, NO_DATA } from "../constants";
import { match, messageLength } from "../helper";

export type NoData = {
    type: 'no-data';
}

export const NO_DATA_TYPE: NoData['type'] = 'no-data';

export function parse(ctx: ReadableByteStream): null | undefined | NoData | false {
    const { buffer, cursor } = ctx;
    const matched = match(NO_DATA, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    if (len !== 5) {
        return null;
    }
    ctx.advanceCursor(len);
    return {
        type: NO_DATA_TYPE,
    }
}
