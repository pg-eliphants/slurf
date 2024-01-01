/*
CopyInResponse (B) 
Byte1('G')

CopyOutResponse 
Byte1('H') 

CopyBothResponse
Byte1('W')

Identifies the message as a Start Copy Out response. This message will be followed by copy-out data.

Int32
Length of message contents in bytes, including self.

Int8
0 indicates the overall COPY format is textual (rows separated by newlines, columns separated by separator characters, etc.). 1 indicates the overall copy format is binary (similar to DataRow format). See COPY for more information.

Int16
The number of columns in the data to be copied (denoted N below).

Int16[N]
The format codes to be used for each column. Each must presently be zero (text) or one (binary). All must be zero if the overall copy format is textual.
*/
import { MSG_NOT, MSG_UNDECIDED, COPY_BOTH_RESPONSE, COPY_OUT_RESPONSE, COPY_IN_RESPONSE } from './constants';
import { ParseContext, CopyResponse } from './types';
import { messageLength, createMatcher, i16 } from './helper';

function createParser(tag: number) {
    const match = createMatcher(tag);
    return function parse(ctx: ParseContext): null | false | undefined | CopyResponse {
        const { buffer, cursor, txtDecoder } = ctx;
        const matched = match(buffer, cursor);
        if (matched === MSG_NOT) {
            return false;
        }
        if (matched === MSG_UNDECIDED) {
            return undefined;
        }
        const endPosition = messageLength(buffer, cursor) + cursor;
  
        // overal copy format: 0 = text, 1 = binary
        const isText = buffer[cursor + 5] === 0;
        const numCol = i16(buffer, cursor + 6);
        const formatCodes = new Array<number>(numCol);
        let  i = cursor + 8;
        for (let j = 0; i < endPosition; i += 2, j++) {
            // format codes each used for each column, 
            // only possible answers are 0 or 1
            formatCodes[j] = i16(buffer, i);
        }
        
        if (endPosition === i) {
            ctx.cursor = endPosition;
            return { isText, numCol, formatCodes };
        }
        return null;
    }
}

export const parseOutResponse = createParser(COPY_OUT_RESPONSE);
export const parseInResponse = createParser(COPY_IN_RESPONSE);
export const parseBothResponse = createParser(COPY_BOTH_RESPONSE);