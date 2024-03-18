/*
Query (F)
Byte1('Q')
Identifies the message as a simple query.
Int32
Length of message contents in bytes, including self.
2367
Frontend/Backend Protocol
String
The query string itself.
*/

import Encoder from '../../utils/Encoder';
import { MAX_MEM_BLOCK_SIZE, MIN_MEM_BLOCK_SIZE, MemoryCategories } from '../../utils/MemoryManager';

export default function createSimpleQueryMessage(
    encoder: Encoder,
    sql: string,
): Uint8Array | null {
    const memSize = Math.max(1 << Math.ceil(Math.log2(sql.length)), MIN_MEM_BLOCK_SIZE);
    if (memSize > MAX_MEM_BLOCK_SIZE) {
        return null;
    }
    encoder
        .init(memSize as MemoryCategories)
        .nextMessage(81) // query (simple query)
        ?.cstr(sql);
    return encoder.setLength().getMessage();
}
