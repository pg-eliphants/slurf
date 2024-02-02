/*
GSSResponse (F) 
Byte1('p')
Identifies the message as a GSSAPI or SSPI response. Note that this is also used for SASL and password response messages. The exact message type can be deduced from the context.

Int32
Length of message contents in bytes, including self.

Byten
GSSAPI/SSPI specific message data.
*/
import type Encoder from '../../Encoder';
import { GSSRESPONSE } from './constants';

export default function createExecuteMessage(encoder: Encoder, sspiData: Uint8Array): Uint8Array | undefined {
    return encoder.init('128').nextMessage(GSSRESPONSE)?.bin(sspiData)?.setLength().getMessage();
}
