import { SetPool } from '../socket/messages';
import {
    BootPhaseEnded,
    BufferStuffingAttack,
    DataReceivedWhenPaused,
    MangledData,
    NoAuthData,
    SVNegotiateProtocolVersion,
    AuthPhaseEnded,
    PasswordMissing,
    NoQ4Data
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

export const TERMINALPOOL: Pool = 'terminal';
export const SETPOOL: SetPool['type'] = 'setpool';
export const CREATEPOOL: Pool = 'created';
export const BOOTEND: BootPhaseEnded['type'] = 'boot-end';
export const PAUSED_DATA: DataReceivedWhenPaused['type'] = 'paused-data';
export const MANGELD_DATA: MangledData['type'] = 'mangled';
export const BUFFER_STUFFING_ATTACK: BufferStuffingAttack['type'] = 'buffer-stuffing';
export const NON_AUTH_DATA: NoAuthData['type'] = 'non-auth-data';
export const NON_Q4_DATA: NoQ4Data['type'] = 'non-q4-data';
export const NEGOTIATE_PROTOCOL: SVNegotiateProtocolVersion['type'] = 'negotiate-protocol';
export const AUTH_END: AuthPhaseEnded['type'] = 'auth-end';
export const AUTH_PW_MISSING: PasswordMissing['type'] = 'password-not-provided';
