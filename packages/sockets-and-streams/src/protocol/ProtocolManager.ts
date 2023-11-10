import type SocketIOManager from '../io/SocketIOManager';
import { SocketAttributes } from '../io/types';
import MemoryManager from '../utils/MemoryManager';
import { ProtocolStateAll, GetClientConfig, PGConfig } from './types';
import Encoder from './Encoder';
import { normalizePGConfig } from './helpers';
import dump from 'buffer-hexdump';

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
        private readonly getClientConfig: GetClientConfig
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

    public binDump(attr: SocketAttributes, data: DataView): boolean {
        console.log('binDump called');
        console.log(dump(new Uint8Array(data.buffer)));
        return true; // true means do not pause the stream on this "connection"
    }

    public initStartup(item: SocketAttributes): void {
        let config: PGConfig | undefined;
        function setClientConfig(_config: PGConfig) {
            config = _config;
        }
        this.getClientConfig(setClientConfig);
        if (config === undefined) {
            // error config must be provided
            return;
        }
        if (!config.user) {
            // error user must be provided
            return;
        }

        if (typeof config.user !== 'string' || config.user.length === 0) {
            // user must be a non empty string
            return;
        }

        const configFinal: Required<PGConfig> = normalizePGConfig(config);
        if (configFinal.ssl === false) {
            const bin = this.createStartupMessage(configFinal);
            if (!bin) {
                return; //todo: log error prolly out of memory issue
            }
            (item.meta.state.protocolState as ProtocolStateAll) = 'setup-connection-01-startup';
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
    }
}
