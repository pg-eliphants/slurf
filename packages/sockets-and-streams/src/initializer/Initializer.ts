import { List, insertBefore } from '../../src2/utils/list';
import Encoder from '../../src2/utils/Encoder';
import { PoolFirstResidence, SocketAttributes } from '../io/types';
import SocketIOManager from '../io/SocketIOManager';
import { SEND_STATUS_OK, SEND_STATUS_OK_WITH_BACKPRESSURE } from '../io/constants';
import { parse as parseParameterStatus } from '../protocol/messages/back/ParameterStatus';
import { parse as parseBackendKeyData } from '../protocol/messages/back/BackendKeyData';
import { parse as parseReady4Query } from '../protocol/messages/back/ReadyForQuery';
import { parse as parseNegotiateProtocolVersion } from '../protocol/messages/back/NegotiateProtocolVersion';
import createStartupMessage from '../protocol/messages/front/Startup';
import createSSLRequest from '../protocol/messages/front/SSLRequest';
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
} from '../protocol/messages/back/Authentication';

import { NOTIFY } from './constants';

import {
    ClientConfig,
    CreateSLLConnection,
    CreateSSLSocketSpec,
    CreateSocketConnection,
    CreateSocketSpec,
    PGConfig,
    PGSSLConfig,
    SSLFallback,
    SocketConnectOpts,
    SocketOtherOptions
} from './types';
import { JournalFactory, Journal } from '../journal';
import { createResolvePromiseExtended } from '../io/helpers';
import delayMillis from '../../src2/utils/delay';
import { normalizeConnectOptions, normalizeExtraOptions, validatePGSSLConfig } from './helper';
import { createConnection } from 'net';

export function InitializerFactory(
    // configs
    getSSLFallback: SSLFallback,
    getClientConfig: ClientConfig,
    createSocketSpec: CreateSocketSpec,
    createSSLSocketSpec: CreateSSLSocketSpec
) {
    return function newInitialize(
        attr: SocketAttributes,
        now: () => number,
        socketIoManager: SocketIOManager,
        journalFactory: ReturnType<typeof JournalFactory>
    ) {
        return new Initializer(
            attr,
            now,
            socketIoManager,
            getSSLFallback,
            getClientConfig,
            createSocketSpec,
            createSSLSocketSpec,
            journalFactory
        );
    };
}
export class Initializer /*implements IBaseInitializer<SocketAttributeAuxMetadata>*/ {
    private readonly journal: Journal<Initializer>;
    constructor(
        // bound to
        private readonly attr: SocketAttributes,
        // general utils
        private readonly now: () => number,
        // counterparty
        private readonly socketIoManager: SocketIOManager,
        // configs
        private readonly getSSLFallback: SSLFallback,
        private readonly getClientConfig: ClientConfig,
        private readonly createSocketSpec: CreateSocketSpec,
        private readonly createSSLSocketSpec: CreateSSLSocketSpec,
        // journals
        private readonly journalFactory: ReturnType<typeof JournalFactory>
    ) {
        this.journal = journalFactory(this);
    }
    // handle SSLRespone to SSLRequest Sent
    // ctx.buffer[cursor] is pre-checked to be 78 or 83
    // ctx.buffer.byteLength - ctx.cursor - ctx pre-checked to be 1
    /*
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
    */

    // return undefined -> incomplete authentication message received wait for more data from socket
    // return true -> authentication message was processds (does not mean handshake complete)
    // return null -> error orccured, malformed authentication message
    // true added means it is the actual value of the AuthenticationOk (and some others)
    /*
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
    */

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

    private requestConnectionParams(): { errors: Error[] } | { config: Required<PGConfig> } {
        let config: PGConfig | undefined;
        const setClientConfig: SetClientConfig = ($config: PGConfig) => {
            config = $config;
        };
        this.getClientConfig(setClientConfig);
        const result = validatePGConnectionParams(config);
        if (result === true) {
            const configFinal = normalizePGConfig(config!);
            return { config: configFinal };
        }
        return { errors: result.errors };
    }

