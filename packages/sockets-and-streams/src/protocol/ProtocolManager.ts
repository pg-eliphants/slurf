import type SocketIOManager from '../io/SocketIOManager';
import { SocketAttributes } from '../io/types';
import MemoryManager from '../utils/MemoryManager';
import { ProtocolStateAll, GetClientConfig, PGConfig } from './types';
import Encoder from './Encoder';
import { normalizePGConfig } from './helpers';

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
    /**
     * 
     * 
     * StartupMessage (F) 
            Int32
            Length of message contents in bytes, including self.

            Int32(196608)
            The protocol version number. The most significant 16 bits are the major version number (3 for the protocol described here). The least significant 16 bits are the minor version number (0 for the protocol described here).

            The protocol version number is followed by one or more pairs of parameter name and value strings. A zero byte is required as a terminator after the last name/value pair. Parameters can appear in any order. user is required, others are optional. Each parameter is specified as:

            String
            The parameter name. Currently recognized names are:

            user
            The database user name to connect as. Required; there is no default.

            database
            The database to connect to. Defaults to the user name.

            options
            Command-line arguments for the backend. (This is deprecated in favor of setting individual run-time parameters.) Spaces within this string are considered to separate arguments, unless escaped with a backslash (\); write \\ to represent a literal backslash.

            replication
            Used to connect in streaming replication mode, where a small set of replication commands can be issued instead of SQL statements. Value can be true, false, or database, and the default is false. See Section 55.4 for details.

            In addition to the above, other parameters may be listed. Parameter names beginning with _pq_. are reserved for use as protocol extensions, while others are treated as run-time parameters to be set at backend start time. Such settings will be applied during backend start (after parsing the command-line arguments if any) and will act as session defaults.

            String
            The parameter value.
     */

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
            ?.cstr('')
            ?.getWithLenght();
        return bin;
    }

    public binDump(attr: SocketAttributes, data: DataView): boolean {
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

        (item.meta.state.protocolState as ProtocolStateAll) = 'setup-connection-01-startup';
        // there is a bunch of handshaking back and forth that needs to be done here
        // this is just the initial step in the "connection state machine" (there can be several state machines managing pg-client connections)
        // get a small piece of memory off the slab
        // synthesize the startup message
        // send it on the socket, -> should I use the "socket.write" instance here or let the socketIOManager be the one to only "touch" the socket
        const bin = this.createStartupMessage(configFinal);
        if (!bin) {
            return; //todo: log error prolly out of memory issue
        }
        const rc = this.socketIOManager.send(item, bin);
        // rc can be non "Ok", closed, errored, backpressure, etc, low level emittance whill be handled by iomaneger
        // if rc is "ok", then advance to the next state and wait for reply of pg to know what to do next
        // if backpressure is an issue at this point then the pg server might be massivly busy
        //  -- todo: the iomanager needs to set this into a state
        //  -- todo: schedule a send for when the drain happens
    }
}
