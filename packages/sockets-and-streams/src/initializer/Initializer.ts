import { List } from '../utils/list';
import Encoder from '../protocol/Encoder';
import { SocketAttributes } from '../io/types';
import { PGConfig, SetSSLFallback } from '../protocol/types';
import type { ISocketIOManager } from '../io/SocketIOManager';
import ProtocolManager from '../protocol/ProtocolManager';
import { SEND_STATUS_OK, SEND_STATUS_OK_WITH_BACKPRESSURE } from '../io/constants';
import type { GetSLLFallbackSpec } from './types';
import { parse as parseError } from '../protocol/messages/back/ErrorResponse';
import { parse as parseParameterStatus, ParameterStatus } from '../protocol/messages/back/ParameterStatus';
import { BackendKeyData, parse as parseBackendKeyData } from '../protocol/messages/back/BackendKeyData';
import { parse as parseReady4Query } from '../protocol/messages/back/ReadyForQuery';
import type { Notifications, Parse, ParseContext } from '../protocol/messages/back/types';
import {
    PARAM_STATUS,
    READY_4_QUERY,
    BACKEND_KEY_DATA,
    ERROR,
    NOTICE_RESPONSE
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
    SASLContinue,
    SASLFinal,
    parse as parseAuthenticationMsg
} from '../protocol/messages/back/authentication';

import { parse as parseNoticeResponse } from '../protocol/messages/back/NoticeResponse';

import { addBufferToParseContext, bytesLeft, createParseContext } from './helper';

import { IBaseInitializer, SocketAttributeAuxMetadata } from './types';
import createNS from '@mangos/debug-frontend';
import { INITIALIZER, INITIALIZER_EVENTS } from '../constants';

const debug = createNS(INITIALIZER);
const trace = createNS(INITIALIZER_EVENTS);

