import { SendingStatus } from './types';
export const SEND_STATUS_OK: SendingStatus = 'ok';
export const SEND_STATUS_BACKPRESSURE: SendingStatus = 'backpressure';
export const SEND_STATUS_CLOSED: SendingStatus = 'closed';
export const SEND_STATUS_ONLY_READ: SendingStatus = 'only-read';
export const SEND_STATUS_OK_WITH_BACKPRESSURE: SendingStatus = 'ok-but-backpressure';

export const NOTIFY = {
    PG_INITIALIZATION_COMPLETE: 0x01,
    ERROR_COULD_NOT_RESOLVE_HOST: 0x02,
    SOCKET_CLOSE_EVENT: 0x03,
    SOCKET_ERROR_EVENT: 0x04
};
