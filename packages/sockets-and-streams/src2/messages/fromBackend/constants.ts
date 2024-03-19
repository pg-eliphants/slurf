import { MapTagToGeneratorOfMessage, MessageState } from './types';
import { parse as parseAuthentication } from './Authentication';
import { parseError, parseNotice } from './ErrorAndNoticeResponse';

import { parse as parseNegotiateVersion } from './NegotiateProtocol';
import { parse as parseParameterStatus } from './ParameterStatus';
import { parse as parseReady4Query } from './ReadyForQuery';
import { parse as parseBackendKeyData } from './BackEndKeyData';
import { parse as parseBindComplete } from './BindComplete';
import { parse as parseNoData } from './NoData';
import { parse as parseComplete } from './ParseComplete';
import { parse as parseCloseComplete } from './CloseComplete';
import { parse as parseCommandComplete } from './CommandComplete';
import { parse as parseDataRow } from './DataRow';
import { parse as parsePortalSuspend } from './PortalSuspend';
import { parse as parseParameterDescription } from './ParameterDescription';
import { parse as parseRowDescription } from './RowDescription';
import { parse as parseEmptyQueryResponse } from './EmptyQueryResponse';

export type ErrorResponseTag = 69; //
export type NoticeResponseTag = 78; //

export type AuthenticationTag = 82; //
export type NegotiateProtocolVersionTag = 118; //
export type BackendKeyDataTag = 75; //

export type ParameterStatusTag = 83; //
export type ReadyForQueryTag = 90; //
export type NoDataTag = 110; //
export type ParsecompleteTag = 49; //
export type PortalSuspendTag = 115;
export type BindCompleteTag = 50; //
export type CloseCompleteTag = 51; //
export type CommandCompleteTag = 67;
export type DataRowTag = 68; //
export type ParameterDescriptionTag = 116;
export type RowDescriptionTag = 84;
export type EmptyQueryResponseTag = 73;

export type MsgFromBackend =
    | PortalSuspendTag
    | ParsecompleteTag
    | NoDataTag
    | NegotiateProtocolVersionTag
    | NoticeResponseTag
    | ErrorResponseTag
    | AuthenticationTag
    | ParameterStatusTag
    | ReadyForQueryTag
    | BackendKeyDataTag
    | BindCompleteTag
    | CloseCompleteTag
    | CommandCompleteTag
    | DataRowTag
    | ParameterDescriptionTag
    | RowDescriptionTag;

//
export const AUTH_CLASS: AuthenticationTag = 82; // 'R' Authentication message
export const PARAM_STATUS: ParameterStatusTag = 83; // 'S' connection parameter
export const READY_4_QUERY: ReadyForQueryTag = 90; // 'Z' ready for query
export const BACKEND_KEY_DATA: BackendKeyDataTag = 75; // 'K' cancellation key data
export const ERROR: ErrorResponseTag = 69; // 'E' Error Response
export const NEGOTIATE: NegotiateProtocolVersionTag = 118; // 'v' NegotiateProtocolVersion (B)
export const NO_DATA: NoDataTag = 110; // 'n' NoData(B)
export const NOTICE: NoticeResponseTag = 78; // 'N' NoticeResponse
export const PARSE_COMPLETE: ParsecompleteTag = 49; // '1' Parse complete
export const PORTAL_SUSPEND: PortalSuspendTag = 115; // 's' Portal suspend
export const BIND_COMPLETE: BindCompleteTag = 50; // '2' Bind complete
export const CLOSE_COMPLETE: CloseCompleteTag = 51; // '3' Close Complete
export const COMMAND_COMPLETE: CommandCompleteTag = 67; // 'C', 'Command Complete
export const COPY_DATA = 100; // 'd'
export const COPY_DONE = 99; // 'c'
export const COPY_IN_RESPONSE = 71; // 'G' Copy In response
export const COPY_OUT_RESPONSE = 72; // 'H' Copy out Response
export const COPY_BOTH_RESPONSE = 87; // 'W' Copy Both Response
export const DATA_ROW: DataRowTag = 68; // 'D'
export const EMPTY_QUERY_RESPONSE: EmptyQueryResponseTag = 73; // 'I'
export const NOTIFICATION_RESPONSE = 65; // 'A'
export const PARAMETER_DESCRIPTION: ParameterDescriptionTag = 116; // 't'
export const ROW_DESCRIPTION: RowDescriptionTag = 84; // 'T'

export const MSG_UNDECIDED: MessageState = 'undec';
export const MSG_IS: MessageState = 'is';
export const MSG_NOT: MessageState = 'not';
export const MSG_ERROR: MessageState = 'error';

export const mapMsgTagToParser: MapTagToGeneratorOfMessage<
    | AuthenticationTag
    | ErrorResponseTag
    | NegotiateProtocolVersionTag
    | NoticeResponseTag
    | ParameterStatusTag
    | ReadyForQueryTag
    | BackendKeyDataTag
    | BindCompleteTag
    | NoDataTag
    | ParsecompleteTag
    | CloseCompleteTag
    | CommandCompleteTag
    | DataRowTag
    | PortalSuspendTag
    | ParameterDescriptionTag
    | RowDescriptionTag
    | EmptyQueryResponseTag
> = {
    82: parseAuthentication,
    69: parseError,
    118: parseNegotiateVersion,
    78: parseNotice,
    83: parseParameterStatus,
    90: parseReady4Query,
    75: parseBackendKeyData,
    50: parseBindComplete,
    110: parseNoData,
    49: parseComplete,
    51: parseCloseComplete,
    67: parseCommandComplete,
    68: parseDataRow,
    115: parsePortalSuspend,
    116: parseParameterDescription,
    84: parseRowDescription,
    73: parseEmptyQueryResponse
};
