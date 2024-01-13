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
import type { Notifications } from '../protocol/messages/back/types';
import {
    OK,
    MD5PASSWORD,
    CLEARTEXTPASSWORD,
    parse as parseAuthenticationMsg
} from '../protocol/messages/back/authentication';
import { bytesLeft } from './helper';

import { IBaseInitializer, SocketAttributeAuxMetadata } from './types';

export default class Initializer implements IBaseInitializer<SocketAttributeAuxMetadata> {
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

    // return undefined -> incomplete authentication message received wait for more data from socket
    // return true -> authentication message was processds (does not mean handshake complete)
    // return null -> error orccured, malformed authentication message
    // true added means it is the actual value of the AuthenticationOk (and some others)
    private handleAuthentication(item: SocketAttributes<SocketAttributeAuxMetadata>): undefined | null | true {
        const aux = item.ioMeta.aux;
        const pc = aux.parsingContext!;
        if (!bytesLeft(pc)) {
            return undefined; // load more
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
            // is an error for sure, we expect an Authentication message of some kind
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
        const rc = this.socketIoManager.send(socket, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            await socket.ioMeta.backPressure;
        }
        if (rc === SEND_STATUS_OK) {
            socket.ioMeta.aux.startupSent = true;
            return true;
        }
        // todo: log error etc
        return false;
    }

    // this is called on a "connect" event
    public async startupAfterConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        // request ssl params from ioManager
        socket.ioMeta.aux = {
            sslRequestSent: false,
            startupSent: false,
            upgradedToSll: false,
            authenticationOk: false,
            authenticationMD5Sent: false,
            authenticationClearTextSent: false,
            error: null,
            runtimeParameters: {}
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
        const bin = this.encoder.init('64')?.nextMessage()?.i32(80877103)?.setLength().getMessage();
        if (!bin) {
            // TODO handle this error
            // return false -> end socket, remove from pool etc
            return false;
        }
        const rc = this.socketIoManager.send(socket, bin);
        if (rc === SEND_STATUS_OK_WITH_BACKPRESSURE) {
            await socket.ioMeta.backPressure;
        }
        if (rc === SEND_STATUS_OK) {
            socket.ioMeta.aux.sslRequestSent = true;
            return true;
        }
        // TODO handle this error
        // return false -> end socket, remove from pool etc
        return false;
    }

    public startupAfterSSLConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): Promise<boolean> {
        socket.ioMeta.aux.upgradedToSll = true;
        return this.sendStartupMessage(socket);
    }

    public async handleData(
        item: Exclude<List<SocketAttributes<SocketAttributeAuxMetadata>>, null>,
        data: Uint8Array
    ): Promise<boolean | 'done'> {
        // create parsing context if not exist
        const attr = item.value;
        if (attr.ioMeta.aux.parsingContext === undefined) {
            attr.ioMeta.aux.parsingContext = {
                buffer: data,
                cursor: 0,
                txtDecoder: this.txtDecoder
            };
        } else {
            // merge
            const old = attr.ioMeta.aux.parsingContext.buffer;
            attr.ioMeta.aux.parsingContext.buffer = new Uint8Array(old.byteLength + data.byteLength);
            attr.ioMeta.aux.parsingContext.buffer.set(old, 0);
            attr.ioMeta.aux.parsingContext.buffer.set(data, old.byteLength);
        }
        const parseCtx = attr.ioMeta.aux.parsingContext;
        const len = data.byteLength;

        // seen weirder shit happen before
        if (len === 0) {
            return true;
        }
        if (attr.ioMeta.pool.current !== 'created') {
            // todo:
            // log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        const aux = attr.ioMeta.aux;
        const { startupSent, sslRequestSent, upgradedToSll, authenticationOk } = aux;
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
                return this.sendStartupMessage(attr);
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
                if (errorResponse === undefined) {
                    return true; // get more data, you will end up re-parsing the Error again
                }
                if (errorResponse === null) {
                    // todo: parsing the error resulted in an error (malformed error message)
                    //
                    return false;
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
            const rc = this.handleAuthentication(attr);
            if (rc === undefined) {
                return true; // wait for more data
            }
            if (rc === null) {
                // either an error occured or a non authentication message was received
                // todo log specific error
                return false;
            }
            // was false, but now set to true?
            if (!aux.authenticationOk) {
                // not done with authentication
                // wait for more data from pg
                return true;
            }
            // fall through
        }
        // authentication complete
        // at this point we consume "parameter status(es)", "backend key" data, and "ready for query"
        while (!aux.readyForQuery) {
            if (!bytesLeft(aux.parsingContext!)) {
                return true; // wait for more data to arrive
            }
            const { cursor, buffer } = aux.parsingContext!;
            const idx = [83, 90, 75, 69].indexOf(buffer[cursor]);
            if (idx < 0) {
                //todo: forbidden message
                //log error
                return false;
            }
            // 83, 'S' param status
            if (idx === 0) {
                const response = parseParameterStatus(aux.parsingContext!) as ParameterStatus | undefined;
                // cannot return false, because 'S' is prechecked to exist
                if (response === undefined) {
                    return true; // wait for more data to arrive
                }
                aux.runtimeParameters[response.name] = response.value;
                continue;
            }
            // 90, 'Z', ready for query
            if (idx === 1) {
                const response = parseReady4Query(aux.parsingContext!) as number | undefined;
                // cannot return false, because 'S' is prechecked to exist
                if (response === undefined) {
                    return true; // wait for more data to arrive
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
                const response = parseBackendKeyData(aux.parsingContext!) as BackendKeyData | undefined;
                // cannot return false, because 'K' is prechecked to exist
                if (response === undefined) {
                    return true; // wait for more data to arrive
                }
                aux.pid = response.pid;
                aux.cancelSecret = response.secret;
                continue;
            }
            // 69, 'E', error
            if (idx === 3) {
                const response = parseError(aux.parsingContext!) as null | undefined | Notifications;
                // cannot return false, because 'S' is prechecked to exist
                if (response === undefined) {
                    return true; // wait for more data to arrive
                }
                if (response === null) {
                    // todo, log error
                    // actually parsing de error went wrong (likely unsupported notification type)
                    return false;
                }
                // todo, log server error message;
                console.log('error message received:', response);
                continue;
            }
        }
        // if there is data left, error
        if (bytesLeft(aux.parsingContext!)) {
            //todo: log error
            return false;
        }
        return 'done';
    }
}
