/*
Execute (F) 
Byte1('E')
Identifies the message as an Execute command.

Int32
Length of message contents in bytes, including self.

String
The name of the portal to execute (an empty string selects the unnamed portal).

Int32
Maximum number of rows to return, if portal contains a query that returns rows (ignored otherwise). Zero denotes “no limit”.
*/

import Encoder from '../../../utils/Encoder';

export default function createExecuteMessage(
    encoder: Encoder,
    portalName?: string,
    fetchSize = 0
): Uint8Array | undefined {
    return encoder.init(128).nextMessage(69)?.cstr(portalName)?.i32(fetchSize)?.setLength().getMessage();
}
