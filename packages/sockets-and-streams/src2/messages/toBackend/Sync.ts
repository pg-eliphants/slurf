/*
Sync (F) 
Byte1('S')
Identifies the message as a Sync command.

Int32(4)
Length of message contents in bytes, including self.
*/

import Encoder from '../../utils/Encoder';


export default function createSyncMessage(encoder: Encoder): Uint8Array | undefined {
    return encoder.init(64).nextMessage(0x53)?.setLength().getMessage();
}
