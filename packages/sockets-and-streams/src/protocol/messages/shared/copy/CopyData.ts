/*
CopyData (F & B) 
Byte1('d')
Identifies the message as COPY data.

Int32
Length of message contents in bytes, including self.

Byten
Data that forms part of a COPY data stream. Messages sent from the backend will always correspond to single data rows, but messages sent by frontends might divide the data stream arbitrarily.
*/
import { MSG_NOT, MSG_UNDECIDED, COPY_DATA } from '../../back/constants';
import { ParseContext } from '../../back/types';
import { messageLength, createMatcher } from '../../back/helper';

export const match = createMatcher(COPY_DATA);

export function parse(ctx: ParseContext): null | undefined | false | Uint8Array {
    const { buffer, cursor, txtDecoder } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = messageLength(buffer, cursor) + cursor;
    // what is this format
    // backend says it will be single rows
    const data = buffer.slice(cursor + 5, endPosition);

    ctx.cursor = endPosition;
    return data;
}
