import ReadableStream from '../io/ReadableByteStream';
import { mapKey2Parser } from './messages/back/constants';
import type { LookupKeyParser, parseType } from './messages/back/types';
import { AUTH_CLASS } from './messages/back/constants';
import { SocketAttributes } from '../io/types';
import { SocketAttributeAuxMetadata } from '../initializer/types';

export function createBytes2MessageTransformerCreator(txtTextDecoder: TextDecoder) {
    return function (attr: SocketAttributes<SocketAttributeAuxMetadata>) {
        return new Bytes2MessageTransformer(txtTextDecoder, attr);
    };
}

export type CreateTransformerFactory = typeof createBytes2MessageTransformerCreator;
export type CreateTransformer = ReturnType<CreateTransformerFactory>;

export default class Bytes2MessageTransformer {
    private parser: parseType<LookupKeyParser> | undefined;
    private currentKey: LookupKeyParser | undefined;
    constructor(
        private readonly txtTextDecorder: TextDecoder,
        private readonly attr: SocketAttributes<SocketAttributeAuxMetadata>
    ) {}

    pickUp() {
        // ssl handshake, and send startupMessage are put here here
        if (!this.parser) {
            // this could be seperate function, helper maybe
            const key = this.attr.ioMeta.readable.current();
            if (key === AUTH_CLASS) {
                this.currentKey = AUTH_CLASS;
                this.parser = mapKey2Parser[key] as parseType<typeof AUTH_CLASS>;
            }
            // todo: error if the message is unrecognizable
            return false;
        }
        const rc = this.parser(this.attr.ioMeta.readable, this.txtTextDecorder);
        if (rc === undefined) return rc;
        if (rc === null) {
            // forward error parsing message AUTH_CLASS
            // this.forward
            return null; // indicates error
        }
        // forward passing auth message
        return true;
    }
}
