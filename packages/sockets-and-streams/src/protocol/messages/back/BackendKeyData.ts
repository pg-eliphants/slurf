import { BACKEND_KEY_DATA, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState } from './types';
import { i32, matcherLength } from './helper';

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

export { matcherLength };

// function with no parameters (function.length === 0) means it returns a constant, this is by itself a signal
export function messageLength() {
    return 13;
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (bin[start] !== BACKEND_KEY_DATA) {
        return MSG_NOT;
    }
    if (
        len >= 5 &&
        false == (bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 12)
    ) {
        return MSG_NOT;
    }
    if (len < messageLength()) {
        return MSG_UNDECIDED;
    }
    return MSG_IS;
}

export function parse(ctx: ParseContext): undefined | false | BackendKeyData {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_IS) {
        ctx.cursor += messageLength();
        return {
            pid: i32(buffer, cursor + 5),
            secret: i32(buffer, 9)
        };
    } else if (matched === MSG_NOT) {
        return false;
    }
    return undefined;
}