export default class Initializer /*implements IBaseInitializer<SocketAttributeAuxMetadata>*/ {
    constructor(
        private readonly encoder: Encoder,
        private readonly txtDecoder: TextDecoder,
        private readonly socketIoManager: ISocketIOManager<SocketAttributeAuxMetadata>,
        private readonly protocol: ProtocolManager,
        private readonly getSSLFallback: GetSLLFallbackSpec
    ) {
        socketIoManager.setInitializer(this);
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

    // when socket connected (non ssl), data is received (not good)
    // handle this situation
    private handleNoticeAndErrorResponseAndBinaryLeftOver(attr: SocketAttributes<SocketAttributeAuxMetadata>): number {
        // server sends me stuff before I send it any data
        // is it an error?
        const ctx = attr.ioMeta.aux.parsingContext!;
        {
            const rcErr = parseError(ctx);
            if (rcErr === undefined) {
                return true; //  wait for more data
            }
            if (rcErr === null) {
                // it was an error but malformed message
                // todo: log globally errno: socket_id, bin-data, cursor
                return false; // close socket
            }
            if (rcErr !== false) {
                // todo: log-globally: socket_id, errorMessage
            }
        }
        // is there also a NotifyMessage?
        {
            const rcNotice = parseNoticeResponse(ctx);
            if (rcNotice === undefined) {
                return true;
            }
            if (rcNotice === null) {
                // it was an error but malformed message
                // todo: log globally errno: socket_id, bin-data, cursor
                return false; // close socket
            }
            if (rcNotice !== false) {
                // todo: log-globally: socket_id, errorMessage
            }
        }
        if (bytesLeft(ctx)) {
            // todo: log-globally: socket_id, bytesLeft
            // global: err: context | errorResponse, NoticeResponse, bin, socket_id,
        }
        return false; // close this socket
    }
    // handle SSLRespone to SSLRequest Sent
    private async handleSSLResponse(attr: SocketAttributes<SocketAttributeAuxMetadata>) {
        const ctx = attr.ioMeta.aux.parsingContext!;
        const cursor = ctx.cursor;
        // 78 = 'N'
        if (ctx.buffer[cursor] === 78) {
            ctx.cursor += 1;
            trace('pg-server not configured for ssl');
            // pg-server not have ssl configured
            // fallback to non ssl possible?
            if (this.approveNonSSLConnection() === false) {
                // todo: err: no fallback to non-ssl connection allowed
                // todo: err: socket-id, no fallback to ssl
                return false;
            }
            attr.ioMeta.aux.startupSent = true;
            return await this.sendStartupMessage(attr);
        }
        // only possiblity left is 'S' (this is  pre-checked before entering this function)
        // 'S' = 83,
        ctx.cursor += 1;
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

        for (;;) {
            if (!bytesLeft(pc)) {
                return undefined; // load more
            }

            const parseResult = parseAuthenticationMsg(pc);
            if (parseResult === null) {
                // todo: errno: socket-id: malformed auth pg backend message
                return null;
            }
            if (parseResult === undefined) {
                // todo: notify: socket-id: incomplete received auth message
                return undefined;
            }
            if (parseResult === false) {
                return false;
            }

            if (parseResult.type === OK) {
                aux.authenticationOk = true;
                return 'done';
            }
            if (parseResult.type === MD5PASSWORD) {
                // todo: errno: md5 not supported
                if (aux.authenticationMD5Sent) {
                    // todo: errno: already sent
                    return null;
                }
                // todo: send salted MD5 password
                aux.authenticationMD5Sent = true;
                return null;
            }
            if (parseResult.type === CLEARTEXTPASSWORD) {
                // todo: error: cleartext not supported
                if (aux.authenticationClearTextSent) {
                    // todo: errno: already sent
                    return null;
                }
                // todo: send clearTextPassword
                aux.authenticationClearTextSent = true;
                return null;
            }
            // unsupprted auth
            // log errors
            return null;
        } // for(;;)
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

    private approveNonSSLConnection() {
        const r = this.protocol.requestConnectionParams();
        if ('errors' in r) {
            // log errors
            return false;
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

    private async sendStartupMessage(socket: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        const r = this.protocol.requestConnectionParams();
        if ('errors' in r) {
            // todo: errno: socket-id: invalid pg connection config: errors
            return false;
        }
        const bin = this.createStartupMessage(r.config);
        if (!bin) {
            // todo: errno: socket-id: cannot create pg-startup message
            return false;
        }
        const rc = this.socketIoManager.send(socket, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            // todo: notify-nr: socket-id, backpressure with pg-startup message
            await socket.ioMeta.backPressure;
        }
        if (rc === SEND_STATUS_OK) {
            socket.ioMeta.aux.startupSent = true;
            return true;
        }
        // todo: errno: socket-id: errors-from(rc)
        return false;
    }

    // this is called on a "connect" event
    public async startupAfterConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        // request ssl params from ioManager
        const id = socket.ioMeta.id;
        socket.ioMeta.aux = {
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
        const r = this.socketIoManager.getSLLSocketClassAndOptions(socket.ioMeta.pool.createdFor);
        // no ssl, use normal connection
        if (r === false) {
            return this.sendStartupMessage(socket);
        }
        if ('errors' in r) {
            // todo: we want to use ssl but misconfigured,
            // todo: log "misconfigured" error
            // return false -> end socket, remove from pool etc
            return false;
        }
        // we configed for ssl, use it
        const bin = this.encoder.init('64')?.nextMessage()?.i32(80877103)?.setLength().getMessage();
        if (!bin) {
            // todo: errno: socket-id: failed to create ssl-startup message: initializer,
            return false;
        }
        const rc = this.socketIoManager.send(socket, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            // todo: note_nr: socket-id: ssl-startup caused backpressure
            await socket.ioMeta.backPressure;
        }
        if (rc === SEND_STATUS_OK) {
            socket.ioMeta.aux.sslRequestSent = true;
            return true;
        }
        // todo: errno: socket-id: send-error-from(rc)
        return false;
    }

    // called on "secureConnect" event
    public startupAfterSSLConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        socket.ioMeta.aux.upgradedToSll = true;
        return this.sendStartupMessage(socket);
    }

    // initially server reacts to:
    //  sslRequest
    //  startupMessage
    public async handleData(
        item: Exclude<List<SocketAttributes<SocketAttributeAuxMetadata>>, null>,
        data: Uint8Array
    ): Promise<boolean | 'done'> {
        const len = data.byteLength;
        if (len === 0) {
            return true;
        }
        const attr = item.value;
        const ioMeta = attr.ioMeta;
        const aux = ioMeta.aux;
        const id = ioMeta.id;

        if (!aux.parsingContext) {
            aux.parsingContext = createParseContext(data, this.txtDecoder);
        } else {
            addBufferToParseContext(aux.parsingContext, data);
        }

        const ctx = aux.parsingContext;
        const buffer = ctx.buffer;

        const { startupSent, sslRequestSent, upgradedToSll, authenticationOk, sslReplyReceived } = aux;

        // no handshake was ever initiated but pg-server sent us data
        if (!startupSent && !sslRequestSent) {
            this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
            return false;
        }
        // sslRequest Sent but no answer received yes,
        if (sslRequestSent && !sslReplyReceived) {
            const firstByte = buffer[ctx.cursor];
            if (firstByte === 78 || firstByte === 83) {
                if (len === 1) {
                    aux.sslReplyReceived = true;
                    const rc = await this.handleSSLResponse(attr);
                    if (rc === true) {
                        this.socketIoManager.upgradeToSSL(item);
                    }
                    return rc;
                }
                // todo: log this not as an error but as an ATTACK
                // protocol violation: https://www.postgresql.org/docs/current/protocol-flow.html
                // this is possibly a buffer-stuffing attack (CVE-2021-23222).
                // https://www.postgresql.org/support/security/CVE-2021-23222
                // return false -> end socket, remove from pool etc
                return false;
            }
            this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
            return false;
        }

        // state:
        //  startupSent: false
        //  sslRequestSent: true (must)
        //  sslReplyReceived: true (must)
        //
        if (startupSent === false) {
            // somehow we got data after/while ending the socket
            this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
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
                // context "authentication"
                this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
                return false;
            }
            if (rc === 'done') {
                aux.authenticationOk = true;
            }
            return true;
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
            const idx = [PARAM_STATUS, READY_4_QUERY, BACKEND_KEY_DATA, ERROR, NOTICE_RESPONSE].indexOf(
                buffer[ctx.cursor]
            );
            if (idx < 0) {
                // context: forbidden message, after Authok received
                // todo: log error globally
                this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
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
                    // todo: global context: "param status" after authenOk
                    this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
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
                    // todo: global context: "ready for query" after authenOk
                    this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
                    return false;
                }
                aux.readyForQuery = response;
                const pc = aux.parsingContext!;
                const csr = pc!.cursor;
                pc.buffer = pc!.buffer.slice(csr);
                pc!.cursor = 0;
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
            // error or notice
            const rc = this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
            if (!(rc & 4)) {
                // todo: log error: context: before R4Q
                return false;
            }
        } // for
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
            const rc = this.handleNoticeAndErrorResponseAndBinaryLeftOver(attr);
            if (!(rc & 4)) {
                // todo: log error: context: just after R4Q,
                return false;
            }
        }
        return 'done';
    }
}
