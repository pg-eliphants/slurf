import type { ParseContext } from '../protocol/messages/back/types';
export function bytesLeft(pc: ParseContext): boolean {
    return pc.buffer.length > pc.cursor;
}
// create parsing context if not exist
// todo: use memory object for this
export function addBufferToParseContext(ctx: ParseContext, newData: Uint8Array): ParseContext {
    const old = ctx.buffer;
    ctx.buffer = new Uint8Array(old.byteLength + newData.byteLength);
    ctx.buffer.set(old, 0);
    ctx.buffer.set(newData, old.byteLength);
    return ctx;
}

export function createParseContext(newData: Uint8Array, txtDecoder): ParseContext {
    return {
        buffer: newData,
        cursor: 0,
        txtDecoder
    };
}
