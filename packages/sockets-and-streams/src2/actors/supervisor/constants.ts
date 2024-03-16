import { SetPool } from '../socket/messages';
import {
    BootPhaseEnded,
    BufferStuffingAttack,
    DataReceivedWhenPaused,
    MangledData,
    OODAuth,
    SVNegotiateProtocolVersion,
    AuthPhaseEnded,
    PasswordMissing,
    OODSessionInfo,
    InformationalTokenMessage
} from './messages';
import { ActivityWait, Pool } from './types';

export const activityWaits: ActivityWait[] = [
    'network',
    'iom_code',
    'connect',
    'sslConnect',
    'finish',
    'end',
    'close',
    'drained'
];

// internally used by supervisor
export const CREATEPOOL: Pool = 'created';
export const TERMINALPOOL: Pool = 'terminal';

// instructional
export const SETPOOL: SetPool['type'] = 'setpool';
export const BOOTEND: BootPhaseEnded['type'] = 'boot-end';
export const AUTH_END: AuthPhaseEnded['type'] = 'auth-end';

export const PAUSED_DATA: DataReceivedWhenPaused['type'] = 'paused-data';

// notifications boot
export const MANGELD_DATA: MangledData['type'] = 'mangled';
export const BUFFER_STUFFING_ATTACK: BufferStuffingAttack['type'] = 'buffer-stuffing';

// notification auth
export const OOD_AUTH: OODAuth['type'] = 'ood-auth';
export const NEGOTIATE_PROTOCOL: SVNegotiateProtocolVersion['type'] = 'negotiate-protocol';
export const AUTH_PW_MISSING: PasswordMissing['type'] = 'password-not-provided';

export const OOD_SESSION_INFO: OODSessionInfo['type'] = 'ood-session-info';

export const INFO_TOKENS: InformationalTokenMessage['type'] = 'info-token';
