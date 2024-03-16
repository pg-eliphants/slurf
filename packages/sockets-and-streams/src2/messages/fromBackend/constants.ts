import { MapTagToGeneratorOfMessage, MessageState } from './types';
import { parse as parseAuthentication } from './Authentication';
import { parseError, parseNotice } from './ErrorAndNoticeResponse';

import { parse as parseNegotiateVersion } from './NegotiateProtocol';

export type AuthenticationTag = 82;
export type ParameterStatusTag = 83;
export type ReadyForQueryTag = 90;
export type BackendKeyDataTag = 75;
export type ErrorResponseTag = 69;
export type NoticeResponseTag = 78;
export type NegotiateProtocolVersionTag = 118;
export type NoDataTag = 110;
export type ParsecompleteTag = 49;
export type PortalSuspendTag = 115;

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
    | BackendKeyDataTag;

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
export const BIND_COMPLETE = 50; // '2' Bind complete
export const CLOSE_COMPLETE = 51; // '3' Close Complete
export const COMMAND_COMPLETE = 67; // 'C'
export const COPY_DATA = 100; // 'd'
export const COPY_DONE = 99; // 'c'
export const COPY_IN_RESPONSE = 71; // 'G' Copy In response
export const COPY_OUT_RESPONSE = 72; // 'H' Copy out Response
export const COPY_BOTH_RESPONSE = 87; // 'W' Copy Both Response
export const DATA_ROW = 68; // 'D'
export const EMPTY_QUERY_RESPONSE = 73; // 'I'
export const NOTIFICATION_RESPONSE = 65; // 'A'
export const PARAMETER_DESCRIPTION = 116; // 't'
export const ROW_DESCRIPTION = 83; // 'T'

export const MSG_UNDECIDED: MessageState = 'undec';
export const MSG_IS: MessageState = 'is';
export const MSG_NOT: MessageState = 'not';
export const MSG_ERROR: MessageState = 'error';

export const mapMsgTagToParser: MapTagToGeneratorOfMessage<82 | 69 | 118 | 78> = {
    82: parseAuthentication,
    69: parseError,
    118: parseNegotiateVersion,
    78: parseNotice
};
