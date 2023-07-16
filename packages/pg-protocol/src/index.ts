import { /*BackendMessage,*/ DatabaseError } from './messages';
import { serialize } from './serializer';
import { Parser, MessageCallback } from './parser';

export function parse(stream: NodeJS.ReadableStream, callback: MessageCallback): Promise<void> {
    const parser = new Parser();
    stream.on('data', (buffer: Buffer) => parser.parse(buffer, callback));

    // only when the message "ends" ( a message boundery? ) so this kinda makes sense, sure
    return new Promise((resolve) => stream.on('end', () => resolve()));
}

export { serialize, DatabaseError };
