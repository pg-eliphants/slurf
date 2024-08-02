/*
Terminate (F) 
Byte1('X')
Identifies the message as a termination.

Int32(4)
Length of message contents in bytes, including self.
*/

import Encoder from '../../../utils/Encoder';

export default function createTerminateMessage(encoder: Encoder): Uint8Array | undefined {
    return encoder.init(64).nextMessage(88)?.setLength().getMessage();
}
