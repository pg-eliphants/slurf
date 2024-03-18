import type {
    BufferStuffingAttack,
    EndConnection,
    LookUpError,
    NetworkClose,
    NetworkData,
    NetworkError,
    SessionInfoExchangeEnd,
    UpgradeToSSL,
    MangledData,
    PasswordMissing,
    NegotiateProtocolVersion,
    BootPhaseEnded,
    AuthPhaseEnded,
    DataReceivedWhenPaused,
    OODAuth,
    OODSessionInfo,
    NetworkTimeout,
    QueryInitDone,
    BootPhaseEndedNoSSL
} from './messages';

export const DATA: NetworkData['type'] = 'data';
export const LOOKUPERROR: LookUpError['type'] = 'net-lookup-error';
export const NETCLOSE: NetworkClose['type'] = 'net-close';
export const NETWORKERR: NetworkError['type'] = 'net-error';
export const TIMEOUT: NetworkTimeout['type'] = 'net-timeout';
export const SSL: UpgradeToSSL['type'] = 'ssl';
export const END_CONNECTION: EndConnection['type'] = 'end';
export const SESSION_INFO_END: SessionInfoExchangeEnd['type'] = 'session-info-exchnage-end';

export const MANGELD_DATA: MangledData['type'] = 'mangled';
export const BUFFER_STUFFING_ATTACK: BufferStuffingAttack['type'] = 'buffer-stuffing';
export const AUTH_PW_MISSING: PasswordMissing['type'] = 'password-not-provided';
export const NEGOTIATE_PROTOCOL: NegotiateProtocolVersion['type'] = 'negotiate-protocol-version';

export const BOOTEND: BootPhaseEnded['type'] = 'boot-end';
export const BOOTEND_NO_SSL: BootPhaseEndedNoSSL['type'] = 'boot-end-no-ssl';
export const AUTH_END: AuthPhaseEnded['type'] = 'auth-end';

export const PAUSED_DATA: DataReceivedWhenPaused['type'] = 'paused-data';

export const OOD_AUTH: OODAuth['type'] = 'ood-auth';
export const OOD_SESSION_INFO: OODSessionInfo['type'] = 'ood-session-info';
export const QID: QueryInitDone['type'] = 'query-init-done'
