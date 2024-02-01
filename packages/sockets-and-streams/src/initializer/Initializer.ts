import { List } from '../utils/list';
import Encoder from '../protocol/Encoder';
import { SocketAttributes } from '../io/types';
import { PGConfig, SetSSLFallback } from '../protocol/types';
import SocketIOManager from '../io/SocketIOManager';
import ProtocolManager from '../protocol/ProtocolManager';
import { SEND_STATUS_OK, SEND_STATUS_OK_WITH_BACKPRESSURE } from '../io/constants';
import type { GetSLLFallbackSpec } from './types';
import { parse as parseParameterStatus } from '../protocol/messages/back/ParameterStatus';
import { parse as parseBackendKeyData } from '../protocol/messages/back/BackendKeyData';
import { parse as parseReady4Query } from '../protocol/messages/back/ReadyForQuery';
import { parse as parseNegotiateProtocolVersion } from '../protocol/messages/back/NegotiateProtocolVersion';
import { Notifications } from '../protocol/messages/back/types';

import {
    PARAM_STATUS,
    READY_4_QUERY,
    BACKEND_KEY_DATA,
    ERROR,
    NOTICE_RESPONSE,
    NEGOTIATE_PROTOCOL
} from '../protocol/messages/back/constants';
import {
    OK,
    KERBEROSV5,
    CLEARTEXTPASSWORD,
    MD5PASSWORD,
    GSS,
    GSSCONTINUE,
    SSPI,
    SASL,
    SASLCONTINUE,
    SASLFINAL,
    parse as parseAuthenticationMsg
} from '../protocol/messages/back/authentication';

import { NOTIFY } from './constants';

import { addBufferToParseContext, bytesLeft, createParseContext, optionallyHandleUnprocessedBinary, optionallyHandleErrorAndNoticeResponse } from './helper';

import { IBaseInitializer, SocketAttributeAuxMetadata } from './types';
import { JournalFactory, Journal } from '../journal';

export function InitializerFactory(
    encode: Encoder,
    txtDecoder: TextDecoder,
    getSSLFallback: GetSLLFallbackSpec,
    now: () => number
) {
    return function newInitialize(
        socketIoManager: SocketIOManager,
        protocolManager: ProtocolManager,
        journalFactory: ReturnType<typeof JournalFactory>
    ) {
        return new Initializer(
            encode,
            txtDecoder,
            socketIoManager,
            protocolManager,
            getSSLFallback,
            journalFactory,
            now
        );
    };
}
export default class Initializer /*implements IBaseInitializer<SocketAttributeAuxMetadata>*/ {
    private readonly journal: Journal<Initializer>;
    constructor(
        private readonly encoder: Encoder,
        private readonly txtDecoder: TextDecoder,
        private readonly socketIoManager: SocketIOManager,
        private readonly protocol: ProtocolManager,
        private readonly getSSLFallback: GetSLLFallbackSpec,
        private readonly journalFactory: ReturnType<typeof JournalFactory>,
        private readonly now: () => number
    ) {
        this.journal = journalFactory(this);
    }
    public handleEnd(item: SocketAttributes<SocketAttributeAuxMetadata>) {
        return true;
    }
    public handleTimeout(item: SocketAttributes<SocketAttributeAuxMetadata>) {
        return true;
    }
    public handleError(item: SocketAttributes<SocketAttributeAuxMetadata>, err: Error & NodeJS.ErrnoException) {
        return true;
    }
    public handleClose(item: SocketAttributes<SocketAttributeAuxMetadata>) {}
    // handle SSLRespone to SSLRequest Sent
    // ctx.buffer[cursor] is pre-checked to be 78 or 83
    // ctx.buffer.byteLength - ctx.cursor - ctx pre-checked to be 1
    private async handleSSLResponse(attr: SocketAttributes<SocketAttributeAuxMetadata>) {
        const {
            ioMeta: {
                id,
                aux,
                aux: { parsingContext: pc }
            }
        } = attr!;

        // 78 = 'N'
        if (pc!.buffer[pc!.cursor] === 78) {
            pc!.cursor += 1;
            this.journal.add(id, NOTIFY.PG_NOT_COMPILED_WITH_SSL);
            // pg-server not compiled with ssl
            // fallback to non ssl possible?
            const r = this.approveNonSSLConnection();
            if (r === false) {
                this.journal.add(id, NOTIFY.CONNECT_FALLBACK_TO_NONSSL_DENIED);
                return false;
            }
            if (r === true) {
                aux.startupSent = true;
                return await this.sendStartupMessage(attr);
            }
            if ('errors' in r) {
                this.journal.add(id, NOTIFY.ERROR_REQUEST_PG_CONNECT_PARAMS, r.errors);
                return false;
            }
        }
        // only possiblity left is 'S' (this is  pre-checked before entering this function)
        // 'S' = 83,
        pc!.cursor += 1;
        return true;
    }

