export type DecoderMarker = {
    offset: number;
};

export default class Decoder {
    private offset: number;
    private headerPosition: number;
    private totalLen: number;
    private toBeFetched: number;
    private currentView: DataView;
    private bin: Uint8Array;
    private chunkLen: number;
    private marker: DecoderMarker;

    constructor(private txtDecoder: TextDecoder) {}

    public init(bin: Uint8Array, len: number, offset = 5, headerpos = 1, totalLen?: number) {
        this.currentView = new DataView(bin.buffer, len);
        //
        this.offset = offset;
        this.bin = bin;
        this.chunkLen = len;
        this.headerPosition = headerpos;
        this.totalLen = totalLen ?? ((len >= 5 && this.currentView.getInt32(1) - 4) || len);
        this.toBeFetched = (len >= 5 ? 5 : 0) + this.totalLen - len;
        this.marker = { offset };
    }

    public mark() {
        this.marker.offset = this.offset;
    }

    public rollBackToMarker() {
        this.offset = this.marker.offset;
    }

    public getMessageLength() {
        return this.totalLen;
    }

    public isChunk() {
        return this.toBeFetched > 0;
    }

    public bytesLeft() {
        return this.chunkLen - this.offset;
    }

    public getChar() {
        if (this.offset >= this.currentView.byteLength) {
            return errOverflow;
        }
        return this.currentView.getUint8(this.offset++);
    }

    public getCstr(): string | ToBeContinued | ErrMissing | ErrOverflow {
        if (this.offset > this.currentView.byteLength) {
            return errOverflow;
        }
        // TODO: WASM needed. This part should be accelerated by wasm,
        // what we actually want to do is
        //  -> const idx = this.bin.indexOf(0, this.offset, maxIndexToSearch)
        // we want to have a maxIndexToSearch because the buffer is like 64k and there is no
        // guaranteed to have
        const idx = this.bin.indexOf(0, this.offset);
        if (idx < 0 || idx >= this.chunkLen) {
            if (this.toBeFetched <= 0) {
                return errOverflow;
            }
            return errMissing;
        }
        const rc = this.txtDecoder.decode(this.bin.slice(this.offset, idx));
        this.offset = idx + 1; // skip the zero terminator
        return rc;
    }
}
