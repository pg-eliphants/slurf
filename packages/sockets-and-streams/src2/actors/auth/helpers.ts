import { Authentication, isAuthenticationToken } from '../../messages/fromBackend/Authentication';
import { isErrorResponse, isNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse';
import { PGErrorResponse, PGNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse/types';
import { NegotiateProtocolResult, isNegotiateProtocolVersion } from '../../messages/fromBackend/NegotiateProtocol';
import { SocketControlMsgs } from '../socket/messages';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import Enqueue from '../Enqueue';
import { INFO_TOKENS } from '../supervisor/constants';

type InformationTokenFromAuthActor = Authentication | PGErrorResponse | PGNoticeResponse | NegotiateProtocolResult;

function isInformationalToken(u: any): u is InformationTokenFromAuthActor {
    return isAuthenticationToken(u) || isErrorResponse(u) || isNoticeResponse(u) || isNegotiateProtocolVersion(u);
}

export function sendToSuperVisor(
    supervisor: Enqueue<SuperVisorControlMsgs>,
    actor: Enqueue<SocketControlMsgs>,
    tokens: InformationTokenFromAuthActor[]
) {
    const sendTokens = tokens.filter(isInformationalToken);
    supervisor.enqueue({ type: INFO_TOKENS, pl: sendTokens, socketActor: actor });
}