    // return undefined -> incomplete authentication message received wait for more data from socket
    // return true -> authentication message was processds (does not mean handshake complete)
    // return null -> error orccured, malformed authentication message
    // true added means it is the actual value of the AuthenticationOk (and some others)
    private handleAuthentication(
        item: SocketAttributes<SocketAttributeAuxMetadata>
    ): undefined | null | 'done' | false {
        const aux = item.ioMeta.aux;
        const pc = aux.parsingContext!;
        const id = item.ioMeta.id;

        const parseResult = parseAuthenticationMsg(pc);
        if (parseResult === null) {
            this.journal.add(id, NOTIFY.ERROR_PARSE_AUTHENTICATION_MSG, optionallyHandleUnprocessedBinary(pc));
            return null;
        }
        if (parseResult === undefined) {
            this.journal.add(id, NOTIFY.INCOMPLETE_AUTHENTICATION_MSG);
            return undefined;
        }
        if (parseResult === false) {
            return false;
        }

        if (parseResult.type === OK) {
            aux.authenticationOk = true;
            return 'done';
        }
        if (
            [
                KERBEROSV5,
                CLEARTEXTPASSWORD,
                MD5PASSWORD,
                GSS,
                GSSCONTINUE,
                SSPI,
                SASL,
                SASLCONTINUE,
                SASLFINAL
            ].includes(parseResult.type)
        ) {
            this.journal.add(id, NOTIFY.AUTH_UNSUPPORTED);
            return null;
        }
    }

    private createStartupMessage(config: Required<PGConfig>): Uint8Array | undefined {
        const bin = this.encoder
            .init('128')
            .nextMessage()
            ?.i32(196608)
            ?.cstr('user')
            ?.cstr(config.user)
            ?.cstr('database')
            ?.cstr(config.database)
            //?.cstr('replication')
            //?.cstr(String(config.replication))
            // todo: you can add more options here, check out "client connect options" we need to loop over all posibilities
            ?.cstr('')
            ?.setLength()
            ?.getMessage();
        return bin;
    }
    // popstgres has specified not handle ssl connection
    // so this request developer if we can continue with an non-ssl connection
    private approveNonSSLConnection(): boolean | { errors: Error[] } | { config: Required<PGConfig> } {
        const r = this.protocol.requestConnectionParams();
        if ('errors' in r) {
            return r;
        }
        let setFallbackFn: SetSSLFallback | undefined;
        const getFallBack = (_setFallbackFn: SetSSLFallback) => {
            setFallbackFn = _setFallbackFn;
        };
        this.getSSLFallback(getFallBack);
        if (!setFallbackFn) {
            return false;
        }
        return setFallbackFn(r.config);
    }

