/*
EmptyQueryResponse (B) 
Byte1('I')
Identifies the message as a response to an empty query string. (This substitutes for CommandComplete.)

Int32(4)
Length of message contents in bytes, including self.
*/

import ReadableByteStream from '../../../utils/ReadableByteStream';
import { MSG_NOT, MSG_UNDECIDED, ROW_DESCRIPTION } from '../constants';
import { match, messageLength } from '../helper';

export type EmptyQueryResponse = {
    type: 'emptQr';
};

export const EMPTY_QUERY_RESPONSE_TYPE: EmptyQueryResponse['type'] = 'emptQr';

export function parse(ctx: ReadableByteStream): null | undefined | false | EmptyQueryResponse {
    const { buffer, cursor } = ctx;
    const matched = match(ROW_DESCRIPTION, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = messageLength(buffer, cursor) + cursor;
    if (endPosition === cursor + 5) {
        return { type: EMPTY_QUERY_RESPONSE_TYPE };
    }
    return null;
}
