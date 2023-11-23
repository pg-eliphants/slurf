import { MSG_IS, MSG_NOT, MSG_UNDECIDED } from '../constants';
import { PARAM_STATUS } from './constants';
import { ParseContext } from './types';
import { MessageState } from '../types';

export type ParameterStatus = {
    name: string;
    value: string;
}

export function matcherLength() {
    return 1; // number of bytes
}
export function messageLength(bin: Uint8Array, cursor: number) {
    return (
        (bin[cursor] << 24)
        +
        (bin[cursor+1] << 16)
        +
        (bin[cursor+2] << 8)
        +
        bin[cursor+3]
    ) + 1;
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (len >= 1 && bin[start] !== PARAM_STATUS){
        return MSG_NOT;
    }
    if (len < messageLength(bin, start)) {
        if (len >= 1) {
            if (bin[start] !== PARAM_STATUS) {
                return MSG_NOT;
            }
        }
        return MSG_UNDECIDED;
    }
    return MSG_IS;
}

export function parseMessage(ctx: ParseContext): boolean | ParameterStatus | undefined {
    const matched = match(ctx.buffer, ctx.cursor);
    if (matched === MSG_NOT){
        return false
    }
    else if (matched === MSG_UNDECIDED){
        return undefined;
    }
    // parse the message
    const { buffer, cursor, txtDecoder } = ctx;

    const len = (buffer[cursor + 5] << 24)
    +
    (buffer[cursor+6] << 16)
    +
    (buffer[cursor+7] << 8)
    +
    buffer[cursor+8];
    const split = buffer.indexOf(0, cursor + 9);
    const name = txtDecoder.decode(buffer.slice(9, split));
    const value = txtDecoder.decode(buffer.slice(split + 1, len));
    return { name, value };
}
