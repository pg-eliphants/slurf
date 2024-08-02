/*

RowDescription (B) 
Byte1('T')
Identifies the message as a row description.

Int32
Length of message contents in bytes, including self.

Int16
Specifies the number of fields in a row (can be zero).

Then, for each field, there is the following:

String
The field name.

Int32
If the field can be identified as a column of a specific table, the object ID of the table; otherwise zero.

Int16
If the field can be identified as a column of a specific table, the attribute number of the column; otherwise zero.

Int32
The object ID of the field's data type.

Int16
The data type size (see pg_type.typlen). Note that negative values denote variable-width types.

Int32
The type modifier (see pg_attribute.atttypmod). The meaning of the modifier is type-specific.

Int16
The format code being used for the field. Currently will be zero (text) or one (binary). In a RowDescription returned from the statement variant of Describe, the format code is not yet known and will always be zero.

*/

import ReadableByteStream from '../../../utils/ReadableByteStream';
import { MSG_NOT, MSG_UNDECIDED, ROW_DESCRIPTION } from '../constants';
import { i16, i32, match, messageLength } from '../helper';

export type Field = {
    name: string;
    tableOid: number;
    columnOid: number;
    oid: number;
    typeLen: number;
    tpmod: number;
    formatCode: number;
};

export type RowDescription = {
    type: 'row-desc';
    pl: Field[];
};

export const ROW_DESCRIPTION_TYPE: RowDescription['type'] = 'row-desc';

export function parse(ctx: ReadableByteStream, decoder: TextDecoder): undefined | false | null | RowDescription {
    const { buffer, cursor } = ctx;
    const matched = match(ROW_DESCRIPTION, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const endPosition = cursor + len;

    const numFields = i16(buffer, cursor + 5);
    let pos = cursor + 7;
    let i = 0;
    const fields: Field[] = Array.from<Field>({ length: numFields });
    while (i < numFields) {
        // parse field name
        const idx = buffer.indexOf(0, pos);
        if (idx < 0 || idx >= endPosition) {
            return null;
        }
        fields[i] = {
            name: decoder.decode(buffer.slice(pos, idx)),
            tableOid: i32(buffer, idx + 1),
            columnOid: i16(buffer, idx + 5),
            oid: i32(buffer, idx + 7),
            typeLen: i16(buffer, idx + 11),
            tpmod: i32(buffer, idx + 13),
            formatCode: i16(buffer, idx + 17)
        };
        pos = idx + 19;
        i++;
    }
    if (endPosition === pos) {
        ctx.advanceCursor(len);
        return {
            type: ROW_DESCRIPTION_TYPE,
            pl: fields
        };
    }
    return null;
}
