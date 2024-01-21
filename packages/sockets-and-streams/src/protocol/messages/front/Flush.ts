/*
    Flush (F) 
    Byte1('H')
    Identifies the message as a Flush command.

    Int32(4)
    Length of message contents in bytes, including self.
*/
import type Encoder from '../../Encoder';
import { FLUSH } from './constants';

export default function createExecuteMessage(encoder: Encoder): Uint8Array | undefined {
    return encoder.init('128').nextMessage(FLUSH)?.setLength().getMessage();
}
