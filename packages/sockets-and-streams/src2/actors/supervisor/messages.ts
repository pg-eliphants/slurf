import { Item } from '../../utils/list';
import Enqueue from '../Enqueue';
import SocketActor from '../socket';
import { SocketControlMsgs } from '../socket/messages';
import type { Pool, PoolFirstResidence } from './types';
import {
    SessionInfoExchangeEnd as _SessionInfoExchangeEnd,
    NetworkError as _NetworkError,
    NetworkClose as _NetworkClose,
    LookUpError as _LookUpError,
    NetworkTimeout as _NetworkTimeout,
    EndConnection as _EndConnection,
    PasswordMissing as _PasswordMissing,
    MangledData as _MangledData,
    NegotiateProtocolVersion as _NegotiateProtocolVersion,
    BootPhaseEnded as _BootPhaseEnded,
    AuthPhaseEnded as _AuthPhaseEnded,
    DataReceivedWhenPaused as _DataReceivedWhenPaused,
    UpgradeToSSL as _UpgradeToSSL,
    OODAuth as _OODAuth,
    OODSessionInfo as _OODSessionInfo,
    InformationalTokenMessage as _InformationalTokenMessage,
    BufferStuffingAttack as _BufferStuffingAttack,
    ErrorResponse as _ErrorResponse,
    NoticeResponse as _NoticeResponse, 
    QueryInitDone as _QueryInitDone
} from '../messages';
import Query from '../query';

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

export type NetworkClose = SocketOriginFragmenet & PoolPayloadFragment & _NetworkClose;
export type NetworkError = SocketOriginFragmenet & _NetworkError;
export type LookUpError = SocketOriginFragmenet & PoolPayloadFragment & _LookUpError;
export type Timeout = SocketOriginFragmenet & PoolPayloadFragment & _NetworkTimeout;

export type BootPhaseEnded = SocketOriginFragmenet & _BootPhaseEnded;

export type AuthPhaseEnded = SocketOriginFragmenet & _AuthPhaseEnded;

export type DataReceivedWhenPaused = SocketOriginFragmenet & _DataReceivedWhenPaused;

export type ErrorResponse = _ErrorResponse & SocketOriginFragmenet;

export type NoticeResponse = _NoticeResponse & SocketOriginFragmenet;

export type MangledData = SocketOriginFragmenet & _MangledData;

export type BufferStuffingAttack = SocketOriginFragmenet & _BufferStuffingAttack;

export type UpgradeToSSL = SocketOriginFragmenet & _UpgradeToSSL;

export type OODAuth = SocketOriginFragmenet & _OODAuth;

export type OODSessionInfo = SocketOriginFragmenet & _OODSessionInfo;

export type NegotiateProtocolVersion = SocketOriginFragmenet & _NegotiateProtocolVersion;

export type PasswordMissing = SocketOriginFragmenet & _PasswordMissing;

export type EndConnection = _EndConnection & SocketOriginFragmenet;
export type SessionInfoExchangeEnd = _SessionInfoExchangeEnd & SocketOriginFragmenet;

export type InformationalTokenMessage = SocketOriginFragmenet & _InformationalTokenMessage;

export type QueryInitDone = PoolPayloadFragment & SocketOriginFragmenet & _QueryInitDone & { query: Query }

export type SuperVisorControlMsgs =
    | NetworkError
    | NetworkClose
    | LookUpError
    | Timeout
    | NegotiateProtocolVersion
    | BootPhaseEnded
    | AuthPhaseEnded
    | ErrorResponse
    | NoticeResponse
    | DataReceivedWhenPaused
    | MangledData
    | BufferStuffingAttack
    | UpgradeToSSL
    | PasswordMissing
    | EndConnection
    | OODAuth
    | OODSessionInfo
    | SessionInfoExchangeEnd
    | InformationalTokenMessage
    | QueryInitDone;
