export type { Range } from './parsers/from-text/range';
export type SubEntries<T> = { entries: EntryTerminals<T>; position: number };
export type EntryTerminal<T> = string | null | T;
export type EntryTerminals<T> = (EntryTerminal<T> | EntryTerminal<T>[])[];
export type Entries<T> = EntryTerminals<T> | SubEntries<T>;

export type BinaryArrayTerminal<T extends boolean | number | bigint | string | null> = T | BinaryArray<T>;
export type BinaryArray<T extends boolean | number | bigint | string | null> = BinaryArrayTerminals<T>;
export type BinaryArrayTerminals<T extends boolean | number | bigint | string | null> = (
    | BinaryArrayTerminal<T>
    | BinaryArrayTerminal<T>[]
)[];

export type Point = {
    x: number;
    y: number;
};

export type Circle = Point & { r: number };

export type Interval = {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
};

export type TextMap<S> = {
    [index: number]: (raw: S) => unknown;
};

// trick for "circular" type reference
export type PropRecord = Record<string, string | number | boolean | bigint> | SubObject;
interface SubObject extends Record<string, PropRecord> {}
