export type MatcherLength = () => number;
export type MessageLength = (bin?: Uint8Array, cursor?: number) => number;
export type IsMatch = (bin: Uint8Array, start: number) => MessageState;
export type MessageState = 'undec' | 'is' | 'error';
import { mapKey2Parser } from './constants';

export type CopyResponse = {
    isText: boolean;
    numCol: number;
    formatCodes: number[];
};

export type NoticeAndErrorFields =
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

export type ErrorAndNotices = {
    [p in NoticeAndErrorFields]: string;
};

type Map2Parser = typeof mapKey2Parser;
export type LookupKeyParser = keyof Map2Parser;
export type parseType<T extends LookupKeyParser> = Map2Parser[T];
