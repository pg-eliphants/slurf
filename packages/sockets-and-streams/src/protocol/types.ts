import type { SocketAttributes } from '../io/types';

export type ProtocolAttributes = {
    tag: string;
    meta: {
        // add more
        state: string;
        continue?: boolean; // the messages was/is being received partially
        currentMsgTyp?: string;
    };
    connection: SocketAttributes;
};

export type Fields =
    | 'S'
    | 'V'
    | 'C'
    | 'M'
    | 'D'
    | 'H'
    | 'P'
    | 'p'
    | 'q'
    | 'W'
    | 's'
    | 't'
    | 'c'
    | 'd'
    | 'n'
    | 'F'
    | 'L'
    | 'R';

export type ErrorResponse = {
    [T in Fields]?: string;
};

export type MemoryMaxExceeded = 'EMM';

export type MemoryErrors = MemoryMaxExceeded;
