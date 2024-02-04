export type AuthStart = {
    type: 'auth-start';
};

import type { NetworkData } from '../messages';

export type AuthenticationControlMsgs = AuthStart | NetworkData;
