import { TextEncoder } from 'util';
import MemoryManager from '../utils/MemoryManager';
import type { MemoryCategories } from '../utils/MemoryManager';
import type { List } from '../utils/list';

export default class Encoder {
    private offset: number = 5;
    private headerPosition: number = 0;
    private slab: List<Uint8Array>; // current slab
    private currentView: DataView;
    private txtEncoder: TextEncoder;
    constructor(private readonly memoryManager: MemoryManager) {
        this.slab = null;
        this.currentView = new DataView(this.slab!.value.buffer);
        this.txtEncoder = new TextEncoder();
    }

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

    public init(initialSlabSize: MemoryCategories): void {
        this.offset = 5; // code (1 byte) + length (4 bytes)
        this.headerPosition = 0;
        this.slab = this.memoryManager.fetchSlab(initialSlabSize);
    }

    public i32(num: number): boolean {
        if (!this.ensure(4)) {
            return false;
        }
        this.currentView.setInt32(this.offset, num);
        this.offset += 4;
        return true;
    }

    public i16(num: number): boolean {
        if (!this.ensure(2)) {
            return false;
        }
        this.currentView.setInt16(this.offset, num);
        this.offset += 2;
        return true;
    }

    public cstr(string: string): boolean {
        if (!string) {
            if (!this.ensure(1)) {
                return false;
            }
        } else {
            const bin = this.txtEncoder.encode(string);
            if (!this.ensure(bin.byteLength + 1)) {
                // +1 for null terminator
                return false;
            }
            new Uint8Array(this.currentView.buffer).set(bin, this.offset);
            this.offset += bin.byteLength;
        }
        this.currentView.setInt8(this.offset++, 0);
        return true;
    }

    public bin(otherBuffer: DataView): boolean {
        if (!this.ensure(otherBuffer.byteLength)) {
            return false;
        }
        new Uint8Array(this.currentView.buffer).set(new Uint8Array(otherBuffer.buffer), this.offset);
        this.offset += otherBuffer.byteLength;
        return true;
    }

    private join(code?: number): ArrayBuffer {
        if (code) {
            this.currentView.setUint8(code, this.headerPosition);
            const length = this.offset - (this.headerPosition + 1);
            this.currentView.setInt32(this.headerPosition + 1, length);
        }
        return this.currentView.buffer.slice(code ? 0 : 5, this.offset);
    }

    public flush(code?: number): ArrayBuffer {
        const result = this.join(code);
        this.offset = 5; // code (1 byte) + length (4 bytes)
        this.headerPosition = 0;
        this.memoryManager.returnSlab(this.slab);
        this.slab = null;
        return new Uint8Array(result);
    }
}
