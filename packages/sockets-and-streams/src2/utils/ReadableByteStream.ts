export default class ReadableByteStream {
    private _cursor: number;
    private _length: number;
    private _buffer: Uint8Array;
    private readonly canGrow: boolean;

    private grow(chunk: Uint8Array) {
        const newSize = chunk.byteLength + (this._length - this._cursor);
        const newBuffer = new Uint8Array(newSize);
        newBuffer.set(this._buffer.slice(this._cursor, this._length), 0);
        // newBuffer.set(chunk, this._length - this._cursor);
        // this._length = newSize;
        this._buffer = newBuffer;
    }

    constructor(initialSize = 0, canGrow = true) {
        this._cursor = 0;
        this._buffer = new Uint8Array(initialSize);
        this._length = 0;
        this.canGrow = canGrow;
    }

    public shrink() {
        if (this._cursor > 0) {
            this._buffer.copyWithin(0, this._cursor, this._length);
            this._length = this._length - this._cursor;
            this._cursor = 0;
        }
    }

    public enqueue(chunk: Uint8Array) {
        if (chunk.byteLength > this._buffer.byteLength - this._length) {
            this.shrink(); // attempt1
            if (chunk.byteLength + this._length > this._buffer.byteLength - this._length) {
                if (!this.canGrow) {
                    return false;
                }
                this.grow(chunk);
            }
        }
        this._buffer.set(chunk, this._length);
        this._length += chunk.byteLength;
        return true;
    }

    public copyLeftOver() {
        return this._buffer.slice(this._cursor, this._length);
    }

    public length() {
        return this._length;
    }

    public get buffer() {
        return this._buffer;
    }

    public get cursor() {
        return this._cursor;
    }

    public bytesLeft() {
        return this._length - this._cursor;
    }

    public advanceCursor(len: number) {
        this._cursor += len;
    }

    public current() {
        return this._buffer[this._cursor];
    }

    public getStored() {
        return this._buffer.slice(0, this._length);
    }

    public getProcessed() {
        return this._buffer.slice(0, this.cursor);
    }
}