    private async sendStartupMessage(attr: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        const ioMeta = attr.ioMeta;
        const r = this.requestConnectionParams();
        if ('errors' in r) {
            this.journal.add(ioMeta.id, NOTIFY.ERROR_REQUEST_PG_CONNECT_PARAMS, r.errors);
            return false;
        }
        const bin = createStartupMessage(r.config);
        if (!bin) {
            this.journal.add(ioMeta.id, NOTIFY.CREATE_STARTUPMSG_FAILURE);
            return false;
        }
        await this.socketIoManager.handleBackPressure(attr);
        const rc = this.socketIoManager.send(attr, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            this.journal.add(ioMeta.id, NOTIFY.BCK_PRESSURE_AFTER_STARTUPMSG);
        } else if (rc === SEND_STATUS_OK) {
            ioMeta.aux.startupSent = true;
            return true;
        }
        this.journal.add(ioMeta.id, NOTIFY.SEND_STARTUP_MESSAGE_FAILURE, rc);
        return false;
    }

    // this is called on a "connect" event
    public async onConnect(attr: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
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
            postLoginDataCheck: false,
            postLoginInitialization: false,
            errors: [],
            runtimeParameters: {},
            notices: []
        };
        // if ssl is configured, try that first
        const r = this.socketIoManager.getSLLSocketClassAndOptions(attr.ioMeta.pool.createdFor);
        // no ssl, use normal connection
        if (r === false) {
            return await this.sendStartupMessage(attr);
        }
        if ('errors' in r) {
            this.journal.add(id, NOTIFY.ERROR_SSL_WRONGLY_CONFIGURED, r.errors);
            return false;
        }
        // we configed for ssl, use it
        const bin = createSSLRequest(this.encoder);
        if (!bin) {
            this.journal.add(id, NOTIFY.CREATE_SSLREQUEST_MSG_FAILURE);
            return false;
        }
        const rc = this.socketIoManager.send(attr, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            this.journal.add(id, NOTIFY.BCK_PRESSURE_AFTER_SSLREQUESTMSG);
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
    /*
    public async handleData(item: Exclude<List<SocketAttributes<SocketAttributeAuxMetadata>>, null>): Promise<boolean | 'done'> {
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
        const pc = !parsingContext
            ? (aux.parsingContext = createParseContext(data, this.txtDecoder))
            : addBufferToParseContext(parsingContext, data);
        //
        // can happen (bug in nodejs?)
        //s
        const len = bytesLeft(pc!);

        // no handshake was ever initiated but pg-server sent us data
        if (!aux.startupSent && !aux.sslRequestSent) {
            this.journal.add(id, NOTIFY.GOT_DATA_BEFORE_INIT_HANDSHAKE, optionallyHandleUnprocessedBinary(pc!));
            return false;
        }
        const buffer = pc!.buffer;
        // sslRequest Sent but no answer received yes,
        if (aux.sslRequestSent && !aux.sslReplyReceived) {
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
        if (aux.startupSent === false) {
            this.journal.add(id, NOTIFY.RECEIVED_LATENT_DATA, optionallyHandleUnprocessedBinary(pc!));
            return false;
        }

        // state:
        //  startupSent: true
        //  sslRequestSent: dont care
        //  sslReplyReceived: dont care, but must be equal to sslRequestSent
        //  authenticationOk: false (authentication not completed)
        if (aux.authenticationOk === false) {
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
                        NOTIFY.AFTER_AUTH_OK_BROKEN_ERROR_NOTICE_MSG,
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
                aux.negotiateVersion = response;
            }
        } // while
        // state:
        //  postLoginDataCheck: false
        //  ready4Query: true
        //  startupSent: true
        //  sslRequestSent: dont care
        //  sslReplyReceived: dont care, but must be equal to sslRequestSent
        //  authenticationOk: true (authentication completed)
        //
        //  at this point we consume:
        //      "parameter status(es)", "backend key" data, and "ready for query",
        // if there is data left, error
        if (aux.postLoginDataCheck === false) {
            if (bytesLeft(aux.parsingContext!)) {
                const en = optionallyHandleErrorAndNoticeResponse(pc!);
                // partial message received
                if (en === undefined) {
                    return true; // need more data
                }
                if (en === null || en === false) {
                    const code = en === null ? NOTIFY.AFTER_R4Q_BROKEN_ERROR_NOTICE_MSG : NOTIFY.UNKNOWN_DATA_FORMAT;
                    this.journal.add(id, code, optionallyHandleUnprocessedBinary(pc!));
                    return false;
                }
                en.errors && aux.errors.push(...en.errors);
                en.notices && aux.notices.push(...en.notices);
                // still bytes remain
                if (bytesLeft(aux.parsingContext!)) {
                    const code = NOTIFY.UNKNOWN_DATA_FORMAT;
                    this.journal.add(id, code, optionallyHandleUnprocessedBinary(pc!));
                    return false;
                }
            }
            aux.postLoginDataCheck = true;
        }
        // aux
        if (aux.postLoginInitialization === false) {
            const rc = this.protocol.handleInitialization(pc);
            if (rc === undefined) {
                return true; // need more data
            }
                aux.postLoginInitialization = true;
                return 'done';
            }
            return rc;
        }
        re
        turn true;
    }
    */

    public getSLLSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              socketSSLFactory: () => CreateSLLConnection;
              sslOptions: PGSSLConfig;
          }
        | { errors: Error[] }
        | false {
        const errors: Error[] = [];
        const socketSSLConfig = this.createSSLSocketSpec({ forPool });
        let sslOptions = socketSSLConfig.sslOptions();
        if (!sslOptions) {
            return false;
        }
        if (!socketSSLConfig.socketSSLFactory) {
            // error if specifiy createSSLConnection function not set when requested
            return { errors: [new Error('SSL options specified, but createSSLConnection function not set')] };
        }
        const result = validatePGSSLConfig(sslOptions);
        if (result === false) {
            // ssl configuration absent
            return false;
        } else if (result === true) {
            // ssl configuration exist
            return { socketSSLFactory: socketSSLConfig.socketSSLFactory, sslOptions };
        }
        return { errors: result.errors };
    }

