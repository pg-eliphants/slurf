import { ParameterStatus, parse as parseParamStatus } from '../../messages/fromBackend/ParameterStatus';
import { ReadyForQueryResponse, parse as parseReady4Query } from '../../messages/fromBackend/ReadyForQuery';
import { parse as parseBackendKeyData, BackendKeyData } from '../../messages/fromBackend/BackEndKeyData';
import { BACKEND_KEY_DATA, ERROR, NOTICE, PARAM_STATUS, READY_4_QUERY } from '../../messages/fromBackend/constants';
import { optionallyHandleErrorAndNoticeResponse } from '../../messages/fromBackend/helper';
import Encoder from '../../utils/Encoder';
import ReadableByteStream from '../../utils/ReadableByteStream';
import Enqueue from '../Enqueue';
import { DATA, END_CONNECTION, SESSION_INFO_END } from '../constants';
import { SocketControlMsgs } from '../socket/messages';
import { MANGELD_DATA, OOD_SESSION_INFO } from '../supervisor/constants';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { SES_START } from './constants';
import { SessionInfoControlMessages } from './messages';

// we expect these "starup" messages before we get "Z"(ready for Query)
const messageTypes = {
    [PARAM_STATUS]: 1,
    [READY_4_QUERY]: 1,
    [BACKEND_KEY_DATA]: 1,
    [ERROR]: 1,
    [NOTICE]: 1
};

type AllowableMsgTags = keyof typeof messageTypes;

export default class SessionInfoExchange implements Enqueue<SessionInfoControlMessages> {
    private currentTag: AllowableMsgTags | undefined;
    private dataCurrupted: boolean;
    private readyForQuery: ReadyForQueryResponse | undefined;
    private outOfDomainMsgType: boolean;
    private readonly paramStatus: ParameterStatus[];
    private backendKeyData: BackendKeyData | undefined;
    constructor(
        private readonly receivedBytes: ReadableByteStream,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder
    ) {
        this.dataCurrupted = false;
        this.paramStatus = [];
        this.outOfDomainMsgType = false;
    }
    private handleCurruptedData() {
        const { socketActor, receivedBytes } = this;
        this.supervisor.enqueue({ type: MANGELD_DATA, pl: receivedBytes, socketActor });
        this.dataCurrupted = true;
    }
    private handleOutOfDomainData() {
        const { socketActor, receivedBytes } = this;
        this.supervisor.enqueue({ type: OOD_SESSION_INFO, pl: receivedBytes, socketActor });
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
    private handleParamStatus() {
        const result = parseParamStatus(this.receivedBytes, this.decoder);
        if (result === null) {
            this.handleCurruptedData();
            return;
        }
        if (result === undefined || result === false) {
            return result;
        }
        this.paramStatus.push(result);
        return true;
    }
    private handleReadyForQuery() {
        const result = parseReady4Query(this.receivedBytes);
        if (result === false || result === undefined) {
            return result;
        }
        if (result === null) {
            this.handleCurruptedData();
            return;
        }
        this.readyForQuery = result;
        this.socketActor.enqueue({
            type: SESSION_INFO_END,
            r4q: this.readyForQuery,
            paramStatus: this.paramStatus,
            backendKey: this.backendKeyData!,
            readable: this.receivedBytes
        });
        return true;
    }
    private handleBackendKeyData() {
        const result = parseBackendKeyData(this.receivedBytes);
        if (result === null) {
            this.handleCurruptedData();
            return;
        }
        if (result === undefined || result === false) {
            return result;
        }
        this.backendKeyData = result;
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
            case PARAM_STATUS:
                const paramStatusHandled = this.handleParamStatus();
                if (typeof paramStatusHandled !== 'boolean') {
                    return;
                }
                break;
            case READY_4_QUERY:
                const ready4QueryHandled = this.handleReadyForQuery();
                if (typeof ready4QueryHandled !== 'boolean') {
                    return;
                }
                break;
            case BACKEND_KEY_DATA:
                const backendKeyDataHandled = this.handleBackendKeyData();
                if (typeof backendKeyDataHandled !== 'boolean') {
                    return;
                }
                break;
        }
        this.currentTag = undefined;
        // only process messages if
        // 1. we have data in the buffer
        // 2. we havent received ready4query message yet
        // 3. we havent received a protocol violation
        // 4. we havent received a mangled message
        while (
            this.receivedBytes.bytesLeft() > 0 &&
            !this.readyForQuery &&
            !this.dataCurrupted &&
            !this.outOfDomainMsgType
        ) {
            const newTag = this.receivedBytes.current();
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
                case PARAM_STATUS:
                    const paramStatusHandled = this.handleParamStatus();
                    if (typeof paramStatusHandled !== 'boolean') {
                        return;
                    }
                    break;
                case READY_4_QUERY:
                    const ready4QueryHandled = this.handleReadyForQuery();
                    if (typeof ready4QueryHandled !== 'boolean') {
                        return;
                    }
                    break;
                case BACKEND_KEY_DATA:
                    const backendKeyDataHandled = this.handleBackendKeyData();
                    if (typeof backendKeyDataHandled !== 'boolean') {
                        return;
                    }
                    break;
            }
            this.currentTag = undefined;
        }
    }
    public enqueue(msg: SessionInfoControlMessages) {
        if (msg.type === DATA) {
            this.handleData();
            return;
        }
        if (msg.type === SES_START) {
            // we expect to have some initial data in the buffer, attempt to process it
            this.handleData();
            return;
        }
    }
}
