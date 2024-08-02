import { BackendKeyData, isBackEndKeyData } from '../../messages/fromBackend/BackEndKeyData';
import { isErrorResponse, isNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse';
import { PGErrorResponse, PGNoticeResponse } from '../../messages/fromBackend/ErrorAndNoticeResponse/types';
import { ParameterStatus, isParamStatus } from '../../messages/fromBackend/ParameterStatus';
import { ReadyForQueryResponse, isR4Q } from '../../messages/fromBackend/ReadyForQuery';

type InformationalTokenFromSessionInfo =
    | ReadyForQueryResponse
    | ParameterStatus
    | BackendKeyData
    | PGErrorResponse
    | PGNoticeResponse;
// 83 | 90 | 75 | 69 |78>
export function isInformationalToken(u: any): u is InformationalTokenFromSessionInfo {
    return isR4Q(u) || isParamStatus(u) || isBackEndKeyData(u) || isErrorResponse(u) || isNoticeResponse(u);
}
