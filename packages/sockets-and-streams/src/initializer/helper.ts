import type { ParseContext } from '../protocol/messages/back/types';
export function bytesLeft(pc: ParseContext): boolean {
    return pc.buffer.length > pc.cursor;
}
