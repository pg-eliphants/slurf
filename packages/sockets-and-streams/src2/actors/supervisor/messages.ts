import type { PGErrorResponse, PGNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse/types';
import ReadableByteStream from '../../utils/ReadableByteStream';
import { Item } from '../../utils/list';
import Enqueue from '../Enqueue';
import SocketActor from '../socket';
import { SocketControlMsgs } from '../socket/messages';
import type { Pool, PoolFirstResidence } from './types';
import {
    SessionInfoExchangeEnd as _SessionInfoExchangeEnd,
    NetworkError,
    NetworkClose,
    LookUpError,
    NetworkTimeOut,
    EndConnection as _EndConnection
} from '../messages';
import type { NegotiateProtocolResult } from '../../messages/fromBackend/NegotiateProtocol';

export type SocketOriginFragmenet = {
    socketActor: Enqueue<SocketControlMsgs>;
};

export type PoolPayloadFragment = {
    wsa: Item<SocketActor>;
    currentPool: Pool;
    finalPool: PoolFirstResidence;
    poolPlacementTime: number;
};

// network lifecycle messages
// network lifecycle messages
// network lifecycle messages

export type SVNetworkClose = SocketOriginFragmenet & PoolPayloadFragment & NetworkClose;
export type SVNetworkError = SocketOriginFragmenet & NetworkError;
export type SVLookUpError = SocketOriginFragmenet & PoolPayloadFragment & LookUpError;
export type SVTimeout = SocketOriginFragmenet & PoolPayloadFragment & NetworkTimeOut;

export type BootPhaseEnded = SocketOriginFragmenet & {
    type: 'boot-end';
    pl: ReadableByteStream;
};

export type AuthPhaseEnded = SocketOriginFragmenet & {
    type: 'auth-end';
    pl: ReadableByteStream;
};

export type DataReceivedWhenPaused = SocketOriginFragmenet & {
    type: 'paused-data';
};

export type ErrorResponse = PGErrorResponse & SocketOriginFragmenet;

export type NoticeResponse = PGNoticeResponse & SocketOriginFragmenet;

export type MangledData = SocketOriginFragmenet & {
    type: 'mangled';
    pl: ReadableByteStream;
};

export type BufferStuffingAttack = SocketOriginFragmenet & {
    type: 'buffer-stuffing';
    pl: ReadableByteStream;
};

export type SVUpgradeToSSL = SocketOriginFragmenet & {
    type: 'ssl';
};

export type NoAuthData = SocketOriginFragmenet & {
    type: 'non-auth-data';
    pl: ReadableByteStream;
};

export type NoQ4Data = SocketOriginFragmenet & {
    type: 'non-q4-data';
    pl: ReadableByteStream;
};

export type SVNegotiateProtocolVersion = SocketOriginFragmenet & {
    type: 'negotiate-protocol';
    pl: NegotiateProtocolResult;
};

export type PasswordMissing = SocketOriginFragmenet & {
    type: 'password-not-provided';
};

export type EndConnection = _EndConnection & SocketOriginFragmenet;
export type SessionInfoExchangeEnd = _SessionInfoExchangeEnd & SocketOriginFragmenet & PoolPayloadFragment;

export type SuperVisorControlMsgs =
    | SVNetworkError
    | SVNetworkClose
    | SVLookUpError
    | SVTimeout
    | SVNegotiateProtocolVersion
    | BootPhaseEnded
    | AuthPhaseEnded
    | ErrorResponse
    | NoticeResponse
    | DataReceivedWhenPaused
    | MangledData
    | BufferStuffingAttack
    | SVUpgradeToSSL
    | PasswordMissing
    | EndConnection
    | NoAuthData
    | NoQ4Data
    | SessionInfoExchangeEnd;
