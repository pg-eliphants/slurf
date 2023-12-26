/*
Query (F) #
Byte1('Q')
Identifies the message as a simple query.

Int32
Length of message contents in bytes, including self.

String
The query string itself.
*/

import type Encoder from '../../Encoder';
import { MAX_MEM_BLOCK_SIZE, MIN_MEM_BLOCK_SIZE, MemoryCategories } from '../../../utils/MemoryManager';
import { ERR_MEM_MAX_EXCEEDED } from '../../constants';
import type { MemoryErrors } from '../../types';
import { QUERY } from './constants';

export default function createQueryMessage(encoder: Encoder, sql: string): Uint8Array | undefined | MemoryErrors {
    const memSize = Math.min(1 << Math.ceil(Math.log2(sql.length)), MIN_MEM_BLOCK_SIZE);
    const mc: MemoryCategories = `${memSize}` as MemoryCategories;
    if (memSize > MAX_MEM_BLOCK_SIZE) {
        return ERR_MEM_MAX_EXCEEDED;
    }
    return encoder.init(mc).nextMessage(QUERY)?.cstr(sql)?.setLenght().getMessage();
}
