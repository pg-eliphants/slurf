/* done
NoticeResponse (B) #
Byte1('N')
Identifies the message as a notice.

Int32
Length of message contents in bytes, including self.

The message body consists of one or more identified fields, followed by a zero byte as a terminator. Fields can appear in any order. For each field there is the following:

Byte1
A code identifying the field type; if zero, this is the message terminator and no string follows. The presently defined field types are listed in Section 55.8. Since more field types might be added in future, frontends should silently ignore fields of unrecognized type.

String
The field value.
*/
import { MSG_NOT, MSG_UNDECIDED, NOTICE_RESPONSE, noticationsTemplate } from './constants';
import { ParseContext, Notifications } from './types';
import { createMatcher, messageLength } from './helper';

export const match = createMatcher(NOTICE_RESPONSE);

export function parse(ctx: ParseContext): null | undefined | false | Notifications {
    const { buffer, cursor, txtDecoder } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = cursor + messageLength(buffer, cursor);
    const result = { ...noticationsTemplate };
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
        ctx.cursor = endPosition;
        return result;
    }
    return null;
}
