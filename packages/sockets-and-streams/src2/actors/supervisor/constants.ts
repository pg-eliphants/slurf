import { SetPool } from '../socket/messages';
import { InformationalTokenMessage } from './messages';
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
export const ACTIVEPOOL: Pool = 'active';

// instructional
export const SETPOOL: SetPool['type'] = 'setpool';

export const INFO_TOKENS: InformationalTokenMessage['type'] = 'info-token';
