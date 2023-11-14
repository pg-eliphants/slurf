import SocketIOManager from '../io/SocketIOManager';
import { SocketAttributes, PGSSLConfig } from '../io/types';
import MemoryManager from '../utils/MemoryManager';
import {
    ProtocolAttributes,
    GetClientConfig,
    PGConfig,
    SetClientConfig,
    ErrorResponse,
    GetSLLFallbackSpec,
    SetSSLFallback
} from './types';
import Encoder from './Encoder';
import Decoder from './Decoder';
import { normalizePGConfig, validatePGConnectionParams, getChar } from './helpers';
import dump from 'buffer-hexdump';
import {
    Fstartup,
    Iconnected,
    protocolTag,
    FSLLstartup,
    NotificationAndErrorFields,
    BErrorResponse,
    ISLLUpgrade
} from './constants';

export default class ProtocolManager {
    constructor(
        private readonly socketIOManager: SocketIOManager,
        private readonly encoder: Encoder,
        private readonly decoder: Decoder,
        private readonly getClientConfig: GetClientConfig,
        private readonly getSSLFallback: GetSLLFallbackSpec
    ) {
        this.socketIOManager.setProtocolManager(this);
    }

    private createStartupMessage(config: Required<PGConfig>): Uint8Array | undefined {
        const bin = this.encoder
            .init('128')
            ?.i32(196608)
            ?.cstr('user')
            ?.cstr(config.user)
            ?.cstr('database')
            ?.cstr(config.database)
            ?.cstr('replication')
            ?.cstr(String(config.replication))
            // you can add more options here, check out "client connect options"
            ?.cstr('')
            ?.getWithLenght();
        return bin;
    }

    private createSSLRequest(): Uint8Array | undefined {
        const bin = this.encoder.init('128')?.i32(80877103)?.getWithLenght();
        return bin;
    }

    private handleReponseSSLRequest(pattr: ProtocolAttributes, bin: Uint8Array, len: number): boolean {
        if (pattr.meta.continue) {
            // continue with message
            return true;
        }

        if (getChar(bin) === 'N' && len === 1) {
            console.log('server not configured for ssl');
            // pg-server not have ssl configured
            // request to continue
            if (this.approveNonSSLConnection() === false) {
                // TODO: abort close the connection, callback to ioManager
                return false;
            }
            // request ioManager to upgrade socket to SSL connection
            // TODO: send startup Message
            const r = this.requestConnectionParams();
            if ('errors' in r) {
                // TODO: abort, close the connection, callback to ioManager
                return false;
            }
            const bin = this.createStartupMessage(r.config);
            if (!bin) {
                //TODO handle this error
                return false;
            }
            pattr.meta.state = Fstartup;
            this.socketIOManager.send(pattr.connection, bin);
            return true;
        }
        if (getChar(bin) === 'S') {
            console.log('socket upgrade');
            console.log('socket readableflowing', pattr.connection.socket?.readableFlowing);
            pattr.meta.state = ISLLUpgrade;
            this.socketIOManager.upgradeToSSL(pattr.connection);
            // TODO: do TSL socket upgrade,
            return true;
        }
        // TODO emit error and close connection

        // at this point you got more then one byte
        if (getChar(bin) !== 'E') {
            // this is possibly a buffer-stuffing attack (CVE-2021-23222).
            // https://www.postgresql.org/support/security/CVE-2021-23222/
            // TODO: close socket, log error
            return false;
        }
        // at this point a legal Error Response was given,
        // TODO parse ErrorResponse
        // TOOD close socket, log error
        return false;
    }

    public binDump(attr: SocketAttributes, data: Uint8Array, len: number): boolean {
        const pgAttr: ProtocolAttributes = attr.protoMeta as ProtocolAttributes;
        if (pgAttr.tag !== protocolTag) {
            // maybe this is a bit overly defensive?
            console.error('wrong protocol %o', attr.protoMeta);
            return false; // counterparty getting backpressure notification
        }
        console.log('binDump called', pgAttr.meta.state, pgAttr.tag);
        switch (pgAttr.meta.state) {
            case FSLLstartup:
                return this.handleReponseSSLRequest(pgAttr, data, len);
        }
        console.log(dump(data.slice(0, len)));
        return true; // true means do not pause the stream on this "connection"
    }

    private requestConnectionParams(): { errors: Error[] } | { config: Required<PGConfig> } {
        let config: PGConfig | undefined;
        const setClientConfig: SetClientConfig = ($config: PGConfig) => {
            config = $config;
        };
        this.getClientConfig(setClientConfig);
        const result = validatePGConnectionParams(config);
        if (result === true) {
            return { config: config! } as { config: Required<PGConfig> };
        }
        return { errors: result.errors };
    }

    private approveNonSSLConnection() {
        const r = this.requestConnectionParams();
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

    /*

        return { config, ssl };

        const configFinal: Required<PGConfig> = normalizePGConfig(config);
        if (configFinal.ssl === false) {
            const bin = this.createStartupMessage(configFinal);
            if (!bin) {
                return; // todo: log error prolly out of memory issue
            }
            (item.meta.state.protocolState as ProtocolStateAll) = FstartupMessage;
            const rc = this.socketIOManager.send(item, bin);
            // rc can be non "Ok", closed, errored, backpressure, etc, low level emittance whill be handled by iomaneger
            // if rc is "ok", then advance to the next state and wait for reply of pg to know what to do next
            // if backpressure is an issue at this point then the pg server might be massivly busy
            //  -- todo: the iomanager needs to set this into a state
            //  -- todo: schedule a send for when the drain happens
            return;
        }
        //ssl
        const bin = this.createSSLRequest();
        if (!bin) {
            return; //todo: log error prolly out of memory issue
        }
        const rc = this.socketIOManager.send(item, bin);
        // rc can be non "Ok", closed, errored, backpressure, etc, low level emittance whill be handled by iomaneger
        // if rc is "ok", then advance to the next state and wait for reply of pg to know what to do next
        // if backpressure is an issue at this point then the pg server might be massivly busy
        //  -- todo: the iomanager needs to set this into a state
        //  -- todo: schedule a send for when the drain happens
        return;
    }*/

    public protocalWrap(item: SocketAttributes): void {
        const rc: ProtocolAttributes = {
            tag: protocolTag,
            meta: {
                state: Iconnected
            },
            connection: item
        };
        item.protoMeta = rc;
    }

    public startSSL(item: SocketAttributes): void {
        const pa = item.protoMeta as ProtocolAttributes;
        const bin = this.createSSLRequest();
        if (!bin) {
            //TODO handle this error
            return;
        }
        pa.meta.state = FSLLstartup;
        this.socketIOManager.send(item, bin);
        return;
    }

    public startupMsg(item: SocketAttributes): void {
        const pa = item.protoMeta as ProtocolAttributes;
        const r = this.requestConnectionParams();
        if ('errors' in r) {
            // log errors
            // end socket
            // TODO
            return;
        }
        const bin = this.createStartupMessage(r.config);
        if (!bin) {
            //TODO handle this error
            // end socket
            return;
        }
        pa.meta.state = Fstartup;
        this.socketIOManager.send(item, bin);
        return;
    }
}
