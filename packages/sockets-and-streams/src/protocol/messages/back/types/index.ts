import { MessageState } from '../../types';
export type BackEndMessageTypes = 'AuthenticationOk';

export type MatcherLength = () => number;
export type MessageLength = (bin: Uint8Array) => number;
export type IsMatch = (bin: Uint8Array, start: number) => MessageState;

export type ParseContext = {
    buffer: Uint8Array;
    cursor: number;
    txtDecoder: TextDecoder;
    current?: {
        currentMessage?: BackEndMessageTypes;
        matchLength: MatcherLength;
        msgLength: MessageLength;
        isMatch: IsMatch;
    };
};
