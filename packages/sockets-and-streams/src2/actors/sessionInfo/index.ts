import Encoder from '../../utils/Encoder';
import ReadableByteStream from '../../utils/ReadableByteStream';
import Enqueue from '../Enqueue';
import { DATA, END_CONNECTION, MANGELD_DATA, OOD_SESSION_INFO, SESSION_INFO_END } from '../constants';
import { SocketControlMsgs } from '../socket/messages';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { SES_START } from './constants';
import { SessionInfoControlMessages } from './messages';
import Lexer from '../../utils/Lexer';
import { isR4Q } from '../../messages/fromBackend/ReadyForQuery';

import { isInformationalToken } from './helpers';
import { sendToSuperVisor } from '../helpers';

export default class SessionInfoExchange implements Enqueue<SessionInfoControlMessages> {
    private lexer: Lexer<83 | 90 | 75 | 69 | 78>;
    constructor(
        private readonly receivedBytes: ReadableByteStream,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder
    ) {
        this.lexer = new Lexer<83 | 90 | 75 | 69 | 78>(
            this.receivedBytes,
            // isEOL
            (msg) => {
                return isR4Q(msg);
            },
            [83, 90, 75, 69, 78],
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
                    this.socketActor.enqueue({
                        type: SESSION_INFO_END,
                        pl: this.receivedBytes
                    });
                    return;
                }
            },
            // outOfDomain
            (readable, tokens) => {
                sendToSuperVisor(this.supervisor, this.socketActor, tokens, isInformationalToken);
                this.supervisor.enqueue({ type: OOD_SESSION_INFO, pl: receivedBytes, socketActor });
                this.socketActor.enqueue({ type: END_CONNECTION });
            },
            this.decoder
        );
    }

    public enqueue(msg: SessionInfoControlMessages) {
        if (msg.type === DATA) {
            this.receivedBytes.enqueue(msg.pl);
            this.lexer.handleData();
            return;
        }
        if (msg.type === SES_START) {
            // we expect to have some initial data in the buffer, attempt to process it
            this.lexer.handleData();
            return;
        }
    }
}
