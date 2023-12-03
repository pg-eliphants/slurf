import { List } from '../utils/list';
import Encoder from '../protocol/Encoder';
import { SocketAttributes, CreateSLLConnection, PGSSLConfig } from '../io/types';
import { PGConfig, SetSSLFallback } from '../protocol/types';
import type { ISocketIOManager } from '../io/SocketIOManager';
import ProtocolManager from '../protocol/ProtocolManager';
import { SEND_NOT_OK } from '../io/constants';
import type { GetSLLFallbackSpec } from './types';
import { parse as parseError, match as MatchError, Field } from '../protocol/messages/back/ErrorResponse';
import type { ParseContext } from '../protocol/messages/back/types';
import {
    OK,
    MD5PASSWORD,
    CLEARTEXTPASSWORD,
    KERBEROSV5,
    GSS,
    GSSCONTINUE,
    SSPI,
    SASL,
    SASLCONTINUE,
    SASLFINAL,
    parse as parseAuthenticationMsg
} from '../protocol/messages/back/authentication';
import type { AuthenticationOk } from '../protocol/messages/back/authentication';

export type SocketAttributeAuxMetadata = {
    sslRequestSent: boolean;
    startupSent: boolean;
    upgradedToSll: boolean;
    authenticationOk: boolean;
    authenticationMD5Sent: boolean;
    authenticationClearTextSent: boolean;
    parameterStatusReceived: boolean;
    readyForQuery: boolean;
    parsingContext?: ParseContext;
    error: null | Field[];
};

export default class Initializer {
    constructor(
        private readonly encoder: Encoder,
        private readonly txtDecoder: TextDecoder,
        private readonly socketIoManager: ISocketIOManager<SocketAttributeAuxMetadata>,
        private readonly protocol: ProtocolManager,
        private readonly getSSLFallback: GetSLLFallbackSpec
    ) {}

    // return undefined -> incomplete ReadyForQuery Data  received wait for more data from socket
    // return true -> processReadyForQuery Successfully processed
    // return null -> error orccured, malformed backEndKeyData or Error encountered
    private processReadyForQuery(aux: SocketAttributeAuxMetadata): true | undefined | null {
        return null;
    }

    // return undefined -> incomplete backendKey Data  received wait for more data from socket
    // return true -> backEndKeyData Successfully processed
    // return null -> error orccured, malformed backEndKeyData or Error encountered
    private processBackendKeyData(aux: SocketAttributeAuxMetadata): true | undefined | null {
        return null;
    }

    // return undefined -> incomplete authentication message received wait for more data from socket
    // return true -> parameter status message was processes
    // return null -> error orccured, malformed parmater status message
    private handleParameterStatusses(aux: SocketAttributeAuxMetadata): boolean | undefined | null {
        return null;
    }

    // return undefined -> incomplete authentication message received wait for more data from socket
    // return true -> authentication message was processes (does not mean handshake complete)
    // return null -> error orccured, malformed authentication message
    private handleAuthentication(item: SocketAttributes<SocketAttributeAuxMetadata>): true | undefined | null {
        const aux = item.ioMeta.aux;
        const pc = aux.parsingContext!;
        if (pc.cursor >= pc.buffer.byteLength) {
            return undefined;
        }
        const parseResult = parseAuthenticationMsg(pc);
        // dont merge below 2 if statements,  typescript inference is not happy
        if (parseResult === null) {
            return null;
        }
        if (parseResult === undefined) {
            return undefined;
        }
        if (parseResult === false) {
            // is an error for sure, we expect an Authentication
            const errMsg = parseError(pc);
            if (errMsg === undefined) {
                return undefined;
            }
            if (errMsg === null || errMsg === false) {
                // yes it was an error message (but scrambled), or no err message
                // log bindump and abort
                return null;
            }
            aux.error = errMsg;
            return null;
        }
        if (parseResult.type === OK) {
            aux.authenticationOk = true;
            return true;
        }
        if (parseResult.type === MD5PASSWORD) {
            if (aux.authenticationMD5Sent) {
                // log error
                return null;
            }
            // send salted MD5 password
            aux.authenticationMD5Sent = true;
            return true;
        }
        if (parseResult.type === CLEARTEXTPASSWORD) {
            if (aux.authenticationClearTextSent) {
                // log error
                return null;
            }
            // send clearTextPassword
            aux.authenticationClearTextSent = true;
            return true;
        }
        // unsupprted auth
        // log errors
        return null;
    }

