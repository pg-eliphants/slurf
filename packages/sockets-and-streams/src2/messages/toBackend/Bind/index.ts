/*
Bind (F)
Byte1('B')
Identifies the message as a Bind command.

Int32
Length of message contents in bytes, including self.

String
The name of the destination portal (an empty string selects the unnamed portal).

String
The name of the source prepared statement (an empty string selects the unnamed prepared
statement).

Int16
The number of parameter format codes that follow (denoted C below). This can be zero to
indicate that there are no parameters or that the parameters all use the default format (text);
or one, in which case the specified format code is applied to all parameters; or it can equal
the actual number of parameters.

Int16[C]
The parameter format codes. Each must presently be zero (text) or one (binary).

Int16
The number of parameter values that follow (possibly zero). This must match the number of
parameters needed by the query.
Next, the following pair of fields appear for each parameter:

Int32
The length of the parameter value, in bytes (this count does not include itself). Can be zero.
As a special case, -1 indicates a NULL parameter value. No value bytes follow in the NULL
case.

Byten
The value of the parameter, in the format indicated by the associated format code. n is the
above length.
After the last parameter, the following fields appear:

Int16
The number of result-column format codes that follow (denoted R below). This can be zero to
indicate that there are no result columns or that the result columns should all use the default
format (text); or one, in which case the specified format code is applied to all result columns
(if any); or it can equal the actual number of result columns of the query.

Int16[R]
The result-column format codes. Each must presently be zero (text) or one (binary).

*/

import Encoder from '../../../utils/Encoder';

export type formatTypes = 0 | (0 | 1)[];

export default function createBindMessage(
    encoder: Encoder,
    portal: string | undefined,
    preparedName: string | undefined,
    parameterFormat: formatTypes,
    values: Uint8Array[],
    resultFormat: formatTypes
): Uint8Array | undefined {
    // max portal name length 64 (including terminating zero)
    // max prepared statement name length 64 ('')
    // + formatcodes
    //www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
    // P = 80 (portal)
    // S = 83 (prepared statement)
    let e = encoder.init(256).nextMessage(66)?.cstr(portal)?.cstr(preparedName);

    // parameters
    if (parameterFormat === 0) {
        e = e?.i16(0);
    } else {
        e = e?.i16(parameterFormat.length);
        for (let i = 0; i < parameterFormat.length; i++) {
            e = e?.i16(parameterFormat[i]);
        }
    }
    // parameter-values
    e = e?.i16(values.length);
    for (let i = 0; i < values.length; i++) {
        e = e?.i16(values[i].length);
        e = e?.bin(values[i]);
    }
    // result-format
    if (resultFormat === 0) {
        e = e?.i16(0);
    } else {
        e = e?.i16(resultFormat.length);
        for (let i = 0; i < resultFormat.length; i++) {
            e = e?.i16(resultFormat[i]);
        }
    }
    return e?.setLength()?.getMessage();
}