    private async sendStartupMessage(attr: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        const ioMeta = attr.ioMeta;
        const r = this.protocol.requestConnectionParams();
        if ('errors' in r) {
            this.journal.add(ioMeta.id, NOTIFY.ERROR_REQUEST_PG_CONNECT_PARAMS, r.errors);
            return false;
        }
        const bin = this.createStartupMessage(r.config);
        if (!bin) {
            this.journal.add(ioMeta.id, NOTIFY.CREATE_STARTUPMSG_FAILURE);
            return false;
        }
        const rc = this.socketIoManager.send(attr, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            await this.socketIoManager.handleBackPressure(attr);
            this.journal.add(ioMeta.id, NOTIFY.BCK_PRESSURE_AFTER_STARTUPMSG);
        } else if (rc === SEND_STATUS_OK) {
            ioMeta.aux.startupSent = true;
            return true;
        }
        this.journal.add(ioMeta.id, NOTIFY.SEND_STARTUP_MESSAGE_FAILURE, rc);
        return false;
    }

    // this is called on a "connect" event
    public async startupAfterConnect(attr: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        // request ssl params from ioManager
        const id = attr.ioMeta.id;
        attr.ioMeta.aux = {
            sslRequestSent: false,
            sslReplyReceived: false,
            startupSent: false,
            upgradedToSll: false,
            authenticationOk: false,
            authenticationMD5Sent: false,
            authenticationClearTextSent: false,
            errors: [],
            runtimeParameters: {},
            notices: []
        };
        // if ssl is configured, try that first
        const r = this.socketIoManager.getSLLSocketClassAndOptions(attr.ioMeta.pool.createdFor);
        // no ssl, use normal connection
        if (r === false) {
            return this.sendStartupMessage(attr);
        }
        if ('errors' in r) {
            this.journal.add(id, NOTIFY.ERROR_SSL_WRONGLY_CONFIGURED, r.errors);
            return false;
        }
        // we configed for ssl, use it
        const bin = this.encoder.init('64')?.nextMessage()?.i32(80877103)?.setLength().getMessage();
        if (!bin) {
            this.journal.add(id, NOTIFY.CREATE_SSLREQUEST_MSG_FAILURE);
            return false;
        }
        const rc = this.socketIoManager.send(attr, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            this.journal.add(id, NOTIFY.BCK_PRESSURE_AFTER_SSLREQUESTMSG);
            await this.socketIoManager.handleBackPressure(attr);
        }
        if (rc === SEND_STATUS_OK) {
            attr.ioMeta.aux.sslRequestSent = true;
            return true;
        }
        this.journal.add(id, NOTIFY.SEND_SSLREQUEST_MSG_FAILURE, rc);
        return false;
    }

    // called on "secureConnect" event
    public startupAfterSSLConnect(attr: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        attr.ioMeta.aux.upgradedToSll = true;
        return this.sendStartupMessage(attr);
    }

