/*
PasswordMessage (F) 
Byte1('p')
Identifies the message as a password response. Note that this is also used for GSSAPI, SSPI and SASL response messages. The exact message type can be deduced from the context.

Int32
Length of message contents in bytes, including self.

String
The password (encrypted, if requested).
*/
import type Encoder from '../../Encoder';
import type { MemoryErrors } from '../../types';
import { PASSWORD_RESPONSE } from './constants';

export default function createPasswordResponse(encoder: Encoder, passwordEncrypted: string): Uint8Array | undefined {
    return encoder.init('4096').nextMessage(PASSWORD_RESPONSE)?.cstr(passwordEncrypted)?.setLenght().getMessage();
}
