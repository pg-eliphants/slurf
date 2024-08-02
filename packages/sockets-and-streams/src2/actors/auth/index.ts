import ReadableByteStream from '../../utils/ReadableByteStream';
import Enqueue from '../Enqueue';
import { PGConfig } from '../supervisor/types';
import { AUTH_START } from './constants';
import { AuthenticationControlMsgs } from './messages';
import { SocketControlMsgs } from '../socket/messages';
import { WRITE } from '../socket/constants';
import Encoder from '../../utils/Encoder';
import { AUTH_END, AUTH_PW_MISSING, DATA, END_CONNECTION, MANGELD_DATA, NETCLOSE, OOD_AUTH } from '../constants';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { isAuthClearTextPassword, isAuthOkMsg } from '../../messages/fromBackend/Authentication';
import createPasswordMessage from '../../messages/toBackend/PasswordMessage';
import { createStartupMessage } from '../../messages/toBackend/StartupMessage';
import Lexer from '../../utils/Lexer';
import { sendToSuperVisor } from '../helpers';
import { isInformationalToken } from './helpers';
import { AUTH_CLASS, AuthenticationTag, ERROR, ErrorResponseTag, NEGOTIATE, NOTICE, NegotiateProtocolVersionTag, NoticeResponseTag } from '../../messages/fromBackend/constants';

export default class AuthenticationActor implements Enqueue<AuthenticationControlMsgs> {
    private lexer: Lexer<AuthenticationTag | ErrorResponseTag | NegotiateProtocolVersionTag | NoticeResponseTag>;
    constructor(
        private readonly receivedBytes: ReadableByteStream,
        private readonly config: Required<PGConfig>,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder
    ) {
        this.lexer = new Lexer<AuthenticationTag | ErrorResponseTag | NegotiateProtocolVersionTag | NoticeResponseTag>(
            this.receivedBytes,
            // isEOL
            (msg) => {
                return isAuthOkMsg(msg);
            },
            [AUTH_CLASS, ERROR, NEGOTIATE, NOTICE],
            // curruptedCB
            (readable, tokens) => {
                sendToSuperVisor(this.supervisor, this.socketActor, tokens, isInformationalToken);
                this.supervisor.enqueue({ type: MANGELD_DATA, pl: receivedBytes, socketActor });
            },
            // eolCB
            (eol, readable, tokens, last) => {
                if (eol) {
                    // send tokens to supervisor
                    sendToSuperVisor(this.supervisor, this.socketActor, tokens, isInformationalToken);
                    this.supervisor.enqueue({ type: AUTH_END, socketActor, pl: receivedBytes });
                    return;
                }
                if (isAuthClearTextPassword(tokens[last])) {
                    const pw = this.config.password();
                    if (!pw) {
                        sendToSuperVisor(this.supervisor, this.socketActor, tokens, isInformationalToken);
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
                sendToSuperVisor(this.supervisor, this.socketActor, tokens, isInformationalToken);
                this.supervisor.enqueue({ type: OOD_AUTH, pl: receivedBytes, socketActor });
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
        if (msg.type === NETCLOSE) {
            sendToSuperVisor(this.supervisor, this.socketActor, this.lexer.getTokens(), isInformationalToken);
            return;
        }
    }
}
