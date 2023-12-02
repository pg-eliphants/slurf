import { PARAM_STATUS, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState } from './types';
import { i32 } from './helper';

export type ParameterStatus = {
    name: string;
    value: string;
};

/*
    ParameterStatus (B) 
    Byte1('S')
    Identifies the message as a run-time parameter status report.

    Int32
    Length of message contents in bytes, including self.

    String
    The name of the run-time parameter being reported.

    String
    The current value of the parameter.
*/

export function matcherLength() {
    return 1; // number of bytes
}
export function messageLength(bin: Uint8Array, cursor: number) {
    return i32(bin, cursor + 1);
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (bin[start] !== PARAM_STATUS) {
        return MSG_NOT;
    }
    if (len < 5) {
        return MSG_UNDECIDED;
    }
    if (len < messageLength(bin, start)) {
        return MSG_UNDECIDED;
    }
    return MSG_IS;
}

export function parse(ctx: ParseContext): false | ParameterStatus | undefined {
    const matched = match(ctx.buffer, ctx.cursor);
    if (matched === MSG_NOT) {
        return false;
    } else if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    // parse the message
    const { buffer, cursor, txtDecoder } = ctx;

    const len = i32(buffer, cursor + 5);
    const split = buffer.indexOf(0, cursor + 9);
    const name = txtDecoder.decode(buffer.slice(9, split));
    const value = txtDecoder.decode(buffer.slice(split + 1, len));
    return { name, value };
}
