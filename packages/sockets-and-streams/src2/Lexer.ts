import type { TagToTokenGeneratorMap, TagType, Tokens } from './messages/fromBackend/types';
import ReadableByteStream from './utils/ReadableByteStream';

export default class Lexer<T extends TagType> {
    private inProgressTag: T | undefined;
    private dataCorrupted: boolean;
    private outOfDomainMsgType: boolean;
    // end of life of this lexer has been reached
    private eol: boolean;
    private collectedTokens: Tokens[];
    constructor(
        private readonly allowedMessages: T[],
        private readonly receivedData: ReadableByteStream,
        private readonly mapTagToLexer: TagToTokenGeneratorMap<T>
    ) {
        this.eol = false;
        this.collectedTokens = [];
        this.outOfDomainMsgType = false;
        this.dataCorrupted = false;
        this.inProgressTag = undefined;
    }
    public handleData() {
        if (this.inProgressTag !== undefined) {
            const currentGenerator = this.mapTagToLexer[this.inProgressTag];
            const result = currentGenerator();
            if (result === null || result === false) {
                this.dataCorrupted = true;
                // todo: what to do here? signal
            } else if (result === undefined) {
                return; // wait for more data
            } else {
                // what to do with this result?
            }
        }
    }
}
