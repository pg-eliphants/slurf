//done
import { PARAM_STATUS, MSG_IS, MSG_NOT, MSG_UNDECIDED } from './constants';
import { ParseContext, MessageState } from './types';
import { createMatcher, i32, messageLength } from './helper';

export type ParameterStatus = {
    name: string;
    value: string;
};

/* you can get this message at any time

    ParameterStatus (B) 
    Byte1('S')
    Identifies the message as a run-time parameter status report.

    Int32
    Length of message contents in bytes, including self.

    String
    The name of the run-time parameter being reported.

    String
    The current value of the parameter.

    At present there is a hard-wired set of parameters for which ParameterStatus will be gen-
erated: they are server_version, server_encoding, client_encoding, applica-
tion_name, default_transaction_read_only, in_hot_standby, is_superuser,
session_authorization, DateStyle, IntervalStyle, TimeZone, integer_date-
times, and standard_conforming_strings. (server_encoding, TimeZone, and
integer_datetimes were not reported by releases before 8.0; standard_conform-
ing_strings was not reported by releases before 8.1; IntervalStyle was not reported
by releases before 8.4; application_name was not reported by releases before 9.0; de-
fault_transaction_read_only and in_hot_standby were not reported by releases be-
fore 14.) Note that server_version, server_encoding and integer_datetimes are
pseudo-parameters that cannot change after startup. This set might change in the future, or even be-
come configurable. Accordingly, a frontend should simply ignore ParameterStatus for parameters that
it does not understand or care about.
*/

const match = createMatcher(PARAM_STATUS);

export function parse(ctx: ParseContext): false | null | ParameterStatus | undefined {
    const { buffer, cursor, txtDecoder } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_NOT) {
        return false;
    }
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }

    const endPosition = cursor + messageLength(buffer, cursor);
    let pos = cursor + 5;
    const split = buffer.indexOf(0, pos);
    if (split < 0 || split > endPosition) {
        return null;
    }

    const name = txtDecoder.decode(buffer.slice(pos, split));
    if (buffer[endPosition - 1] !== 0) {
        return null;
    }
    const value = txtDecoder.decode(buffer.slice(split + 1, endPosition));
    ctx.cursor = endPosition;
    return { name, value };
}
