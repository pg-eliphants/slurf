import type { Authentication } from './Authentication';
import type { BackendKeyData } from './BackEndKeyData';
import type { NegotiateProtocolResult } from './NegotiateProtocol';
import type { ReadyForQueryResponse } from './ReadyForQuery';
import { PGErrorResponse, PGNoticeResponse } from './ErrorAndNoticeResponse/types';
import ReadableByteStream from '../../utils/ReadableByteStream';
import type { ParameterStatus } from './ParameterStatus';
export type MapTagToMessage = {
    82: Authentication;
    75: BackendKeyData;
    90: ReadyForQueryResponse;
    69: PGErrorResponse;
    78: PGNoticeResponse;
    118: NegotiateProtocolResult;
    83: ParameterStatus;
};

export type TagType = keyof MapTagToMessage;

export type SelectedMessages<T extends TagType = TagType> = MapTagToMessage[T];

export type GeneratorOfMessage<T extends TagType = TagType> = (
    readable: ReadableByteStream,
    decode: TextDecoder
) => MapTagToMessage[T] | null | undefined | false;

export type MapTagToGeneratorOfMessage<TKey extends TagType> = {
    [T in TKey]: GeneratorOfMessage<T>;
};

export type MessageState = 'undec' | 'is' | 'error' | 'not';
