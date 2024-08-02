import { isErrorResponse, isNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse';
import { PGErrorResponse, PGNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse/types';
import { NegotiateProtocolResult, isNegotiateProtocolVersion } from '../../messages/fromBackend/NegotiateProtocol';

type InformationTokenFromQueryActor = PGErrorResponse | PGNoticeResponse | NegotiateProtocolResult;

export function isInformationalToken(u: any): u is InformationTokenFromQueryActor {
    return isErrorResponse(u) || isNoticeResponse(u) || isNegotiateProtocolVersion(u);
}
