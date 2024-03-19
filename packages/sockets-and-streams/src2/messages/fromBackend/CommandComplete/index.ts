/*
CommandComplete (B) 
Byte1('C')
Identifies the message as a command-completed response.

Int32
Length of message contents in bytes, including self.

String
The command tag. This is usually a single word that identifies which SQL command was completed.

For an INSERT command, the tag is INSERT oid rows, where rows is the number of rows inserted. oid used to be the object ID of the inserted row if rows was 1 and the target table had OIDs, but OIDs system columns are not supported anymore; therefore oid is always 0.

For a DELETE command, the tag is DELETE rows where rows is the number of rows deleted.

For an UPDATE command, the tag is UPDATE rows where rows is the number of rows updated.

For a MERGE command, the tag is MERGE rows where rows is the number of rows inserted, updated, or deleted.

For a SELECT or CREATE TABLE AS command, the tag is SELECT rows where rows is the number of rows retrieved.

For a MOVE command, the tag is MOVE rows where rows is the number of rows the cursor's position has been changed by.

For a FETCH command, the tag is FETCH rows where rows is the number of rows that have been retrieved from the cursor.

For a COPY command, the tag is COPY rows where rows is the number of rows copied. (Note: the row count appears only in PostgreSQL 8.2 and later.)
*/

import ReadableByteStream from '../../../utils/ReadableByteStream';
import { COMMAND_COMPLETE, MSG_NOT, MSG_UNDECIDED } from '../constants';
import { match, messageLength } from '../helper';

/*
 text returen
 - INSERT oid rows
    - oid objecId of the inserted row (single row) and target table has OID's
    - if rows is not 1 then oid is null and meaningless
 - DELETE rows
    - rows number of rows deleted
 - UPDATE rows
    - rows number of rows updated
 - MERGE rows
    - rows number of rows merged
 - SELECT rows
    - number of rows in CREATE TABLE AS... SELECT
    - number of rows retrieved with SELECT...
- MOVE rows 
     - rows number of rows the cursor changed by
- FETCH rows
     - rows number of rows fetched by cursor
- COPY rows
     - rows number of rows copied (only appears in postgres 8.2 and later)
*/

export type CommandComplete = {
    type: 'com-complete';
    pl: string;
};

export const COMMAND_COMPLETE_TYPE: CommandComplete['type'] = 'com-complete';

export function parse(ctx: ReadableByteStream, txtDecoder: TextDecoder): null | undefined | false | CommandComplete {
    const { buffer, cursor } = ctx;
    const matched = match(COMMAND_COMPLETE, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const idx = buffer.indexOf(0, cursor + 5);
    if (idx < 0) {
        return null;
    }
    const commandTag = txtDecoder.decode(buffer.slice(cursor + 5, idx));

    if (len + cursor === idx + 1) {
        ctx.advanceCursor(len);
        return {
            type: COMMAND_COMPLETE_TYPE,
            pl: commandTag
        };
    }
    return null;
}
