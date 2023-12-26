import type { MessageState, Notifications } from '../types';

export const AUTH_CLASS = 82; // 'R' Authentication message
export const PARAM_STATUS = 83; // 'S' connection parameter
export const READY_4_QUERY = 90; // 'Z' ready for query
export const BACKEND_KEY_DATA = 75; // 'K' cancellation key data
export const ERROR = 69; // 'E' Error Response
export const NEGOTIATE_PROTOCOL = 118; // 'v' NegotiateProtocolVersion (B)
export const NO_DATA = 110; // 'n' NoData(B)
export const NOTICE_RESPONSE = 78; // 'N' NoticeResponse
export const PARSE_COMPLETE = 49; // '1' Parse complete
export const PORTAL_SUSPEND = 115; // 's' Portal suspend

export const MSG_UNDECIDED: MessageState = 'undec';
export const MSG_NOT: MessageState = 'not';
export const MSG_IS: MessageState = 'is';
export const MSG_ERROR: MessageState = 'error';

export const noticationsTemplate: Notifications = {
    S: '',
    V: '',
    C: '',
    M: '',
    D: '',
    H: '',
    P: '',
    p: '',
    q: '',
    W: '',
    s: '',
    t: '',
    c: '',
    d: '',
    n: '',
    F: '',
    L: '',
    R: ''
};
/*
todo: finish this template
const ParameterStatusTemplate = {
  server_version:'',
  server_encoding:'',
  client_encoding: '',
  application_name

}
server_version, server_encoding, client_encoding, application_name, default_transaction_read_only, in_hot_standby, is_superuser,
session_authorization, DateStyle, IntervalStyle, TimeZone, integer_date-
times, and standard_conforming_strings. (server_encoding, TimeZone, and
integer_datetimes were not reported by releases before 8.0; standard_conform-
ing_strings was not reported by releases before 8.1; IntervalStyle was not reported
by releases before 8.4; application_name was not reported by releases before 9.0; de-
fault_transaction_read_only and in_hot_standby were not reported by releases be-
fore 14.) Note that server_version, server_encoding and integer_datetimes are
pseudo-parameters
*/
