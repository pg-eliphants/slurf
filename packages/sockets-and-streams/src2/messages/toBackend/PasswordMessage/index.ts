/*
PasswordMessage (F) #
Byte1('p')
Identifies the message as a password response. Note that this is also used for GSSAPI, SSPI and SASL response messages. The exact message type can be deduced from the context.

Int32
Length of message contents in bytes, including self.

String
The password (encrypted, if requested).
*/

import Encoder from '../../../utils/Encoder';

export default function createPasswordMessage(passwd: string, encoder: Encoder) {
    return encoder.init(64)?.nextMessage(112)?.cstr(passwd)?.setLength().getMessage();
}
