import { TextEncoder } from 'util';
import MemoryManager from '../utils/MemoryManager';
import type { MemoryCategories } from '../utils/MemoryManager';
import type { List } from '../utils/list';

export default class Encoder {
    private cursor: number;
    private messageOffset: number;
    private messageLengthOffset: number;
    private messagContentOffset: number;

    private slab: List<Uint8Array>; // current slab
    private currentView: DataView;
    constructor(
        private readonly memoryManager: MemoryManager,
        private readonly textEncoder: TextEncoder
    ) {
        this.cursor = 5;
        this.messageOffset = 0; // not all messages have this
        this.messageLengthOffset = 1;
        this.messagContentOffset = 5;
    }

    private ensure(size: number): boolean {
        const buf = this.slab!.value;
        const remaining = buf.byteLength - this.cursor;
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

    // re-init
    public init(initialSlabSize: MemoryCategories): Encoder {
        if (this.slab) {
            if (this.slab.value.byteLength !== Number(initialSlabSize)) {
                this.memoryManager.returnSlab(this.slab);
                this.slab = this.memoryManager.fetchSlab(initialSlabSize);
            }
        } else {
            this.slab = this.memoryManager.fetchSlab(initialSlabSize);
        }
        this.currentView = new DataView(this.slab!.value.buffer);
        this.cursor = 0;
        return this;
    }

    // (optionially) "cursor" is at the end of a message
    // "cursor" and at the start of a new one
    public nextMessage(type?: number): Encoder | undefined {
        if (!this.ensure(type === undefined ? 4 : 5)) {
            return undefined;
        }
        this.messageOffset = this.cursor;
        if (type !== undefined) {
            this.ui8(type);
        }
        this.messageLengthOffset = this.cursor; // has been advanced if type !== undefined
        this.messagContentOffset = this.cursor + 4;
        return this;
    }

    public ui8(num: number): Encoder | undefined {
        if (!this.ensure(1)) {
            return undefined;
        }
        this.currentView.setUint8(this.cursor, num);
        return this;
    }

    public i32(num: number): Encoder | undefined {
        if (!this.ensure(4)) {
            return undefined;
        }
        this.currentView.setInt32(this.cursor, num);
        this.cursor += 4;
        return this;
    }

    public i16(num: number): Encoder | undefined {
        if (!this.ensure(2)) {
            return undefined;
        }
        this.currentView.setInt16(this.cursor, num);
        this.cursor += 2;
        return this;
    }

    public i8(num: number): Encoder | undefined {
        if (this.ensure(1)) {
            return undefined;
        }
        this.currentView.setInt16(this.cursor, num);
        this.cursor += 1;
        return this;
    }

    public cstr(string?: string): Encoder | undefined {
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
            new Uint8Array(this.currentView.buffer).set(bin, this.cursor);
            this.cursor += bin.byteLength;
        }
        this.currentView.setInt8(this.cursor++, 0);
        return this;
    }

    public bin(otherBuffer: DataView): undefined | Encoder {
        if (!this.ensure(otherBuffer.byteLength)) {
            return undefined;
        }
        new Uint8Array(this.currentView.buffer).set(new Uint8Array(otherBuffer.buffer), this.cursor);
        this.cursor += otherBuffer.byteLength;
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

    public setWithLenght(): void {
        const length = this.cursor - this.messageLengthOffset;
        this.currentView.setInt32(this.messageLengthOffset, length);
    }

    public getMessage(): Uint8Array {
        const result = this.currentView.buffer.slice(this.messageOffset, this.cursor);
        const bin = new Uint8Array(result);
        return bin;
    }
}
