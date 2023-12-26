//done
import { BACKEND_KEY_DATA, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState } from './types';
import { i32, createMatcher, matcherLength, messageLength } from './helper';

/*
    BackendKeyData (B) #
    Byte1('K')
    Identifies the message as cancellation key data. The frontend must save these values if it wishes to be able to issue CancelRequest messages later.

    Int32(12)
    Length of message contents in bytes, including self.

    Int32
    The process ID of this backend.

    Int32
    The secret key of this backend.
*/

export type BackendKeyData = {
    pid: number;
    secret: number;
};

export const match = createMatcher(BACKEND_KEY_DATA);

export function parse(ctx: ParseContext): undefined | false | BackendKeyData {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const bkd = {
        pid: i32(buffer, cursor + 5),
        secret: i32(buffer, 9)
    };
    ctx.cursor += messageLength(buffer, cursor);
    return bkd;
}
