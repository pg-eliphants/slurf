export const RANGE_EMPTY = 1 << 1;
export const RANGE_LB_INC = 1 << 2;
export const RANGE_UB_INC = 1 << 3;
export const RANGE_LB_INF = 1 << 4;
export const RANGE_UB_INF = 1 << 5;

const EMPTY = 'empty';
const INFINITY = 'infinity';

export class RangeError extends Error {}

export class Range<T = null> {
    hasMask(flag: number) {
        return (this.mask & flag) === flag;
    }
    constructor(
        public readonly lower: T,
        public readonly upper: T,
        public readonly mask = 0
    ) {}

    isEmpty() {
        return this.hasMask(RANGE_EMPTY);
    }

    isBounded() {
        return !this.hasMask(RANGE_LB_INF) && !this.hasMask(RANGE_UB_INF);
    }

    isLowerBoundClosed() {
        return this.hasLowerBound() && this.hasMask(RANGE_LB_INC);
    }

    isUpperBoundClosed() {
        return this.hasUpperBound() && this.hasMask(RANGE_UB_INC);
    }

    hasLowerBound() {
        return !this.hasMask(RANGE_LB_INF);
    }

    hasUpperBound() {
        return !this.hasMask(RANGE_UB_INF);
    }

    containsPoint(point: T) {
        const l = this.hasLowerBound();
        const u = this.hasUpperBound();

        if (l && u) {
            const inLower = this.hasMask(RANGE_LB_INC) ? this.lower <= point : this.lower < point;
            const inUpper = this.hasMask(RANGE_UB_INC) ? this.upper >= point : this.upper > point;

            return inLower && inUpper;
        } else if (l) {
            return this.hasMask(RANGE_LB_INC) ? this.lower <= point : this.lower < point;
        } else if (u) {
            return this.hasMask(RANGE_UB_INC) ? this.upper >= point : this.upper > point;
        }

        // INFINITY
        return true;
    }

    containsRange(range: Range<T>) {
        return (
            (!range.hasLowerBound() || this.containsPoint(range.lower)) &&
            (!range.hasUpperBound() || this.containsPoint(range.upper))
        );
    }
}

type TransformFn<T> = (x: string) => T;

export default function parseRange<T = string>(input: string, transform: TransformFn<T>): Range<T> {
    input = input.trim();

    if (input === EMPTY) {
        return new Range<T>(null as T, null as T, RANGE_EMPTY);
    }

    let ptr = 0;
    let mask = 0;

    if (input[ptr] === '[') {
        mask |= RANGE_LB_INC;
        ptr += 1;
    } else if (input[ptr] === '(') {
        ptr += 1;
    } else {
        throw new RangeError(`Unexpected character '${input[ptr]}'. Position: ${ptr}`);
    }

    const lb = parseBound(input, ptr);
    if (lb.infinite) {
        mask |= RANGE_LB_INF;
    }
    ptr = lb.ptr;

    if (input[ptr] === ',') {
        ptr += 1;
    } else {
        throw new RangeError(`Expected comma as the delimiter, got '${input[ptr]}'. Position: ${ptr}`);
    }

    const ub = parseBound(input, ptr);
    if (ub.infinite) {
        mask |= RANGE_UB_INF;
    }
    ptr = ub.ptr;

    if (input[ptr] === ']') {
        mask |= RANGE_UB_INC;
        ptr += 1;
    } else if (input[ptr] === ')') {
        ptr += 1;
    } else {
        throw new RangeError(`Unexpected character '${input[ptr]}'. Position: ${ptr}`);
    }

    let lower = null;
    let upper = null;

    if ((mask & RANGE_LB_INF) !== RANGE_LB_INF) {
        lower = transform(lb.value!);
    }

    if ((mask & RANGE_UB_INF) !== RANGE_UB_INF) {
        upper = transform(ub.value!);
    }

    return new Range(lower, upper, mask) as Range<T>;
}

function parseBound(input: string, ptr: number): { value: string | null; infinite: boolean; ptr: number } {
    if (input[ptr] === ',' || input[ptr] === ')' || input[ptr] === ']') {
        return {
            infinite: true,
            value: null,
            ptr
        };
    } else {
        let inQuote = false;
        let value = '';
        let pos = ptr;

        while (inQuote || !(input[ptr] === ',' || input[ptr] === ')' || input[ptr] === ']')) {
            const ch = input[ptr++];

            if (ch === undefined) {
                throw new RangeError(`Unexpected end of input. Position: ${ptr}`);
            }
            if (ch === '\\') {
                if (input[ptr] === undefined) {
                    throw new RangeError(`Unexpected end of input. Position: ${ptr}`);
                }

                value += input.slice(pos, ptr - 1) + input[ptr];
                ptr += 1;
                pos = ptr;
            } else if (ch === '"') {
                if (!inQuote) {
                    inQuote = true;
                    pos += 1;
                } else if (input[ptr] === '"') {
                    value += input.slice(pos, ptr - 1) + input[ptr];
                    ptr += 1;
                    pos = ptr;
                } else {
                    inQuote = false;
                    value += input.slice(pos, ptr - 1);
                    pos = ptr + 1;
                }
            }
        }

        if (ptr > pos) {
            value += input.slice(pos, ptr);
        }

        if (value.endsWith(INFINITY)) {
            return {
                infinite: true,
                value: null,
                ptr
            };
        }

        return {
            infinite: false,
            value,
            ptr
        };
    }
}

export type Format<T> = (a: T) => string;
const defaultFormat: Format<string> = (x: string) => x;
export function serialize<T>(range: Range<T>, format: Format<T> = defaultFormat as Format<T>) {
    if (range.hasMask(RANGE_EMPTY)) {
        return EMPTY;
    }

    let s = '';
    range.lower;
    s += range.isLowerBoundClosed() ? '[' : '(';
    s += range.hasLowerBound() ? serializeBound(format(range.lower)) : '-' + INFINITY;
    s += ',';
    s += range.hasUpperBound() ? serializeBound(format(range.upper)) : INFINITY;
    s += range.isUpperBoundClosed() ? ']' : ')';

    return s;
}

function serializeBound<T>(bnd: T | T[] | string) {
    let needsQuotes = false;
    let pos = 0;
    let value = '';
    if (bnd === null || bnd === '' || (Array.isArray(bnd) && bnd.length === 0)) {
        return '""';
    }
    if (typeof bnd === 'number' || typeof bnd === 'bigint') return bnd.toString();
    if (typeof bnd !== 'string') {
        bnd = String(bnd);
    }

    bnd = bnd.trim();

    for (let i = 0; i < bnd.length; i++) {
        const ch = bnd[i];

        if (
            ch === '"' ||
            ch === '\\' ||
            ch === '(' ||
            ch === ')' ||
            ch === '[' ||
            ch === ']' ||
            ch === ',' ||
            ch === ' '
        ) {
            needsQuotes = true;
            break;
        }
    }

    if (needsQuotes) {
        value += '"';
    }

    let ptr = 0;
    for (; ptr < bnd.length; ptr++) {
        const ch = bnd[ptr];

        if (ch === '"' || ch === '\\') {
            value += bnd.slice(pos, ptr + 1) + ch;
            pos = ptr + 1;
        }
    }

    if (ptr > pos) {
        value += bnd.slice(pos, ptr);
    }

    if (needsQuotes) {
        value += '"';
    }

    return value;
}
