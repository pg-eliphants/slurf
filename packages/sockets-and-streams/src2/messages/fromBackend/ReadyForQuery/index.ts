/*
done
    ReadyForQuery (B) 
    Byte1('Z')
    Identifies the message type. ReadyForQuery is sent whenever the backend is ready for a new query cycle.

    Int32(5)
    Length of message contents in bytes, including self.

    Byte1
    Current backend transaction status indicator. Possible values are 'I'(73) if idle (not in a transaction block); 'T'(84) if in a transaction block; or 'E'(69) if in a failed transaction block (queries will be rejected until block is ended).
*/
import ReadableByteStream from '../../../utils/ReadableByteStream';
import { match, messageLength } from '../helper';
import { READY_4_QUERY, MSG_UNDECIDED, MSG_NOT } from '../constants';

export type ReadyForQueryResponse = 73 | 84 | 69;

export function parse(ctx: ReadableByteStream): false | undefined | null | ReadyForQueryResponse {
    const { buffer, cursor } = ctx;
    const matched = match(READY_4_QUERY, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const idx = cursor + 5;
    const result = buffer[idx];
    if (result !== 73 && result !== 84 && result !== 69) {
        return null;
    }
    if (len === 6) {
        ctx.advanceCursor(len);
        return result;
    }
    return null;
}
