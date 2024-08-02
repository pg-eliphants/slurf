/*
Close (F) 
Byte1('C')
Identifies the message as a Close command.

Int32
Length of message contents in bytes, including self.

Byte1
'S' to close a prepared statement; or 'P' to close a portal.

String
The name of the prepared statement or portal to close (an empty string selects the unnamed prepared statement or portal).
*/

import Encoder from '../../../utils/Encoder';
import { PortalOrStatement } from '../types';
import { map } from '../constants';

export default function createCloseMessage(
    encoder: Encoder,
    type: PortalOrStatement,
    name?: string
): Uint8Array | undefined {
    return encoder.init(128).nextMessage(67)?.ui8(map[type])?.cstr(name)?.setLength().getMessage();
}
