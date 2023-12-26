// done
import { ERROR, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, Notifications } from './types';
import { messageLength, createMatcher, matcherLength } from './helper';
import { noticationsTemplate } from './constants';

/*
    ErrorResponse (B) 
    Byte1('E')
    Identifies the message as an error.

    Int32
    Length of message contents in bytes, including self.

    The message body consists of one or more identified fields, followed by a zero byte as a terminator. Fields can appear in any order. For each field there is the following:

(repeat)
    Byte1
    A code identifying the field type; if zero, this is the message terminator and no string follows. The presently defined field types are listed in Section 55.8. Since more field types might be added in future, frontends should silently ignore fields of unrecognized type.

    String
    The field value.
*/

export const match = createMatcher(ERROR);

export function parse(ctx: ParseContext): null | undefined | false | Notifications {
    const { buffer, cursor, txtDecoder } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = messageLength(buffer, cursor) + cursor;
    const fields = { ...noticationsTemplate };
    for (let pos = cursor + 5; pos < endPosition; ) {
        const type = String.fromCharCode(buffer[pos]);
        if (type === '\x00') {
            // termination
            if (pos === endPosition - 1) {
                ctx.cursor = pos + 1; // advance cursor
                return fields;
            }
            break; // go and return null
        }
        const idx = buffer.indexOf(0, pos + 1);
        const str = txtDecoder.decode(buffer.slice(pos + 1, idx));
        fields[type] = str;
        pos = idx + 1;
    }
    // this is not good
    return null;
}
