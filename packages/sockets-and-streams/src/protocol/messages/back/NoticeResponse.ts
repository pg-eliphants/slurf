/* done
NoticeResponse (B) #
Byte1('N')
Identifies the message as a notice.

Int32
Length of message contents in bytes, including self.

The message body consists of one or more identified fields, followed by a zero byte as a terminator.
 Fields can appear in any order. For each field there is the following:

Byte1
A code identifying the field type; if zero, this is the message terminator and no string follows.
The presently defined field types are listed in Section 55.8. Since more field types might be added in future,
 frontends should silently ignore fields of unrecognized type.

String
The field value.
*/
import { MSG_UNDECIDED, noticeAndErrorTemplate } from './constants';
import { ErrorAndNotices } from './types';
import { match, messageLength } from './helper';
import ReadableStream from '../../../io/ReadableByteStream';

export function parse(ctx: ReadableStream, txtDecoder: TextDecoder): null | undefined | ErrorAndNotices {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const endPosition = cursor + len;
    const result = { ...noticeAndErrorTemplate };
    let pos = cursor + 5;
    while (pos < endPosition) {
        const code = String.fromCharCode(buffer[pos]);
        if (code === '\x00') {
            break;
        }
        if (!(code in result)) {
            return null; // error if code is not found
        }
        const idx = buffer.indexOf(0, pos + 1);
        if (idx < 0) {
            return null;
        }
        result[code] = txtDecoder.decode(buffer.slice(pos + 1, idx));
        pos = idx + 1;
    }
    if (pos === endPosition - 1) {
        ctx.advanceCursor(len);
        return result;
    }
    return null;
}
