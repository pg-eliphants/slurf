import ReadableByteStream from '../../utils/ReadableByteStream';
import Enqueue from '../Enqueue';
import { PGConfig } from '../supervisor/types';
import { AUTH_START } from './constants';
import { AuthenticationControlMsgs } from './messages';
import { SocketControlMsgs } from '../socket/messages';
import { WRITE } from '../socket/constants';
import Encoder from '../../utils/Encoder';
import { DATA, END_CONNECTION } from '../constants';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { AUTH_END, AUTH_PW_MISSING, MANGELD_DATA, NON_AUTH_DATA } from '../supervisor/constants';
import { parse as parseNegotiateVersion } from '../../messages/fromBackend/NegotiateProtocol';
import {
    isAuthClearTextPassword,
    isAuthOkMsg,
    parse as parseAuthentication
} from '../../messages/fromBackend/Authentication';
import createPasswordMessage from '../../messages/toBackend/PasswordMessage';
import { createStartupMessage } from '../../messages/toBackend/StartupMessage';
import Lexer from '../../Lexer';
import { parseError, parseNotice } from '../../messages/fromBackend/ErrorAndNoticeResponse';

export default class AuthenticationActor implements Enqueue<AuthenticationControlMsgs> {
    private lexer: Lexer<82 | 69 | 118 | 78>;
    constructor(
        private readonly receivedBytes: ReadableByteStream,
        private readonly config: Required<PGConfig>,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder
    ) {
        this.lexer = new Lexer<82 | 69 | 118 | 78>(
            this.receivedBytes,
            {
                82: parseAuthentication,
                69: parseError,
                118: parseNegotiateVersion,
                78: parseNotice
            },
            // isEOL
            (msg) => {
                return isAuthOkMsg(msg);
            },
            // curruptedCB
            (readable, tokens) => {
                this.supervisor.enqueue({ type: MANGELD_DATA, pl: receivedBytes, socketActor });
            },
            // eolCB
            (eol, readable, tokens, last) => {
                if (eol) {
                    // send tokens to supervisor
                    this.supervisor.enqueue({ type: AUTH_END, socketActor, pl: receivedBytes });
                    return;
                }
                if (isAuthClearTextPassword(tokens[last])) {
                    const pw = this.config.password();
                    if (!pw) {
                        this.supervisor.enqueue({ type: AUTH_PW_MISSING, socketActor });
                        this.socketActor.enqueue({ type: END_CONNECTION });
                    } else {
                        this.socketActor.enqueue({ type: WRITE, data: createPasswordMessage(pw, encoder)! });
                    }
                    return;
                }
            },
            // outOfDomain
            (readable, tokens) => {
                this.supervisor.enqueue({ type: NON_AUTH_DATA, pl: receivedBytes, socketActor });
                this.socketActor.enqueue({ type: END_CONNECTION });
            },
            this.decoder
        );
    }

    public enqueue(msg: AuthenticationControlMsgs) {
        if (msg.type === AUTH_START) {
            this.socketActor.enqueue({ type: WRITE, data: createStartupMessage(this.config, this.encoder)! });
            return;
        }
        if (msg.type === DATA) {
            this.receivedBytes.enqueue(msg.pl);
            this.lexer.handleData();
            return;
        }
    }
}
