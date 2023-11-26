import { MSG_IS, MSG_NOT, MSG_UNDECIDED } from '../constants';
import { AUTH_CLASS } from './constants';
import { ParseContext } from './types';
import { MessageState } from '../types';

export function matcherLength() {
    return 9; // number of bytes
}
export function messageLength(bin: Uint8Array, start: number) {
    return 9;
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (len < messageLength(bin, start)) {
        // partial or is not this message
        if (len >= 1) {
            if (bin[start] !== AUTH_CLASS) {
                return MSG_NOT;
            }
        }
        if (len >= 5) {
            if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 8)) {
                return MSG_NOT;
            }
        }
        return MSG_UNDECIDED;
    }
    if (
        bin[start] === AUTH_CLASS &&
        bin[start + 1] === 0 &&
        bin[start + 2] === 0 &&
        bin[start + 3] === 0 &&
        bin[start + 4] === 8 &&
        bin[start + 5] === 0 &&
        bin[start + 6] === 0 &&
        bin[start + 7] === 0 &&
        bin[start + 8] === 0
    ) {
        return MSG_IS;
    }
    return MSG_NOT;
}

export function parseMessage(ctx: ParseContext): undefined | boolean {
    const matched = match(ctx.buffer, ctx.cursor);
    if (matched === MSG_IS) {
        return true;
    } else if (matched === MSG_NOT) {
        return false;
    }
    return undefined;
}
