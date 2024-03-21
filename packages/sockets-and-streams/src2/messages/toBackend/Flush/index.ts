/*
    Flush (F) 
    Byte1('H')
    Identifies the message as a Flush command.

    Int32(4)
    Length of message contents in bytes, including self.
*/

import Encoder from '../../../utils/Encoder';

export default function createFlushMessage(encoder: Encoder): Uint8Array | undefined {
    return encoder.init(128).nextMessage(72)?.setLength().getMessage();
}
