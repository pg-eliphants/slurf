import type {
    EndConnection,
    LookUpError,
    NetworkClose,
    NetworkData,
    NetworkError,
    NetworkTimeOut,
    SessionInfoExchangeEnd,
    UpgradeToSSL
} from './messages';

export const DATA: NetworkData['type'] = 'data';
export const LOOKUPERROR: LookUpError['type'] = 'net-lookup-error';
export const NETCLOSE: NetworkClose['type'] = 'net-close';
export const NETWORKERR: NetworkError['type'] = 'net-error';
export const TIMEOUT: NetworkTimeOut['type'] = 'net-timeout';
export const SSL: UpgradeToSSL['type'] = 'ssl';
export const END_CONNECTION: EndConnection['type'] = 'end';
export const SESSION_INFO_END: SessionInfoExchangeEnd['type'] = 'session-info-exchnage-end';
