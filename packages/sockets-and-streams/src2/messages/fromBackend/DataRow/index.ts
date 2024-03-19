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
import ReadableByteStream from '../../../utils/ReadableByteStream';
import { MSG_NOT, MSG_UNDECIDED, DATA_ROW } from '../constants';
import { i16, i32, match, messageLength } from '../helper';

export type DataRow = {
    type: 'data-row';
    pl: Uint8Array[];
};

export const DATA_ROW_TYPE: DataRow['type'] = 'data-row';

export function parse(ctx: ReadableByteStream): false | null | undefined | DataRow {
    const { buffer, cursor } = ctx;
    const matched = match(DATA_ROW, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);

    const numCols = i16(buffer, cursor + 5);
    let pos = cursor + 7;
    const rc: Uint8Array[] = new Array<Uint8Array>(numCols);
    for (let i = 0; i < numCols; i++) {
        const len = i32(buffer, pos);
        const value = buffer.slice(pos + 4, pos + 4 + len);
        rc[i] = value;
        pos += 4 + len;
    }

    if (len + cursor !== pos) {
        return null;
    }
    ctx.advanceCursor(len);
    return {
        type: DATA_ROW_TYPE,
        pl: rc
    };
}
