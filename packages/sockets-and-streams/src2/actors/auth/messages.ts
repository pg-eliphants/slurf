import type { NetworkData } from '../messages';
import type { NetworkClose } from '../messages';

export type AuthStart = {
    type: 'auth-start';
};

export type AuthenticationControlMsgs = AuthStart | NetworkData | NetworkClose;
