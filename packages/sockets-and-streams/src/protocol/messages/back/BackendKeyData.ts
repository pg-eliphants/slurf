import { MSG_IS, MSG_NOT, MSG_UNDECIDED } from '../constants';
import { BACKEND_KEY_DATA } from './constants';
import { ParseContext } from './types';
import { MessageState } from '../types';

export type BackendKeyData = {
    pid: number;
    secret: number;
};

export function matcherLength() {
    return 1; // number of bytes
}
export function messageLength(bin: Uint8Array, _start: number) {
    return 13;
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (len < messageLength(bin, start)) {
        // partial or is not this message
        if (len >= 1) {
            if (bin[start] !== BACKEND_KEY_DATA) {
                return MSG_NOT;
            }
        }
        if (len >= 5) {
            if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 12)) {
                return MSG_NOT;
            }
        }
        return MSG_UNDECIDED;
    }
    if (
        bin[start] === BACKEND_KEY_DATA &&
        bin[start + 1] === 0 &&
        bin[start + 2] === 0 &&
        bin[start + 3] === 0 &&
        bin[start + 4] === 12
    ) {
        return MSG_IS;
    }
    return MSG_NOT;
}

export function parseMessage(ctx: ParseContext): undefined | false | BackendKeyData {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_IS) {
        return {
            pid:
                (buffer[cursor + 5] << 24) +
                (buffer[cursor + 6] << 16) +
                (buffer[cursor + 7] << 8) +
                buffer[cursor + 8],
            secret:
                (buffer[cursor + 9] << 24) +
                (buffer[cursor + 10] << 16) +
                (buffer[cursor + 11] << 8) +
                buffer[cursor + 12]
        };
    } else if (matched === MSG_NOT) {
        return false;
    }
    return undefined;
}
