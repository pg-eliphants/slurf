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
