// done
import { ERROR, MSG_NOT, MSG_UNDECIDED } from '../constants';
import { noticeAndErrorTemplate } from './constants';

import { ErrorAndNotices, NoticeAndErrorFields, PGErrorResponse, PGNoticeResponse } from './types';
import { messageLength, match } from '../helper';
import ReadableByteStream from '../../../utils/ReadableByteStream';

/*
    ErrorResponse (B) 
        Byte1('E')
        Identifies the message as an error.

         Int32
        Length of message contents in bytes, including self.

        The message body consists of one or more identified fields,
         followed by a zero byte as a terminator. Fields can appear in any order. For each field there is the following:

(repeat)
        Byte1
        A code identifying the field type; if zero, this is the message terminator and no string follows.
         The presently defined field types are listed in Section 55.8. Since more field types might be added in future, 
         frontends should silently ignore fields of unrecognized type.

        String
        The field value.
*/

function parseFields(buffer: Uint8Array, cursor: number, decoder: TextDecoder, len: number): null | ErrorAndNotices {
    const endPosition = len + cursor;
    const fields = { ...noticeAndErrorTemplate };
    for (let pos = cursor + 5; pos < endPosition; ) {
        const type = String.fromCharCode(buffer[pos]) as NoticeAndErrorFields | '\x00';
        if (type === '\x00') {
            // termination
            if (pos === endPosition - 1) {
                return fields;
            }
            break; // go and return null
        }
        const idx = buffer.indexOf(0, pos + 1);
        const str = decoder.decode(buffer.slice(pos + 1, idx));
        fields[type] = str;
        pos = idx + 1;
    }
    // this is not good
    return null;
}
export function parseError(
    readable: ReadableByteStream,
    txtDecoder: TextDecoder
): false | null | undefined | PGErrorResponse {
    const { buffer, cursor } = readable;
    const matched = match(ERROR, buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    if (matched === MSG_NOT) {
        return false;
    }
    const len = messageLength(buffer, cursor);
    const response = parseFields(buffer, cursor, txtDecoder, len);
    if (response === null) {
        return null;
    }
    readable.advanceCursor(len); // advance cursor
    return { type: 'pg.E', pl: response };
}

export function parseNotice(
    readable: ReadableByteStream,
    txtDecoder: TextDecoder
): false | null | undefined | PGNoticeResponse {
    const { buffer, cursor } = readable;
    const matched = match(ERROR, buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    if (matched === MSG_NOT) {
        return false;
    }
    const len = messageLength(buffer, cursor);
    const response = parseFields(buffer, cursor, txtDecoder, len);
    if (response === null) {
        return null;
    }
    readable.advanceCursor(len); // advance cursor
    return { type: 'pg.N', pl: response };
}
