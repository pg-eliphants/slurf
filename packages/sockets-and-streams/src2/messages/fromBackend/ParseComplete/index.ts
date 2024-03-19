/*
ParseComplete (B) #
Byte1('1')
Identifies the message as a Parse-complete indicator.

Int32(4)
Length of message contents in bytes, including self.
*/

import ReadableByteStream from '../../../utils/ReadableByteStream';
import { MSG_NOT, MSG_UNDECIDED, PARSE_COMPLETE } from '../constants';
import { match, messageLength } from '../helper';

export type ParseComplete = {
    type: 'prs-c';
};

export const PARSE_COMPLETE_TYPE: ParseComplete['type'] = 'prs-c';

export function parse(ctx: ReadableByteStream): null | undefined | false | ParseComplete {
    const { buffer, cursor } = ctx;
    const matched = match(PARSE_COMPLETE, buffer, cursor);
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
    return { type: PARSE_COMPLETE_TYPE };
}
