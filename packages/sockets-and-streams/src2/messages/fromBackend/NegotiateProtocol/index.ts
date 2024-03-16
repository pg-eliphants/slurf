/* done
NegotiateProtocolVersion (B) 
Byte1('v')
Identifies the message as a protocol version negotiation message.

Int32
Length of message contents in bytes, including self.

Int32
Newest minor protocol version supported by the server for the major protocol version requested by the client.

Int32
Number of protocol options not recognized by the server.

Then, for protocol option not recognized by the server, there is the following:

String
The option name.
*/
import { i32, messageLength, match } from '../helper';
import { MSG_NOT, MSG_UNDECIDED } from '../constants';
import ReadableByteStream from '../../../utils/ReadableByteStream';

export type NegotiateProtocolResult = {
    type: 'negotiate-result';
    minor: number;
    options: string[];
};

export const NEGOTIATE_TYPE: NegotiateProtocolResult['type'] = 'negotiate-result';

export function isNegotiateProtocolVersion(u: any): u is NegotiateProtocolResult {
    return u?.type === NEGOTIATE_TYPE;
}

export function parse(
    ctx: ReadableByteStream,
    txtDecoder: TextDecoder
): false | null | undefined | NegotiateProtocolResult {
    const { buffer, cursor } = ctx;
    const matched = match(118, buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    if (matched === MSG_NOT) {
        return false;
    }
    const len = messageLength(buffer, cursor);

    const minor = i32(buffer, cursor + 5);
    let numOptionsNotRecognized = i32(buffer, cursor + 9);
    const options = new Array(numOptionsNotRecognized);
    for (let pos = cursor + 13; numOptionsNotRecognized > 0; ) {
        const idx = buffer.indexOf(0, pos);
        if (idx < 0) {
            return null;
        }
        options[pos - 13].push(txtDecoder.decode(buffer.slice(pos, idx)));
        pos = idx + 1;
        numOptionsNotRecognized--;
    }
    if (numOptionsNotRecognized === 0) {
        ctx.advanceCursor(len);
        return { type: NEGOTIATE_TYPE, minor, options };
    }
    return null;
}
