/*
CopyFail (F) 
Byte1('f')
Identifies the message as a COPY-failure indicator.

Int32
Length of message contents in bytes, including self.

String
An error message to report as the cause of failure.
*/
import Encoder from '../../Encoder';
import { COPYFAIL } from './constants';

export default function createTerminateMessage(encoder: Encoder, message: string): Uint8Array | undefined {
    return encoder.init('4096').nextMessage(COPYFAIL)?.cstr(message)?.setLenght().getMessage();
}
