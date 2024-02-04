import type { NetworkData } from '../messages';

export type SessionStart = {
    type: 's-start';
};

export type SessionInfoControlMessages = SessionStart | NetworkData;
