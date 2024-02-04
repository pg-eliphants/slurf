import Bytes2MessageTransformer from '../protocol/Bytes2MessageTransformer';
import { SocketAttributes } from './types';

export default class ReadableByteStream {
    private _cursor: number;
    private length: number;
    private _buffer: Uint8Array;

    private shrink() {
        if (this._cursor > 0) {
            this._buffer.copyWithin(0, this._cursor, this.length);
            this._cursor = 0;
            this.length = this.length - this._cursor;
        }
    }

    private grow(chunk: Uint8Array) {
        const newSize = chunk.byteLength - (this.length - this._cursor);
        const newBuffer = new Uint8Array(newSize);
        newBuffer.set(this._buffer.slice(this._cursor, this.length), 0);
        // newBuffer.set(chunk, this.length - this._cursor);
        // this.length = newSize;
        this._buffer = newBuffer;
    }

    constructor(
        private readonly transformer: Bytes2MessageTransformer,
        initialSize = 0
    ) {
        this._cursor = 0;
        this._buffer = new Uint8Array(initialSize);
        this.length = 0;
    }

    public enqueue(chunk: Uint8Array) {
        if (chunk.byteLength > this._buffer.byteLength - this.length) {
            this.shrink(); // attempt1
            if (chunk.byteLength + this.length > this._buffer.byteLength - this.length) {
                this.grow(chunk);
            }
        }
        this._buffer.set(chunk, this.length);
        this.length += chunk.byteLength;
        const rc = this.transformer.pickUp();
        if (rc === false || rc === null) {
            return false;
        }
        return true;
    }

    public get buffer() {
        return this._buffer;
    }

    public get cursor() {
        return this._cursor;
    }

    public bytesLeft() {
        return this.length - this._cursor;
    }

    public advanceCursor(len: number) {
        this._cursor += len;
    }

    public current() {
        return this._buffer[this._cursor];
    }
}
