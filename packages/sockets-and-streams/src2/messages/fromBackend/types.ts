import type { Authentication } from './Authentication';
import type { BackendKeyData } from './BackEndKeyData';
import type { NegotiateProtocolResult } from './NegotiateProtocol';
import type { ReadyForQueryResponse } from './ReadyForQuery';
import { PGErrorResponse, PGNoticeResponse } from './ErrorAndNoticeResponse/types';
import ReadableByteStream from '../../utils/ReadableByteStream';
import type { ParameterStatus } from './ParameterStatus';
import { BindComplete } from './BindComplete';
import { NoData } from './NoData';
import { ParseComplete } from './ParseComplete';
import { CloseComplete } from './CloseComplete';
import { CommandComplete } from './CommandComplete';
import { DataRow } from './DataRow';
import { PortalSuspend } from './PortalSuspend';
import { ParameterDescription } from './ParameterDescription';
import { RowDescription } from './RowDescription';
import { EmptyQueryResponse } from './EmptyQueryResponse';

export type MapTagToMessage = {
    82: Authentication;
    75: BackendKeyData;
    90: ReadyForQueryResponse;
    69: PGErrorResponse;
    78: PGNoticeResponse;
    118: NegotiateProtocolResult;
    83: ParameterStatus;
    50: BindComplete;
    110: NoData;
    49: ParseComplete;
    51: CloseComplete;
    67: CommandComplete;
    68: DataRow;
    115: PortalSuspend;
    116: ParameterDescription;
    84: RowDescription;
    73: EmptyQueryResponse;
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
