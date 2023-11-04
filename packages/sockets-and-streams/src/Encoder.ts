import type { List } from './list';
import { remove, insertBefore } from './list';

let slab: List<Encoder> = null;

export function getEncoder(): Encoder {
    if (!slab) {
        return new Encoder();
    }
    return remove(slab)!.value;
}

export function addEncoder(e: Encoder) {
    slab = insertBefore(slab, { next: null, prev: null, value: e });
}

export function slabSize() {
    let i = 0;
    let temp = slab;
    while (temp) {
        i++;
        temp = temp.next;
    }
    return i;
}

export class Encoder {
    private bytes: DataView;
    private offset: number = 5;
    private headerPosition: number = 0;
    private txtEncoder: TextEncoder;
    constructor(private size = 8192) {
        const maxByteLength = Math.min(size * 4, 65536);
        // @ts-ignore
        const buffer = new ArrayBuffer(size, { maxByteLength });
        this.bytes = new DataView(buffer as unknown as ArrayBufferLike);
        this.txtEncoder = new TextEncoder();
    }

    public get byteLength() {
        return this.bytes.byteLength;
    }

    private ensure(size: number): void {
        const remaining = this.bytes.byteLength - this.offset;
        if (remaining < size) {
            // @ts-ignore
            const maxBytes: number = this.bytes.buffer.maxByteLength;
            const remaining2 = maxBytes - this.offset;
            //
            if (remaining2 < size) {
                const oldBytes = this.bytes;
                // exponential growth factor of around ~ 1.5
                // https://stackoverflow.com/questions/2269063/buffer-growth-strategy
                const newSize = oldBytes.byteLength + (oldBytes.byteLength >> 1) + size;
                const maxByteLength = newSize * 4;
                // @ts-ignore
                const buffer = new ArrayBuffer(size, { maxByteLength });
                // some wrap dewrap so we can use Uint8Array.prototype.set
                const forCopy = new Uint8Array(buffer);
                forCopy.set(new Uint8Array(oldBytes.buffer));
                this.bytes = new DataView(buffer as unknown as ArrayBufferLike);
            } else {
                // @ts-ignore
                this.bytes.buffer.resize(this.offset + size);
            }
        }
    }

    public i32(num: number): Encoder {
        this.ensure(4);
        this.bytes.setInt32(this.offset, num);
        this.offset += 4;
        return this;
    }

    public i16(num: number): Encoder {
        this.ensure(2);
        this.bytes.setInt16(this.offset, num);
        return this;
    }

    public cstr(string: string): Encoder {
        if (!string) {
            this.ensure(1);
        } else {
            const bin = this.txtEncoder.encode(string);
            this.ensure(bin.byteLength + 1); // +1 for null terminator
            new Uint8Array(this.bytes.buffer).set(bin, this.offset);
            this.offset += bin.byteLength;
        }
        this.bytes[this.offset++] = 0;
        return this;
    }

    public bin(otherBuffer: DataView): Encoder {
        this.ensure(otherBuffer.byteLength);
        new Uint8Array(this.bytes.buffer).set(new Uint8Array(otherBuffer.buffer), this.offset);
        this.offset += otherBuffer.byteLength;
        return this;
    }

    private join(code?: number): ArrayBuffer {
        if (code) {
            this.bytes.setUint8(code, this.headerPosition);
            const length = this.offset - (this.headerPosition + 1);
            this.bytes.setInt32(this.headerPosition + 1, length);
        }
        return this.bytes.buffer.slice(code ? 0 : 5, this.offset);
    }

    public flush(code?: number): ArrayBuffer {
        var result = this.join(code);
        this.offset = 5; // code (1 byte) + length (4 bytes)
        this.headerPosition = 0;
        new Uint8Array(this.bytes.buffer).fill(0, result.byteLength);
        return new Uint8Array(result);
    }
}
