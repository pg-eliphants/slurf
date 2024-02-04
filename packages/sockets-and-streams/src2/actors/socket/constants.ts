import { Pause, SetActor, Write, WriteThrottle } from './messages';

export const WRITE: Write['type'] = 'write';
export const WRITE_THROTTLE: WriteThrottle['type'] = 'write-throttle';
export const PAUSE: Pause['type'] = 'pause';
export const SET_ACTOR: SetActor['type'] = 'setactor';
