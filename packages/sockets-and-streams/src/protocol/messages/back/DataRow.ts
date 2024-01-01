/*
DataRow (B) 
Byte1('D')
Identifies the message as a data row.

Int32
Length of message contents in bytes, including self.

Int16
The number of column values that follow (possibly zero).

Next, the following pair of fields appear for each column:

Int32
The length of the column value, in bytes (this count does not include itself). Can be zero. As a special case, -1 indicates a NULL column value. No value bytes follow in the NULL case.

Byten
The value of the column, in the format indicated by the associated format code. n is the above length.
*/
import { MSG_NOT, MSG_UNDECIDED, DATA_ROW } from './constants';
import { ParseContext } from './types';
export { matcherLength } from './helper';
import { createMatcher, i16, i32, messageLength } from './helper';

// export { messageLength };

export const match = createMatcher(DATA_ROW);

export function parse(ctx: ParseContext): false | null | undefined | Uint8Array[] {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = messageLength(buffer, cursor) + cursor;
    
    const numCols = i16(buffer, cursor + 5);
    let pos = cursor + 7;
    const rc: Uint8Array[] = new Array<Uint8Array>(numCols);
    for (let i = 0; i < numCols; i++){
        const len = i32(buffer, pos);
        const value = buffer.slice(pos + 4, pos + 4 + len);
        rc[i] = value;
        pos += (4 + len);
    }

    if (endPosition !== pos) {
        return null;
    }
    ctx.cursor = endPosition;
    return rc; // there is no actual data to return other then true
}