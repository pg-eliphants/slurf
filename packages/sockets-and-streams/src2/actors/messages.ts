import type { PGErrorResponse, PGNoticeResponse } from '../messages/fromBackend/ErrorAndNoticeResponse/types';
import { NegotiateProtocolResult } from '../messages/fromBackend/NegotiateProtocol';
import { SelectedMessages } from '../messages/fromBackend/types';
import ReadableByteStream from '../utils/ReadableByteStream';

export type NetworkData = {
    type: 'data';
    pl: Uint8Array;
};

export type NetworkTimeout = {
    type: 'net-timeout';
    ts: number;
};

export type NetworkClose = {
    type: 'net-close';
};

export type NetworkError = {
    type: 'net-error';
    pl: string[];
};

//  Although the connect happens in the supervisor
//      the socket has the callback for 'lookup' message
export type LookUpError = {
    type: 'net-lookup-error';
    address: string;
    family: string | number;
    host: string;
    err: Error;
};

export type NetworkEnded = {
    type: 'net-ended';
};

type NetworkFinnish = {
    type: 'net-finnish';
};

type NetworkConnect = {
    type: 'net-connect';
};

type NetworkResume = {
    type: 'net-resume';
};

// END socket lifecycle messages
// END socket lifecycle messages
// END socket lifecycle messages

export type UpgradeToSSL = {
    type: 'ssl';
};

export type EndConnection = {
    type: 'end';
};

export type SessionInfoExchangeEnd = {
    type: 'session-info-exchnage-end';
    pl: ReadableByteStream;
};

export type InformationalTokenMessage = {
    type: 'info-token';
    pl: SelectedMessages[];
};

export type BufferStuffingAttack = {
    type: 'buffer-stuffing';
    pl: ReadableByteStream;
};

export type MangledData = {
    type: 'mangled';
    pl: ReadableByteStream;
};

export type PasswordMissing = {
    type: 'password-not-provided';
};

export type NegotiateProtocolVersion = {
    type: 'negotiate-protocol-version';
    pl: NegotiateProtocolResult;
};

export type BootPhaseEnded = {
    type: 'boot-end';
    pl: ReadableByteStream;
};

export type AuthPhaseEnded = {
    type: 'auth-end';
    pl: ReadableByteStream;
};

export type DataReceivedWhenPaused = {
    type: 'paused-data';
};

export type OODAuth = {
    type: 'ood-auth';
    pl: ReadableByteStream;
};

export type OODSessionInfo = {
    type: 'ood-session-info';
    pl: ReadableByteStream;
};

export type ErrorResponse = {
    type: 'pg.E';
    pl: PGErrorResponse;
};

export type NoticeResponse = {
    type: 'pg.N';
    pl: PGNoticeResponse;
};
