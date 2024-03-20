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

import Encoder from '../../../utils/Encoder';
import { EMPTY_UINT8ARR } from '../constants';
import { PortalOrStatement } from '../types';
import { map } from '../constants';

export default function createDescribeMessage(
    encoder: Encoder,
    type: PortalOrStatement, // false = portal name, true = prepared name
    name?: string
): Uint8Array | undefined {
    // choose 128 over 64 because the name (prepared statement name or portal name) is not longer then 63 char
    //www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
    // P = 80 (portal)
    // S = 83 (prepared statement)
    if (map[type] === undefined) {
        return EMPTY_UINT8ARR;
    }
    return encoder.init(128).nextMessage(68)?.ui8(map[type])?.cstr(name)?.setLength().getMessage();
}
