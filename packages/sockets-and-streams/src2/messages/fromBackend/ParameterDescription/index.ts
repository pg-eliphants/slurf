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

import ReadableByteStream from '../../../utils/ReadableByteStream';
import { MSG_NOT, MSG_UNDECIDED, PARAMETER_DESCRIPTION } from '../constants';
import { i16, i32, match, messageLength } from '../helper';

export type ParameterDescription = {
    type: 'param-desc';
    pl: Uint32Array;
};

export const PARAM_DESCR_TYPE: ParameterDescription['type'] = 'param-desc';

export function parse(ctx: ReadableByteStream): null | undefined | false | ParameterDescription {
    const { buffer, cursor } = ctx;
    const matched = match(PARAMETER_DESCRIPTION, buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const len = messageLength(buffer, cursor);
    const endPosition = len + cursor;
    const numPar = i16(buffer, cursor + 5);
    const rc = new Uint32Array(numPar);
    let base = cursor + 7;
    for (let i = 0; i < numPar; i++, base += i << 2) {
        rc[i] = i32(buffer, base);
    }
    if (endPosition === base) {
        ctx.advanceCursor(len);
        return {
            type: PARAM_DESCR_TYPE,
            pl: rc
        };
    }
    return null;
}