    // initially server reacts to:
    //  sslRequest
    //  startupMessage
    public async handleData(
        item: Exclude<List<SocketAttributes<SocketAttributeAuxMetadata>>, null>,
        data: Uint8Array
    ): Promise<boolean | 'done'> {
        const {
            value: attr,
            value: {
                ioMeta,
                ioMeta: {
                    id,
                    aux,
                    aux: { parsingContext }
                }
            }
        } = item;
        let pc = parsingContext;
        if (!pc) {
            pc = aux.parsingContext = createParseContext(data, this.txtDecoder);
        } else {
            addBufferToParseContext(pc!, data);
        }
        // can happen (bug in nodejs?)
        const len = bytesLeft(pc!);
        if (len === 0) {
            this.journal.add(id, NOTIFY.SOCKET_EMITED_ZERO_LENGTH_DATA);
            return true;
        }

        const { startupSent, sslRequestSent, upgradedToSll, authenticationOk, sslReplyReceived } = aux;

        // no handshake was ever initiated but pg-server sent us data
        if (!startupSent && !sslRequestSent) {
            this.journal.add(id, NOTIFY.GOT_DATA_BEFORE_INIT_HANDSHAKE, optionallyHandleUnprocessedBinary(pc!));
            return false;
        }
        const buffer = pc!.buffer;
        // sslRequest Sent but no answer received yes,
        if (sslRequestSent && !sslReplyReceived) {
            const firstByte = buffer[pc!.cursor];
            if (firstByte === 78 || firstByte === 83) {
                if (len === 1) {
                    aux.sslReplyReceived = true;
                    const rc = await this.handleSSLResponse(attr);
                    if (rc === true) {
                        this.socketIoManager.upgradeToSSL(item);
                    }
                    return rc;
                }
                this.journal.add(id, NOTIFY.BUFFER_STUFFING_ATTACK_MAYBE, optionallyHandleUnprocessedBinary(pc!));
                // protocol violation: https://www.postgresql.org/docs/current/protocol-flow.html
                // this is possibly a buffer-stuffing attack (CVE-2021-23222).
                // https://www.postgresql.org/support/security/CVE-2021-23222
                return false;
            }
            const en = optionallyHandleErrorAndNoticeResponse(pc!);
            if (en === undefined) {
                return true; // wait for more data;
            }
            if (!(en === null || en === false)) {
                en.errors && aux.errors.push(...en.errors);
                en.notices && aux.notices.push(...en.notices);
            }
            this.journal.add(id, NOTIFY.AUTH_PROTOCOL_VIOLATION, optionallyHandleUnprocessedBinary(pc!));
            return false;
        }

        // state:
        //  startupSent: false
        //  sslRequestSent: true (must)
        //  sslReplyReceived: true (must)
        //
        if (startupSent === false) {
            this.journal.add(id, NOTIFY.RECEIVED_LATENT_DATA, optionallyHandleUnprocessedBinary(pc!));
            return false;
        }

        // state:
        //  startupSent: true
        //  sslRequestSent: dont care
        //  sslReplyReceived: dont care, but must be equal to sslRequestSent
        //  authenticationOk: false (authentication not completed)
        if (authenticationOk === false) {
            const rc = this.handleAuthentication(attr);
            if (rc === undefined) {
                return true; // wait for more auth data to arrive
            }
            if (rc === null || rc === false) {
                // 1. it is an authentication message but malformed
                // 2. it was not an authentication message (maybe error/notice response)
                // 3. errors are already journalled in "handleAuthentication(..)" function
                return false;
            }
            if (rc === 'done') {
                aux.authenticationOk = true;
            }
        }
        // state:
        //  startupSent: true
        //  sslRequestSent: dont care
        //  sslReplyReceived: dont care, but must be equal to sslRequestSent
        //  authenticationOk: true (authentication completed)
        //
        //  at this point we consume:
        //      "parameter status(es)", "backend key" data, and "ready for query",
        while (!aux.readyForQuery) {
            if (!bytesLeft(aux.parsingContext!)) {
                return true; // wait for more data to arrive
            }
            const idx = [
                PARAM_STATUS, //0
                READY_4_QUERY,
                BACKEND_KEY_DATA,
                ERROR,
                NOTICE_RESPONSE, // 4
                NEGOTIATE_PROTOCOL // 5
            ].indexOf(buffer[pc!.cursor]);
            if (idx < 0) {
                this.journal.add(id, NOTIFY.AFTER_AUTH_OK_FORBIDDEN_MSG, optionallyHandleUnprocessedBinary(pc!));
                return false;
            }
            // 83, 'S' param status
            if (idx === 0) {
                const response = parseParameterStatus(aux.parsingContext!) as Exclude<
                    ReturnType<typeof parseParameterStatus>,
                    false
                >;
                // cannot return false, because 'S' is prechecked to exist
                if (response === undefined) {
                    return true; // wait for more data to arrive
                }
                if (response === null) {
                    this.journal.add(id, NOTIFY.AFTER_AUTH_OK_BROKEN_PARAM_MSG, optionallyHandleUnprocessedBinary(pc!));
                    return false;
                }
                aux.runtimeParameters[response.name] = response.value;
                continue;
            }
            // 90, 'Z', ready for query
            if (idx === 1) {
                const response = parseReady4Query(aux.parsingContext!) as Exclude<
                    ReturnType<typeof parseReady4Query>,
                    false
                >;
                // cannot return false, because 'S' is prechecked to exist
                if (response === undefined) {
                    return true; // wait for more data to arrive
                }
                if (response === null) {
                    this.journal.add(id, NOTIFY.AFTER_AUTH_OK_BROKEN_R4Q_MSG, optionallyHandleUnprocessedBinary(pc!));
                    return false;
                }
                aux.readyForQuery = response;
                aux.parsingContext!.buffer = aux.parsingContext!.buffer.slice(aux.parsingContext!.cursor);
                aux.parsingContext!.cursor = 0;
                continue;
            }
            // 75, 'K', backend key
            if (idx === 2) {
                const response = parseBackendKeyData(aux.parsingContext!) as Exclude<
                    ReturnType<typeof parseBackendKeyData>,
                    false
                >;
                // cannot return false, because 'K' is prechecked to exist
                if (response === undefined) {
                    return true; // wait for more data to arrive
                }
                aux.pid = response.pid;
                aux.cancelSecret = response.secret;
                continue;
            }
            if (idx === 3 || idx === 4) {
                // we have error and notice, or protocolversion error
                const en = optionallyHandleErrorAndNoticeResponse(pc!) as Exclude<
                    ReturnType<typeof optionallyHandleErrorAndNoticeResponse>,
                    false
                >;
                // partial message received
                if (en === undefined) {
                    return true;
                }
                if (en === null) {
                    this.journal.add(
                        id,
                        NOTIFY.AFTER_AUTH_OK_BROKEN_ERROR__NOTICE_MSG,
                        optionallyHandleUnprocessedBinary(pc!)
                    );
                    return false;
                }
                en.errors && aux.errors.push(...en.errors);
                en.notices && aux.notices.push(...en.notices);
            }
            if (idx === 5) {
                const response = parseNegotiateProtocolVersion(pc!) as Exclude<
                    ReturnType<typeof parseNegotiateProtocolVersion>,
                    false
                >;
                if (response === undefined) {
                    return true;
                }
                if (response === null) {
                    this.journal.add(
                        id,
                        NOTIFY.AFTER_AUTH_OK_BROKEN_NEGOTIATION_MSG,
                        optionallyHandleUnprocessedBinary(pc!)
                    );
                    return false;
                }
            }
            continue;
        } // while
        // state:
        //  ready4Query: true
        //  startupSent: true
        //  sslRequestSent: dont care
        //  sslReplyReceived: dont care, but must be equal to sslRequestSent
        //  authenticationOk: true (authentication completed)
        //
        //  at this point we consume:
        //      "parameter status(es)", "backend key" data, and "ready for query",
        // if there is data left, error
        if (bytesLeft(aux.parsingContext!)) {
            const en = optionallyHandleErrorAndNoticeResponse(pc!);
            // partial message received
            if (en === undefined) {
                return true; // need more data
            }
            if (en === null || en === false) {
                const bin = optionallyHandleUnprocessedBinary(pc!) as Uint8Array;
                const code = en === null ? NOTIFY.AFTER_R4Q_BROKEN_ERROR_NOTICE_MSG : NOTIFY.UNKNOWN_DATA_FORMAT;
                this.journal.add(id, code, optionallyHandleUnprocessedBinary(pc!));
                return false;
            }
            en.errors && aux.errors.push(...en.errors);
            en.notices && aux.notices.push(...en.notices);
            // still bytes remain
            if (bytesLeft(aux.parsingContext!)) {
                const bin = optionallyHandleUnprocessedBinary(pc!) as Uint8Array;
                // todo: this.journal.protocolError(bin)
                return false;
            }
        }
        // todo: this.journal.handleNotices(response)
        return 'done';
    }
}
