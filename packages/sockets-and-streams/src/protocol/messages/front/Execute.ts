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
import type Encoder from '../../Encoder';
import { EXECUTE } from './constants';

export default function createExecuteMessage(encoder: Encoder, name?: string, maxRows = 0): Uint8Array | undefined {
    return encoder
        .init('128')
        .nextMessage(EXECUTE)
        ?.cstr(name)
        ?.i32(maxRows ?? 0)
        ?.setLength()
        .getMessage();
}
