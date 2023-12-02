import type { BackEndMessageTypes, MessageState } from '../types';

export const NotificationAndErrorFields = 'SVCMDHPpqWstcdnFLR';

export const AUTHENTICATION_OK: BackEndMessageTypes = 'AuthenticationOk';

export const AUTH_CLASS = 82; // 'R' Authentication message
export const PARAM_STATUS = 83; // 'S' connection parameter
export const READY_4_QUERY = 90; // 'Z' ready for query
export const BACKEND_KEY_DATA = 75; // 'K' cancellation key data
export const ERROR = 69; // 'E' Error Response

export const MSG_UNDECIDED: MessageState = 'undec';
export const MSG_NOT: MessageState = 'not';
export const MSG_IS: MessageState = 'is';
export const MSG_ERROR: MessageState = 'error';
