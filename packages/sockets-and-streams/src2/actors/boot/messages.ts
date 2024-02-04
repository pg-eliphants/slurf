import type { NetworkData } from '../messages';
export type Connected = {
    type: 'connect';
};

export type BootControlMsgs = Connected | NetworkData;
