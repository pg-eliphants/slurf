/*
Describe (F) 
Byte1('D')
Identifies the message as a Describe command.

Int32
Length of message contents in bytes, including self.

Byte1
'S' to describe a prepared statement; or 'P' to describe a portal.

String
The name of the prepared statement or portal to describe (an empty string selects the unnamed prepared statement or portal).
*/
import type Encoder from '../../Encoder';
import { DESCRIBE } from './constants';

export default function createDescribeMessage(
    encoder: Encoder,
    isPreparedSt: boolean, // false = portal name, true = prepared name
    name?: string
): Uint8Array {
    // choose 128 over 64 because the name (prepared statement name or portal name) is not longer then 63 char
    //www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
    // P = 80 (portal)
    // S = 83 (prepared statement)
    https: encoder
        .init('128')
        .nextMessage(DESCRIBE)
        ?.ui8(isPreparedSt ? 83 : 80)
        ?.cstr(name);
    return encoder.setLength().getMessage();
}