    private createStartupMessage(config: Required<PGConfig>): Uint8Array | undefined {
        const bin = this.encoder
            .init('128')
            ?.i32(196608)
            ?.cstr('user')
            ?.cstr(config.user)
            ?.cstr('database')
            ?.cstr(config.database)
            //?.cstr('replication')
            //?.cstr(String(config.replication))
            // you can add more options here, check out "client connect options"
            ?.cstr('')
            ?.getWithLenght();
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

    private sendStartupMessage(socket: SocketAttributes<SocketAttributeAuxMetadata>): boolean {
        const r = this.protocol.requestConnectionParams();
        if ('errors' in r) {
            // TODO
            // log errors
            // return false -> end socket, remove from pool etc
            return false;
        }
        const bin = this.createStartupMessage(r.config);
        if (!bin) {
            //TODO handle this error
            // return false -> end socket, remove from pool etc
            return false;
        }
        if (this.socketIoManager.send(socket, bin) === SEND_NOT_OK) {
            // TODO: msg not sent
            // log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        // all ok
        socket.ioMeta.aux.startupSent = true;
        return true;
    }

    // this is called on a "connect" event
    public startupAfterConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): boolean {
        // request ssl params from ioManager
        socket.ioMeta.aux = {
            sslRequestSent: false,
            startupSent: false,
            upgradedToSll: false,
            authenticationOk: false,
            authenticationMD5Sent: false,
            authenticationClearTextSent: false,
            parameterStatusReceived: false,
            readyForQuery: false,
            error: null
        };
        const r = this.socketIoManager.getSLLSocketClassAndOptions(socket.ioMeta.pool.createdFor);
        // no ssl, use normal connection
        if (r === false) {
            return this.sendStartupMessage(socket);
        }
        if ('errors' in r) {
            //     // we want to use ssl but misconfigured,
            //     // log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        // we have ssl use it
        const bin = this.encoder.init('64')?.i32(80877103)?.getWithLenght();
        if (!bin) {
            //TODO handle this error
            // return false -> end socket, remove from pool etc
            return false;
        }
        if (this.socketIoManager.send(socket, bin) === SEND_NOT_OK) {
            //TODO handle this error
            // return false -> end socket, remove from pool etc
            return false;
        }
        socket.ioMeta.aux.sslRequestSent = true;
        return true;
    }

    public startupAfterSSLConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): boolean {
        socket.ioMeta.aux.upgradedToSll = true;
        return this.sendStartupMessage(socket);
    }

    public handleData(
        item: Exclude<List<SocketAttributes<SocketAttributeAuxMetadata>>, null>,
        data: Uint8Array
    ): boolean {
        // create parsing context if not exist
        if (item.value.ioMeta.aux.parsingContext === undefined) {
            item.value.ioMeta.aux.parsingContext = {
                buffer: data,
                cursor: 0,
                txtDecoder: this.txtDecoder
            };
        } else {
            // merge
            const old = item.value.ioMeta.aux.parsingContext.buffer;
            item.value.ioMeta.aux.parsingContext.buffer = new Uint8Array(old.byteLength + data.byteLength);
            item.value.ioMeta.aux.parsingContext.buffer.set(old, 0);
            item.value.ioMeta.aux.parsingContext.buffer.set(data, old.byteLength);
        }
        const parseCtx = item.value.ioMeta.aux.parsingContext;
        const len = data.byteLength;

        // seen weirder shit happen before
        if (len === 0) {
            return true;
        }
        if (item.value.ioMeta.pool.current !== 'created') {
            // todo:
            // log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        const aux = item.value.ioMeta.aux;
        const { startupSent, sslRequestSent, upgradedToSll, authenticationOk, parameterStatusReceived } = aux;
        if (!startupSent && !sslRequestSent) {
            // this is sort of "out of band" data
            console.log('the server is sending us an error');
            // todo: prolly the server is sending us an error of some sort, outside the "initializer flow" abort
            // todo log errors
            // return false -> end socket, remove from pool etc
            return false;
        }
        if (sslRequestSent && !upgradedToSll) {
            // 78 = 'N'
            if (data[0] === 78 && len === 1) {
                console.log('server not configured for ssl');
                // pg-server not have ssl configured
                // request to continue
                if (this.approveNonSSLConnection() === false) {
                    // TODO: abort close the connection, callback to ioManager
                    // return false -> end socket, remove from pool etc
                    return false;
                }
                parseCtx.cursor = 1;
                return this.sendStartupMessage(item.value);
            }
            //'S' = 83, ok to upgrade to SSL
            else if (data[0] === 83 && len === 1) {
                parseCtx.cursor = 1;
                return this.socketIoManager.upgradeToSSL(item);
            } else if (data[0] === 69) {
                // 'E' = 69
                // at this point a legal Error Response was given,
                // TODO parse ErrorResponse, log error
                // return false -> end socket, remove from pool etc
                const errorResponse = parseError(parseCtx);
                if (errorResponse) {
                    // console.log(errorResponse);
                }
                // todo,
                // log binddump, will all data or all data after the valid error response
                console.log(parseCtx.buffer.slice(parseCtx.cursor));
                return false;
            }
            // this is possibly a buffer-stuffing attack (CVE-2021-23222).
            // https://www.postgresql.org/support/security/CVE-2021-23222
            // return false -> end socket, remove from pool etc
            console.log('buffer-stuffing attack?', parseCtx.buffer.slice(parseCtx.cursor));
            return false;
        }
        if (startupSent === false) {
            // forbidden state
            // todo: log errors
            // return false -> end socket, remove from pool etc
            return false;
        }
        if (!authenticationOk) {
            const rc = this.handleAuthentication(item.value);
            if (rc === undefined) {
                return true; // wait for more data
            }
            if (rc === null) {
                // either an error occured or a non authentication message was received
                // todo log specific error
                return false;
            }
            if (!aux.authenticationOk) {
                // not done with authentication
                // wait for next steps from pg
                return true;
            }
            // fall through
        }
        // authentication complete
        // at this point we consume "parameter status(es)", "backend key" data, and "ready for query"
        while (!aux.readyForQuery) {
            // process parameter status
            for (
                let paramStatusResult = this.handleParameterStatusses(aux);
                ;
                paramStatusResult = this.handleParameterStatusses(aux)
            ) {
                if (paramStatusResult === null) {
                    // todo: log buffer/error
                    return false;
                }
                if (paramStatusResult === undefined) {
                    // wait for  more data
                    return true;
                }
                if (paramStatusResult === false) {
                    break;
                }
            }
            // process backend key data
            const bckDataResult = this.processBackendKeyData(aux);
            if (bckDataResult === null) {
                // todo: log buffer/error
                return false;
            }
            if (bckDataResult === undefined) {
                // wait for  more data
                return true;
            }
            const readyForQueryResult = this.processReadyForQuery(aux);
            if (readyForQueryResult === null) {
                // todo: log buffer/error
                return false;
            }
            if (readyForQueryResult === undefined) {
                // wait for  more data
                return true;
            }
            if (parseCtx.buffer.byteLength > parseCtx.cursor) {
                // todo: all data must have been consumed, if not? this is an internal consistency violation
                // log error
                return false;
            }
        }

        // handle further authentication related responses from server
        // - E
        // - various R
        const r = parseError(parseCtx);
        if (r === undefined) {
            return true;
        }
        if (r === null) {
            console.log('error parsing error-response');
            return false;
        }
        if (r === false) {
            // consume all data
            parseCtx.buffer = parseCtx.buffer.slice(0, 0);
            parseCtx.cursor = 0;
        }
        console.log('HERE WE ARE', r);
        return true;
    }
}
