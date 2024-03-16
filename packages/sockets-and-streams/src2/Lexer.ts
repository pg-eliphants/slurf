import type { GeneratorOfMessage, SelectedMessages, TagType } from './messages/fromBackend/types';
import ReadableByteStream from './utils/ReadableByteStream';
import { mapMsgTagToParser } from './messages/fromBackend/constants';

type CallBack<T extends TagType = TagType> = (
    eol: boolean,
    readable: ReadableByteStream,
    tokens: SelectedMessages<T>[],
    lastToken: number
) => void;

type CallBackErr<T extends TagType = TagType> = (readable: ReadableByteStream, tokens: SelectedMessages<T>[]) => void;
export default class Lexer<T extends TagType> {
    private inProgressTag: T | undefined;
    private dataCorrupted: boolean;
    private outOfDomainMsgType: boolean;
    // end of life of this lexer has been reached
    private eol: boolean;
    private readonly collectedTokens: SelectedMessages<T>[];
    constructor(
        private readonly receivedBytes: ReadableByteStream,
        private readonly isEOL: (token: SelectedMessages<T>) => boolean,
        private readonly allowed: T[],
        private readonly curruptedCB: CallBackErr<T>,
        private readonly eolCB: CallBack<T>,
        private readonly outOfDomain: CallBackErr<T>,
        private readonly decoder: TextDecoder
    ) {
        this.eol = false;
        this.collectedTokens = [];
        this.outOfDomainMsgType = false;
        this.dataCorrupted = false;
        this.inProgressTag = undefined;
    }
    public getTokens() {
        return this.collectedTokens;
    }
    public handleData() {
        while (!this.eol && !this.dataCorrupted && !this.outOfDomainMsgType && this.receivedBytes.bytesLeft() > 0) {
            const tag = this.inProgressTag ?? this.receivedBytes.current();
            if (this.allowed.includes(tag as T) === false) {
                this.outOfDomainMsgType = true;
                this.outOfDomain(this.receivedBytes, this.collectedTokens);
                return;
            }
            const currentGenerator: GeneratorOfMessage<T> | undefined = mapMsgTagToParser[tag];
            if (currentGenerator === undefined) {
                this.outOfDomainMsgType = true;
                this.outOfDomain(this.receivedBytes, this.collectedTokens);
                return;
            }
            const result = currentGenerator(this.receivedBytes, this.decoder);
            // "false" is an error too because the tag was pre-checked
            if (result === null || result === false) {
                this.dataCorrupted = true;
                this.curruptedCB(this.receivedBytes, this.collectedTokens);
                // todo: what to do here? signal
            } else if (result === undefined) {
                this.inProgressTag = tag as T;
                return; // wait for more data
            } else {
                const len = this.collectedTokens.push(result);
                if (this.isEOL(result)) {
                    this.eol = true;
                }
                this.eolCB(this.eol, this.receivedBytes, this.collectedTokens, len - 1);
            }
        }
    }
}
