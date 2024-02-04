//done
import { MSG_UNDECIDED } from './constants';
import { i32, match, messageLength } from './helper';
import ReadableStream from '../../../io/ReadableByteStream';

/*
    BackendKeyData (B) #
    Byte1('K')
    Identifies the message as cancellation key data. The frontend must save these values if it wishes to be able to issue CancelRequest messages later.

    Int32(12)
    Length of message contents in bytes, including self.

    Int32
    The process ID of this backend.

    Int32
    The secret key of this backend.
*/

export type BackendKeyData = {
    pid: number;
    secret: number;
};

export function parse(ctx: ReadableStream, _txtDecoder: TextDecoder): undefined | BackendKeyData {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    const bkd = {
        pid: i32(buffer, cursor + 5),
        secret: i32(buffer, 9)
    };
    ctx.advanceCursor(messageLength(buffer, cursor));
    return bkd;
}
