import type { NetworkData, EndConnection } from '../messages';
export type Connected = {
    type: 'connect';
};

export type BootControlMsgs = Connected | NetworkData;
