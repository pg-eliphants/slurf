import { TextEncoder } from 'util';
import MemoryManager from '../utils/MemoryManager';
import type { MemoryCategories } from '../utils/MemoryManager';
import type { List } from '../utils/list';

export default class Encoder {
    private offset: number = 5;
    private headerPosition: number = 1;
    private slab: List<Uint8Array>; // current slab
    private currentView: DataView;
    constructor(
        private readonly memoryManager: MemoryManager,
        private readonly textEncoder: TextEncoder
    ) {}

    private ensure(size: number): boolean {
        const buf = this.slab!.value;
        const remaining = buf.byteLength - this.offset;
        if (remaining < size) {
            const replacementSlab = this.memoryManager.fetchSlab(String(buf.length * 2) as MemoryCategories);
            if (replacementSlab === null) {
                return false;
            }
            replacementSlab.value.set(buf);
            this.memoryManager.returnSlab(this.slab);
            this.slab = replacementSlab;
            this.currentView = new DataView(this.slab.value.buffer);
        }
        return true;
    }

    public init(initialSlabSize: MemoryCategories): Encoder {
        if (this.slab) {
            if (this.slab.value.byteLength !== Number(initialSlabSize)) {
                this.memoryManager.returnSlab(this.slab);
                this.slab = this.memoryManager.fetchSlab(initialSlabSize);
            }
        } else {
            this.slab = this.memoryManager.fetchSlab(initialSlabSize);
        }
        this.offset = 5; // code (1 byte) + length (4 bytes)
        this.headerPosition = 1;
        this.currentView = new DataView(this.slab!.value.buffer);
        return this;
    }

    public i32(num: number): Encoder | undefined {
        if (!this.ensure(4)) {
            return undefined;
        }
        this.currentView.setInt32(this.offset, num);
        this.offset += 4;
        return this;
    }

    public i16(num: number): Encoder | undefined {
        if (!this.ensure(2)) {
            return undefined;
        }
        this.currentView.setInt16(this.offset, num);
        this.offset += 2;
        return this;
    }

    public cstr(string: string): Encoder | undefined {
        if (!string) {
            if (!this.ensure(1)) {
                return undefined;
            }
        } else {
            const bin = this.textEncoder.encode(string);
            if (!this.ensure(bin.byteLength + 1)) {
                // +1 for null terminator
                return undefined;
            }
            new Uint8Array(this.currentView.buffer).set(bin, this.offset);
            this.offset += bin.byteLength;
        }
        this.currentView.setInt8(this.offset++, 0);
        return this;
    }

    public bin(otherBuffer: DataView): undefined | Encoder {
        if (!this.ensure(otherBuffer.byteLength)) {
            return undefined;
        }
        new Uint8Array(this.currentView.buffer).set(new Uint8Array(otherBuffer.buffer), this.offset);
        this.offset += otherBuffer.byteLength;
        return this;
    }

    /*private join(code?: number): ArrayBuffer {
        if (code) {
            this.currentView.setUint8(code, this.headerPosition);
            const length = this.offset - this.headerPosition;
            this.currentView.setInt32(this.headerPosition + 1, length);
        }
        return this.currentView.buffer.slice(code ? 0 : 5, this.offset);
    }*/

    public getWithLenght(): Uint8Array {
        const length = this.offset - this.headerPosition;
        this.currentView.setInt32(this.headerPosition, length);
        const result = this.currentView.buffer.slice(this.headerPosition, this.offset);
        const bin = new Uint8Array(result);
        // return to initial pos
        this.headerPosition = 1;
        this.offset = 5; // code (1 byte) + length (4 bytes)
        this.memoryManager.returnSlab(this.slab);
        this.slab = null;
        return bin;
    }
}
