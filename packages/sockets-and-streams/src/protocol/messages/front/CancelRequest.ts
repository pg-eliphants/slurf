/*
CancelRequest (F) 
Int32(16)
Length of message contents in bytes, including self.

Int32(80877102)
The cancel request code. The value is chosen to contain 1234 in the most significant 16 bits, and 5678 in the least significant 16 bits. (To avoid confusion, this code must not be the same as any protocol version number.)

Int32
The process ID of the target backend.

Int32
The secret key for the target backend.
*/
import Encoder from '../../Encoder';

export default function createCancelRequestMessage(
    encoder: Encoder,
    processId: number,
    backendKey: number
): Uint8Array | undefined {
    return encoder.init('64').nextMessage()?.i32(80877102)?.i32(processId)?.i32(backendKey)?.setLenght().getMessage();
}
