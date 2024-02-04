import type { List } from './list';
import { removeSelf, insertBefore } from './list';
export type MemoryCategories =
    | '64'
    | '128'
    | '256'
    | '512'
    | '1024'
    | '2048'
    | '4096'
    | '8192'
    | '16384'
    | '32768'
    | '65536';
export const MAX_MEM_BLOCK_SIZE = 65536;
export const MIN_MEM_BLOCK_SIZE = 64;

export type MemorySlabs = {
    [index in MemoryCategories]: { list: List<Uint8Array>; length: number };
};

export type MemorySlabStats = {
    [index in MemoryCategories]: number;
};

const initialDefault: Record<MemoryCategories, number> = {
    '64': 40,
    '128': 40,
    '256': 40,
    '512': 40,
    '1024': 10,
    '2048': 5,
    '4096': 1,
    '8192': 1,
    '16384': 1,
    '32768': 1,
    '65536': 1
};

export default class MemoryManager {
    private readonly slabs: MemorySlabs;
    constructor(initial: Record<MemoryCategories, number> = initialDefault) {
        this.slabs = {
            64: {
                list: null,
                length: 0
            },
            128: {
                list: null,
                length: 0
            },
            256: {
                list: null,
                length: 0
            },
            512: {
                list: null,
                length: 0
            },
            1024: {
                list: null,
                length: 0
            },
            2048: {
                list: null,
                length: 0
            },
            4096: {
                list: null,
                length: 0
            },
            8192: {
                list: null,
                length: 0
            },
            16384: {
                list: null,
                length: 0
            },
            32768: {
                list: null,
                length: 0
            },
            65536: {
                list: null,
                length: 0
            }
        };
        // initialize
        let block: MemoryCategories;
        for (block in initial) {
            const partition = this.slabs[block];
            const size = initial[block];
            for (let i = 0; i < size; i++) {
                partition.list = insertBefore(partition.list, { value: new Uint8Array(Number(block)) });
            }
            partition.length = size;
        }
    }
    returnSlab(slab: List<Uint8Array>) {
        const partition: MemoryCategories = slab?.value!.length as unknown as MemoryCategories;
        this.slabs[partition].list = insertBefore(this.slabs[partition].list, slab);
        this.slabs[partition].length++;
    }
    fetchSlab(from: MemoryCategories): List<Uint8Array> {
        if (Number(from) > MAX_MEM_BLOCK_SIZE) {
            return null;
        }
        const partition = this.slabs[from];
        if (!partition.list) {
            // log creation?
            return { prev: null, next: null, value: new Uint8Array(Number(from)) };
        }
        const item = removeSelf(partition.list);
        if (item === partition.list){
            partition.list = item.next ?? null;
        }
        partition.length--;
        return item;
    }
    getStats(): MemorySlabStats {
        const rc: Partial<MemorySlabStats> = {};
        let i: MemoryCategories;
        for (i in this.slabs) {
            const partition = this.slabs[i];
            rc[i] = partition.length;
        }
        return rc as MemorySlabStats;
    }
}
