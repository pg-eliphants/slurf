import type { MessageState, Notifications } from '../types';

export const AUTH_CLASS = 82; // 'R' Authentication message
export const PARAM_STATUS = 83; // 'S' connection parameter
export const READY_4_QUERY = 90; // 'Z' ready for query
export const BACKEND_KEY_DATA = 75; // 'K' cancellation key data
export const ERROR = 69; // 'E' Error Response
export const NEGOTIATE_PROTOCOL = 118; // 'v' NegotiateProtocolVersion (B)
export const NO_DATA = 110; // 'n' NoData(B)
export const NOTICE_RESPONSE = 78; // 'n' NoticeResponse

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
