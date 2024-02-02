/*
GSSENCRequest (F) #
Int32(8)
Length of message contents in bytes, including self.

Int32(80877104)
The GSSAPI Encryption request code. The value is chosen to contain 1234 in the most significant 16 bits, and 5680 in the least significant 16 bits. (To avoid confusion, this code must not be the same as any protocol version number.)
*/
import type Encoder from '../../Encoder';

export default function createGssEncRequest(encoder: Encoder, sspiData: Uint8Array): Uint8Array | undefined {
    return encoder.init('64').nextMessage()?.i32(8)?.i32(80877104)?.getMessage();
}