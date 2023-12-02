/*
    ReadyForQuery (B) 
    Byte1('Z')
    Identifies the message type. ReadyForQuery is sent whenever the backend is ready for a new query cycle.

    Int32(5)
    Length of message contents in bytes, including self.

    Byte1
    Current backend transaction status indicator. Possible values are 'I' if idle (not in a transaction block); 'T' if in a transaction block; or 'E' if in a failed transaction block (queries will be rejected until block is ended).
*/
import { READY_4_QUERY, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState } from './types';

export function matcherLength() {
    return 1; // number of bytes
}
export function messageLength() {
    return 6;
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (bin[start] !== READY_4_QUERY) {
        return MSG_NOT;
    }
    if (len >= 5) {
        if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 5)) {
            return MSG_NOT;
        }
    }
    if (len < messageLength()) {
        return MSG_UNDECIDED;
    }
    if (
        bin[start] === READY_4_QUERY &&
        bin[start + 1] === 0 &&
        bin[start + 2] === 0 &&
        bin[start + 3] === 0 &&
        bin[start + 4] === 5
    ) {
        return MSG_IS;
    }
    return MSG_NOT;
}

export function parse(ctx: ParseContext): undefined | false | number {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_IS) {
        return buffer[cursor + 5];
    } else if (matched === MSG_NOT) {
        return false;
    }
    return undefined;
}
