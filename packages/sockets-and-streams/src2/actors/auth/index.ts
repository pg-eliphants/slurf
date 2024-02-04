import ReadableByteStream from '../../utils/ReadableByteStream';
import Enqueue from '../Enqueue';
import { PGConfig } from '../supervisor/types';
import { AUTH_START } from './constants';
import { AuthenticationControlMsgs } from './messages';
import { SocketControlMsgs } from '../socket/messages';
import { WRITE } from '../socket/constants';
import Encoder from '../../utils/Encoder';
import { DATA, END_CONNECTION } from '../constants';
import { optionallyHandleErrorAndNoticeResponse } from '../../messages/fromBackend/helper';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { AUTH_END, AUTH_PW_MISSING, MANGELD_DATA, NEGOTIATE_PROTOCOL, NON_AUTH_DATA } from '../supervisor/constants';
import { parse as parseNegotiateVersion } from '../../messages/fromBackend/NegotiateProtocol';
import {
    isAuthClearTextPassword,
    isAuthOkMsg,
    parse as parseAuthentication
} from '../../messages/fromBackend/Authentication';
import createPasswordMessage from '../../messages/toBackend/PasswordMessage';
import { createStartupMessage } from '../../messages/toBackend/StartupMessage';
import { AUTH_CLASS, ERROR, NEGOTIATE, NOTICE } from '../../messages/fromBackend/constants';

const messageTypes = {
    [AUTH_CLASS]: 1,
    [ERROR]: 1,
    [NEGOTIATE]: 1,
    [NOTICE]: 1
};
export default class AuthenticationActor implements Enqueue<AuthenticationControlMsgs> {
    private authOkReceived: boolean;
    private dataCurrupted: boolean;
    private outOfDomainMsgType: boolean;
    private currentTag: keyof typeof messageTypes | undefined;
    constructor(
        private readonly receivedBytes: ReadableByteStream,
        private readonly config: Required<PGConfig>,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder
    ) {
        this.authOkReceived = false;
        this.dataCurrupted = false;
        this.outOfDomainMsgType = false;
    }
    private handleCurruptedData() {
        const { socketActor, receivedBytes } = this;
        this.supervisor.enqueue({ type: MANGELD_DATA, pl: receivedBytes, socketActor });
        this.dataCurrupted = true;
    }
    private handleOutOfDomainData() {
        const { socketActor, receivedBytes } = this;
        this.supervisor.enqueue({ type: NON_AUTH_DATA, pl: receivedBytes, socketActor });
        this.socketActor.enqueue({ type: END_CONNECTION });
        this.outOfDomainMsgType = true;
    }
    private handleNoticesAndErrors() {
        const { notices, errors, inTransit, brokenMsg } = optionallyHandleErrorAndNoticeResponse(
            this.receivedBytes,
            this.decoder
        );
        const totalCount = errors.length + notices.length;
        if (totalCount) {
            [...errors, ...notices].forEach((msg) => {
                this.supervisor.enqueue({ ...msg, socketActor: this.socketActor });
            });
        }

        if (inTransit === undefined) {
            return undefined; //todo, wait for more data
        }
        // any currupt messages or incomprehensible binary data?
        if (brokenMsg) {
            this.handleCurruptedData();
            return null;
        }
        return !!totalCount; // ok
    }

    private handleAuthentication() {
        const { socketActor, receivedBytes, decoder, encoder } = this;
        const msg = parseAuthentication(receivedBytes, decoder);
        if (msg === undefined) {
            return undefined;
        }
        if (msg === null) {
            this.handleCurruptedData();
            return null;
        }
        if (msg !== false) {
            if ((this.authOkReceived = isAuthOkMsg(msg))) {
                // this should cause a switch to another actor
                this.supervisor.enqueue({ type: AUTH_END, socketActor, pl: receivedBytes });
            } else if (isAuthClearTextPassword(msg)) {
                const pw = this.config.password();
                if (!pw) {
                    this.supervisor.enqueue({ type: AUTH_PW_MISSING, socketActor });
                    this.socketActor.enqueue({ type: END_CONNECTION });
                } else {
                    this.socketActor.enqueue({ type: WRITE, data: createPasswordMessage(pw, encoder)! });
                }
            }
            return true;
        }
        return false;
    }

    private handleNegotiateVersion() {
        const msg = parseNegotiateVersion(this.receivedBytes, this.decoder);
        if (msg === false || msg === undefined) {
            return msg;
        }
        if (msg === null) {
            this.handleCurruptedData();
            return msg;
        }
        this.supervisor.enqueue({ type: NEGOTIATE_PROTOCOL, pl: msg, socketActor: this.socketActor });
        return true;
    }

    private handleData() {
        // finish, if you are in process if parsing a message record
        switch (this.currentTag) {
            case NOTICE:
            case ERROR:
                const errorsHandled = this.handleNoticesAndErrors();
                if (typeof errorsHandled !== 'boolean') {
                    return;
                }
                break;
            case AUTH_CLASS:
                const authHandled = this.handleAuthentication();
                if (typeof authHandled !== 'boolean') {
                    return;
                }
                break;
            case NEGOTIATE:
                const noticeHandled = this.handleNegotiateVersion();
                if (typeof noticeHandled !== 'boolean') {
                    return;
                }
                break;
        }
        this.currentTag = undefined;
        // only process messages if
        // 1. we have data in the buffer
        // 2. we havent received authentication Ok message yet
        // 3. we havent received a protocol violation
        // 4. we havent received a mangled message
        while (
            this.receivedBytes.bytesLeft() > 0 &&
            !this.authOkReceived &&
            !this.dataCurrupted &&
            !this.outOfDomainMsgType
        ) {
            const newTag = this.receivedBytes.current();
            // we should not get anything stange before we receive authOk
            if (!messageTypes[newTag]) {
                this.handleOutOfDomainData();
                return;
            }
            this.currentTag = newTag as keyof typeof messageTypes;
            switch (this.currentTag) {
                case NOTICE:
                case ERROR:
                    const errorsHandled = this.handleNoticesAndErrors();
                    if (typeof errorsHandled !== 'boolean') {
                        return;
                    }
                    break;
                case AUTH_CLASS:
                    const authHandled = this.handleAuthentication();
                    if (typeof authHandled !== 'boolean') {
                        return;
                    }
                    break;
                case NEGOTIATE:
                    const negotiateHandled = this.handleNegotiateVersion();
                    if (typeof negotiateHandled !== 'boolean') {
                        return;
                    }
                    break;
            }
            this.currentTag = undefined;
        }
    }

    public enqueue(msg: AuthenticationControlMsgs) {
        if (msg.type === AUTH_START) {
            this.socketActor.enqueue({ type: WRITE, data: createStartupMessage(this.config, this.encoder)! });
            return;
        }
        if (msg.type === DATA) {
            this.receivedBytes.enqueue(msg.pl);
            this.handleData();
            return;
        }
    }
}
