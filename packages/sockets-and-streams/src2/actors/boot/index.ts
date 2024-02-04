import Enqueue from '../Enqueue';
import { CONNECTED } from './constants';
import { BootControlMsgs } from './messages';
import { WRITE } from '../socket/constants';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import Encoder from '../../utils/Encoder';
import { createSSLRequest } from './helpers';
import { SocketControlMsgs } from '../socket/messages';
import { BOOTEND, BUFFER_STUFFING_ATTACK, MANGELD_DATA, PAUSED_DATA } from '../supervisor/constants';
import { DATA, END_CONNECTION, SSL } from '../constants';
import ReadableByteStream from '../../utils/ReadableByteStream';
import { optionallyHandleErrorAndNoticeResponse } from '../../messages/fromBackend/helper';

export default class Boot implements Enqueue<BootControlMsgs> {
    private sslRequestSent: boolean;
    private lifeEnded: boolean;
    private readonly receivedBytes: ReadableByteStream;

    private handleData() {
        const socketActor = this.socketActor();
        if (this.lifeEnded) {
            // data received when paused, not so good
            // supervise needs to count this, furthermore the "ReadableByteStream" will be transferred to another actor
            this.supervisor.enqueue({ type: PAUSED_DATA, socketActor });
            return;
        }
        // you are receiving data before startup message sent or
        if (false === this.sslRequestSent) {
            // no handshake was ever initiated but pg-server sent us data
            // this could be legit errors & notices
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
        if (this.sslRequestSent) {
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
                    this.supervisor.enqueue({ type: BOOTEND, socketActor, pl: this.receivedBytes });
                    return;
                }
                // abbort connection
                this.socketActor().enqueue({ type: END_CONNECTION });
            }
            if (byte === 83) {
                this.receivedBytes.advanceCursor(1);
                // server does know ssl, ssl upgrade allowed
                this.supervisor.enqueue({ type: BOOTEND, socketActor, pl: this.receivedBytes });
                this.supervisor.enqueue({ type: SSL, socketActor });
                return;
            }
            this.socketActor().enqueue({ type: END_CONNECTION });
        }
        // this should be unreachable, prolly some kind of delay to "die" makes you receive data, send this
        // after startup messge sentreceiving data that is not meant for you, this should not happen as this actor should already have been
    }

    public enqueue(data: BootControlMsgs) {
        if (data.type === CONNECTED) {
            if (this.isSSLValid) {
                this.socketActor().enqueue({ type: WRITE, data: createSSLRequest(this.encoder)! });
                this.sslRequestSent = true;
                return;
            }
            // end the boot socket the socket
            // starupMessage will be handled by the authentication actor
            this.supervisor.enqueue({ type: BOOTEND, socketActor: this.socketActor(), pl: this.receivedBytes });
            this.lifeEnded = true;
            return;
        }
        if (data.type === DATA) {
            this.receivedBytes.enqueue(data.pl);
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
        private readonly CACHE_BYTE_SIZE = 128
    ) {
        this.sslRequestSent = false;
        this.lifeEnded = false;
        this.receivedBytes = new ReadableByteStream(CACHE_BYTE_SIZE);
    }
}
