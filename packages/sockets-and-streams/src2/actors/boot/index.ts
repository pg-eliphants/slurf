import Enqueue from '../Enqueue';
import { CONNECTED } from './constants';
import { BootControlMsgs } from './messages';
import { WRITE } from '../socket/constants';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import Encoder from '../../utils/Encoder';
import { createSSLRequest } from './helpers';
import { SocketControlMsgs } from '../socket/messages';
import { BOOTEND, BOOTEND_NO_SSL, BUFFER_STUFFING_ATTACK, DATA, END_CONNECTION, MANGELD_DATA, SSL } from '../constants';
import ReadableByteStream from '../../utils/ReadableByteStream';
import { optionallyHandleErrorAndNoticeResponse } from '../helpers';
import { PoolFirstResidence } from '../supervisor/types';

export default class Boot implements Enqueue<BootControlMsgs> {
    private sslRequestSent: boolean;
    private lifeEnded: boolean;
    private readonly receivedBytes: ReadableByteStream;

    private handleData() {
        const socketActor = this.socketActor();
        if (this.lifeEnded) {
            return;
        }
        // you are receiving data before startup message sent or
        if (!this.sslRequestSent) {
            // no handshake was ever initiated but pg-server sent us data
            // this could be legit errors & notices, (like db startup/shutdown, etc)
            const { notices, errors, inTransit, brokenMsg } = optionallyHandleErrorAndNoticeResponse(
                this.receivedBytes,
                this.decoder
            );
            [...errors, ...notices].forEach((msg) => {
                this.supervisor.enqueue({ ...msg, socketActor });
            });

            if (inTransit === undefined) {
                return; //todo, wait for more data
            }
            // any currupt messages or incomprehensible binary data?
            if (brokenMsg || this.receivedBytes.bytesLeft()) {
                // data corruption;
                this.supervisor.enqueue({ type: MANGELD_DATA, pl: this.receivedBytes, socketActor });
                this.socketActor().enqueue({ type: END_CONNECTION });
                return;
            }
            return;
        }
        // this.sslRequestSent === true
        if (this.receivedBytes.bytesLeft() > 1) {
            // protocol violation: https://www.postgresql.org/docs/current/protocol-flow.html
            // this is possibly a buffer-stuffing attack (CVE-2021-23222).
            // https://www.postgresql.org/support/security/CVE-2021-23222
            this.supervisor.enqueue({ type: BUFFER_STUFFING_ATTACK, pl: this.receivedBytes, socketActor });
            this.socketActor().enqueue({ type: END_CONNECTION });
            return;
        }
        const byte = this.receivedBytes.current();
        if (byte === 78) {
            this.receivedBytes.advanceCursor(1);
            // server does not know ssl
            if (this.canDoSSLFallback) {

                this.supervisor.enqueue({ type: BOOTEND_NO_SSL, socketActor, pl: this.receivedBytes, forPool: this.forPool });
                return;
            }
            // abbort connection
            this.socketActor().enqueue({ type: END_CONNECTION });
        }
        if (byte === 83) {
            this.receivedBytes.advanceCursor(1);
            // server does know ssl, ssl upgrade allowed
            // ssl upgrade
            this.supervisor.enqueue({ type: SSL, socketActor });
            this.supervisor.enqueue({ type: BOOTEND, socketActor, pl: this.receivedBytes, forPool: this.forPool });
            return;
        }
        this.socketActor().enqueue({ type: END_CONNECTION });
    }

    public enqueue(msg: BootControlMsgs) {
        if (msg.type === CONNECTED) {
            if (this.isSSLValid) {
                this.socketActor().enqueue({ type: WRITE, data: createSSLRequest(this.encoder)! });
                this.sslRequestSent = true;
                return;
            }
            // end the boot socket the socket
            // starupMessage will be handled by the authentication actor
            this.supervisor.enqueue({ type: BOOTEND_NO_SSL, socketActor: this.socketActor(), pl: this.receivedBytes, forPool: this.forPool });
            this.lifeEnded = true;
            return;
        }
        if (msg.type === DATA) {
            this.receivedBytes.enqueue(msg.pl);
            return this.handleData();
        }
    }

    constructor(
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly socketActor: () => Enqueue<SocketControlMsgs>,
        private readonly isSSLValid: boolean,
        private readonly canDoSSLFallback: boolean,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder,
        private readonly forPool: PoolFirstResidence,
        private readonly CACHE_BYTE_SIZE = 128
    ) {
        this.sslRequestSent = false;
        this.lifeEnded = false;
        this.receivedBytes = new ReadableByteStream(CACHE_BYTE_SIZE);
    }
}