    private getSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              socketFactory: () => CreateSocketConnection;
              socketOptions: SocketConnectOpts;
              extraOptions: SocketOtherOptions;
          }
        | { errors: Error[] } {
        const errors: Error[] = [];
        const socketConfig = this.createSocketSpec({ forPool });
        let extraOptions = socketConfig.extraOpt();
        const socketOptions = socketConfig.socketConnectOptions();
        //
        if (!('socketFactory' in socketConfig)) {
            errors.push(new Error('No "socketFactory()" not defined in config'));
        }
        if (!socketOptions) {
            errors.push(new Error('No connect options given'));
        }
        const r = normalizeConnectOptions(socketOptions!);
        if ('errors' in r) {
            errors.push(...r.errors);
            return { errors }; // I have to put a "return" here otherwise typescript nags below
        }
        if (errors.length) {
            return { errors };
        }
        extraOptions = normalizeExtraOptions(extraOptions)!;
        return { socketFactory: socketConfig.socketFactory, socketOptions: r, extraOptions };
    }

    // Socket creation and connection starts here
    // here only the socket is created and wired up, the actial connect sequence happens somewhere else
    public createSocketForPool(forPool: PoolFirstResidence): Promise<void> {
        const r = this.getSocketClassAndOptions(forPool);
        if ('errors' in r) {
            return Promise.reject({ errors: r.errors });
        }
        const { socketFactory, socketOptions, extraOptions } = r;
        return this.socketIoManager.createSocket(socketFactory, socketOptions, extraOptions, forPool);
    }
}
