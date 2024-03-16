import { Authentication, isAuthenticationToken } from '../../messages/fromBackend/Authentication';
import { isErrorResponse, isNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse';
import { PGErrorResponse, PGNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse/types';
import { NegotiateProtocolResult, isNegotiateProtocolVersion } from '../../messages/fromBackend/NegotiateProtocol';

type InformationTokenFromAuthActor = Authentication | PGErrorResponse | PGNoticeResponse | NegotiateProtocolResult;

export function isInformationalToken(u: any): u is InformationTokenFromAuthActor {
    return isAuthenticationToken(u) || isErrorResponse(u) || isNoticeResponse(u) || isNegotiateProtocolVersion(u);
}
