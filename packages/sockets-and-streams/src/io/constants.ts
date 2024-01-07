import { SendingStatus } from './types';
export const SEND_STATUS_OK: SendingStatus = 'ok';
export const SEND_STATUS_BACKPRESSURE: SendingStatus = 'backpressure';
export const SEND_STATUS_CLOSED: SendingStatus = 'closed';
export const SEND_STATUS_ONLY_READ: SendingStatus = 'only-read';
export const SEND_STATUS_OK_WITH_BACKPRESSURE: SendingStatus = 'ok-but-backpressure';
