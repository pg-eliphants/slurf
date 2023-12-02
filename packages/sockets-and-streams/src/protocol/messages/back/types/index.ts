export type BackEndMessageTypes = 'AuthenticationOk';

export type ParseContext = {
    buffer: Uint8Array;
    cursor: number;
    txtDecoder: TextDecoder;
};

export type MatcherLength = () => number;
export type MessageLength = (bin?: Uint8Array, cursor?: number) => number;
export type IsMatch = (bin: Uint8Array, start: number) => MessageState;
export type Parse<T> = (ctx: ParseContext) => null | false | undefined | T;
export type MessageState = 'undec' | 'is' | 'not' | 'error';
