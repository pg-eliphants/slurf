/*
ParameterDescription (B) 
Byte1('t')
Identifies the message as a parameter description.

Int32
Length of message contents in bytes, including self.

Int16
The number of parameters used by the statement (can be zero).

Then, for each parameter, there is the following:

Int32
Specifies the object ID of the parameter data type.
*/
// This is a response on DESCRIBE
import { MSG_NOT, MSG_UNDECIDED, PARAMETER_DESCRIPTION } from './constants';
import { ParseContext, Notifications } from './types';
import { createMatcher, messageLength, i16, i32 } from './helper';

export const match = createMatcher(PARAMETER_DESCRIPTION);

export function parse(ctx: ParseContext): null | undefined | false | Uint32Array {
    const { buffer, cursor, txtDecoder } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const endPosition = cursor + messageLength(buffer, cursor);
    const numPar = i16(buffer, cursor + 5);
    const oidSize = numPar << 2;
    if (endPosition === oidSize + 2 + 4 + 1 + cursor) {//ok
        const oids = new Uint32Array(buffer.slice(cursor + 7, oidSize));
        return oids;
    }
    return null;
}
