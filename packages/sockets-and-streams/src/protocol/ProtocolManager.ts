import SocketIOManager from '../io/SocketIOManager';
import { SocketAttributes } from '../io/types';
import MemoryManager from '../utils/MemoryManager';
import {
    ProtocolAttributes,
    GetClientConfig,
    PGConfig,
    SetClientConfig,
    SSLFallback,
    GetSSLConfig,
    PGSSLConfig,
    SetSSLConfig
} from './types';
import Encoder from './Encoder';
import { normalizePGConfig, validatePGConnectionParams, validatePGSSLConfig } from './helpers';
import dump from 'buffer-hexdump';
import { Fstartup, Iconnected, protocolTag, FSLLstartup } from './constants';

/*
function concatArrayBuffers(...bufs){
	const result = new Uint8Array(bufs.reduce((totalSize, buf)=>totalSize+buf.byteLength,0));
	bufs.reduce((offset, buf)=>{
		result.set(buf,offset)
		return offset+buf.byteLength
	},0)
	return result.buffer
}
*/

export default class ProtocolManager {
    constructor(
        private readonly socketIOManager: SocketIOManager,
        private readonly encoder: Encoder,
        private readonly getClientConfig: GetClientConfig,
        private readonly getSSLConfig: GetSSLConfig
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

    public binDump(attr: SocketAttributes, data: Uint8Array, len: number): boolean {
        const pgAttr: ProtocolAttributes = attr.protoMeta as ProtocolAttributes;
        if (pgAttr.tag !== protocolTag) {
            // maybe this is a bit overly defensive?
            console.error('wrong protocol %o', attr.protoMeta);
            return false; // counterparty getting backpressure notification
        }
        console.log('binDump called', pgAttr.meta.state, pgAttr.tag);
        console.log(dump(data.slice(0, len)));
        return true; // true means do not pause the stream on this "connection"
    }

    private requestConnectionParams(item: ProtocolAttributes): { errors?: Error[]; config?: Required<PGConfig> } {
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

    private requestSSLConnectionParams(item: ProtocolAttributes): { errors?: Error[]; config?: PGSSLConfig } {
        let config: PGSSLConfig | undefined;
        let sslFallback: SSLFallback | undefined;
        const setSSLConfig: SetSSLConfig = ($config: PGSSLConfig, $sslFallback: SSLFallback) => {
            config = $config;
            sslFallback = $sslFallback;
        };
        this.getSSLConfig(setSSLConfig);
        const result = validatePGSSLConfig(config);
        if (result === false) {
            return {}; // no error, no config
        }
        if (result === true) {
            return { config: config! };
        }
        return { errors: result.errors };
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

    public init(item: SocketAttributes): void {
        // wire up the protocol object
        const rc: ProtocolAttributes = {
            tag: protocolTag,
            meta: {
                state: Iconnected
            },
            connection: item
        };
        rc.connection.protoMeta = rc;
        // even if we have to do ssl first no harm in asking connection param and save us the trouble
        const { errors, config } = this.requestConnectionParams(rc);
        if (Array.isArray(errors)) {
            // TODO log errors and TODO shutdown initiate
            return;
        }
        const { errors: errorsSSL, config: configSSL } = this.requestSSLConnectionParams(rc);

        if (configSSL) {
            const bin = this.createSSLRequest();
            if (!bin) {
                //TODO handle this error
                return;
            }
            rc.meta.state = FSLLstartup;
            this.socketIOManager.send(item, bin);
            return;
        }

        if (Array.isArray(errorsSSL)) {
            // TODO log errors and TODO shutdown initiate
            return;
        }
        const bin = this.createStartupMessage(config!);
        if (!bin) {
            //TODO handle this error
            return;
        }
        rc.meta.state = Fstartup;
        this.socketIOManager.send(item, bin);
        return;
    }
}
