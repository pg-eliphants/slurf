const CHAR_CODE_0 = '0'.charCodeAt(0);
const CHAR_CODE_9 = '9'.charCodeAt(0);
const CHAR_CODE_DASH = '-'.charCodeAt(0);
const CHAR_CODE_COLON = ':'.charCodeAt(0);
const CHAR_CODE_SPACE = ' '.charCodeAt(0);
const CHAR_CODE_DOT = '.'.charCodeAt(0);
const CHAR_CODE_Z = 'Z'.charCodeAt(0);
const CHAR_CODE_MINUS = '-'.charCodeAt(0);
const CHAR_CODE_PLUS = '+'.charCodeAt(0);

type ParseContext = {
    pos: number;
    readonly len: number;
    readonly dateString: string;
};

function checkEnd(ctx: ParseContext) {
    return ctx.pos === ctx.len;
}

function readBC(ctx: ParseContext) {
    if (ctx.pos === ctx.len) {
        return false;
    }

    if (ctx.dateString.indexOf(' BC', ctx.pos) === ctx.pos) {
        ctx.pos += 3;
        return true;
    }

    return false;
}

function readSign(ctx: ParseContext) {
    if (ctx.pos >= ctx.len) {
        return null;
    }

    const char = ctx.dateString.charCodeAt(ctx.pos);
    if (char === CHAR_CODE_PLUS) {
        ctx.pos += 1;
        return 1;
    }

    if (char === CHAR_CODE_MINUS) {
        ctx.pos += 1;
        return -1;
    }

    return null;
}

function getUTC(ctx: ParseContext) {
    return skipChar(ctx, CHAR_CODE_Z);
}

function getTZOffset(ctx: ParseContext) {
    // special handling for '+00' at the end of  - UTC
    if (ctx.pos === ctx.len - 3 && ctx.dateString.indexOf('+00', ctx.pos) === ctx.pos) {
        ctx.pos += 3;
        return 0;
    }

    if (ctx.len === ctx.pos) {
        return undefined;
    }

    const sign = readSign(ctx);
    if (sign === null) {
        if (getUTC(ctx)) {
            return 0;
        }
        return undefined;
    }

    const hours = readInteger2(ctx);
    if (hours === null) {
        return null;
    }
    let offset = hours * 3600;

    if (!skipChar(ctx, CHAR_CODE_COLON)) {
        return offset * sign * 1000;
    }

    const minutes = readInteger2(ctx);
    if (minutes === null) {
        return null;
    }
    offset += minutes * 60;

    if (!skipChar(ctx, CHAR_CODE_COLON)) {
        return offset * sign * 1000;
    }

    const seconds = readInteger2(ctx);
    if (seconds == null) {
        return null;
    }

    return (offset + seconds) * sign * 1000;
}

/* read milliseconds out of time fraction, returns 0 if missing, null if format invalid */
function readMilliseconds(ctx: ParseContext) {
    /* read milliseconds from fraction: .001=1, 0.1 = 100 */
    if (skipChar(ctx, CHAR_CODE_DOT)) {
        let i = 2;
        let val = 0;
        const start = ctx.pos;
        while (ctx.pos < ctx.len) {
            const chr = ctx.dateString.charCodeAt(ctx.pos);
            if (isDigit(chr)) {
                ctx.pos += 1;
                if (i >= 0) {
                    val += (chr - CHAR_CODE_0) * 10 ** i;
                }
                i -= 1;
            } else {
                break;
            }
        }

        if (start === ctx.pos) {
            return null;
        }

        return val;
    }

    return 0;
}

function skipChar(ctx: ParseContext, char: number) {
    if (ctx.pos === ctx.len) {
        return false;
    }

    if (ctx.dateString.charCodeAt(ctx.pos) === char) {
        ctx.pos += 1;
        return true;
    }

    return false;
}

function readTime(ctx: ParseContext) {
    if (ctx.len - ctx.pos < 9 || !skipChar(ctx, CHAR_CODE_SPACE)) {
        return { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
    }

    const hours = readInteger2(ctx);
    if (hours === null || !skipChar(ctx, CHAR_CODE_COLON)) {
        return null;
    }
    const minutes = readInteger2(ctx);
    if (minutes === null || !skipChar(ctx, CHAR_CODE_COLON)) {
        return null;
    }
    const seconds = readInteger2(ctx);
    if (seconds === null) {
        return null;
    }

    const milliseconds = readMilliseconds(ctx);
    if (milliseconds === null) {
        return null;
    }

    return { hours, minutes, seconds, milliseconds };
}

function readInteger2(ctx: ParseContext) {
    const chr1 = ctx.dateString.charCodeAt(ctx.pos);
    const chr2 = ctx.dateString.charCodeAt(ctx.pos + 1);

    if (isDigit(chr1) && isDigit(chr2)) {
        ctx.pos += 2;
        return (chr1 - CHAR_CODE_0) * 10 + (chr2 - CHAR_CODE_0);
    }

    return null;
}

function isDigit(c: number) {
    return c >= CHAR_CODE_0 && c <= CHAR_CODE_9;
}

function readInteger(ctx: ParseContext) {
    let val = 0;
    const start = ctx.pos;
    while (ctx.pos < ctx.len) {
        const chr = ctx.dateString.charCodeAt(ctx.pos);
        if (isDigit(chr)) {
            val = val * 10;
            ctx.pos += 1;
            val += chr - CHAR_CODE_0;
        } else {
            break;
        }
    }

    if (start === ctx.pos) {
        return null;
    }

    return val;
}

function readDate(ctx: ParseContext) {
    const year = readInteger(ctx);
    if (!skipChar(ctx, CHAR_CODE_DASH)) {
        return null;
    }

    let month = readInteger2(ctx);
    if (!skipChar(ctx, CHAR_CODE_DASH)) {
        return null;
    }

    const day = readInteger2(ctx);
    if (year === null || month === null || day === null) {
        return null;
    }

    month = month - 1;
    return { year, month, day };
}

function parseISODate(isoDate: string): Date | null {
    const ctx = {
        pos: 0,
        len: isoDate.length,
        dateString: isoDate
    };

    const date = readDate(ctx);
    if (date === null) {
        return null;
    }
    const time = readTime(ctx);
    if (time === null) {
        return null;
    }
    const tzOffset = getTZOffset(ctx);
    if (tzOffset === null) {
        return null;
    }

    const isBC = readBC(ctx);
    if (isBC) {
        date.year = -(date.year - 1);
    }

    if (!checkEnd(ctx)) {
        return null;
    }

    if (tzOffset !== undefined) {
        const jsDate = new Date(
            Date.UTC(date.year, date.month, date.day, time.hours, time.minutes, time.seconds, time.milliseconds)
        );

        if (date.year <= 99 && date.year >= -99) {
            jsDate.setUTCFullYear(date.year);
        }

        if (tzOffset !== 0) {
            jsDate.setTime(jsDate.getTime() - tzOffset);
        }
        return jsDate;
    }

    const jsDate = new Date(date.year, date.month, date.day, time.hours, time.minutes, time.seconds, time.milliseconds);
    if (date.year <= 99 && date.year >= -99) {
        jsDate.setFullYear(date.year);
    }
    return jsDate;
}

export default function parseDate(isoDate: string): number | Date | null {
    return (
        (isoDate && parseISODate(isoDate)) ||
        +(isoDate === 'infinity') * Infinity ||
        -(isoDate === '-infinity') * Infinity ||
        null
    );
}
