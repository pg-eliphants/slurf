import { ERROR, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState, Notifications } from './types';
import { i32 } from './helper';
import { noticationsTemplate } from './constants';
/*
    ErrorResponse (B) 
    Byte1('E')
    Identifies the message as an error.

    Int32
    Length of message contents in bytes, including self.

    The message body consists of one or more identified fields, followed by a zero byte as a terminator. Fields can appear in any order. For each field there is the following:

    Byte1
    A code identifying the field type; if zero, this is the message terminator and no string follows. The presently defined field types are listed in Section 55.8. Since more field types might be added in future, frontends should silently ignore fields of unrecognized type.

    String
    The field value.
*/
export function matcherLength() {
    return 1; // number of bytes
}
export function messageLength(bin: Uint8Array, cursor: number) {
    return i32(bin, cursor + 1) + 1;
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (bin[start] !== ERROR) {
        return MSG_NOT;
    }
    if (len < 5) {
        return MSG_UNDECIDED;
    }
    const msgLen = messageLength(bin, start);
    if (len < msgLen) {
        return MSG_UNDECIDED;
    }
    return MSG_IS;
}

export function parse(ctx: ParseContext): null | undefined | false | Notifications {
    const { buffer, cursor, txtDecoder } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const fields = { ...noticationsTemplate };
    for (let pos = cursor + 5; pos < len; ) {
        const type = String.fromCharCode(buffer[pos]);
        if (type === '\x00') {
            // termination
            ctx.cursor = pos + 1; // advance cursor
            return fields;
        }
        const idx = buffer.indexOf(0, pos + 1);
        const str = txtDecoder.decode(buffer.slice(pos + 1, idx));
        fields[type] = str;
        pos = idx + 1;
    }
    // this is not good
    return null;
}
