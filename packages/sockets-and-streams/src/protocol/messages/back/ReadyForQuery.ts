/*
done
    ReadyForQuery (B) 
    Byte1('Z')
    Identifies the message type. ReadyForQuery is sent whenever the backend is ready for a new query cycle.

    Int32(5)
    Length of message contents in bytes, including self.

    Byte1
    Current backend transaction status indicator. Possible values are 'I' if idle (not in a transaction block); 'T' if in a transaction block; or 'E' if in a failed transaction block (queries will be rejected until block is ended).
*/
import { READY_4_QUERY, MSG_UNDECIDED } from './constants';
import { match, messageLength } from './helper';
import ReadableStream from '../../../io/ReadableByteStream';

export function parse(ctx: ReadableStream, txt: TextDecoder): undefined | null | number {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const idx = cursor + 5;
    const result = buffer[idx];
    if (len === 6) {
        ctx.advanceCursor(len);
        return result;
    }
    return null;
}
