export type SubEntries<T> = { entries: EntryTerminals<T>; position: number };
export type EntryTerminal<T> = string | null | T;
export type EntryTerminals<T> = (EntryTerminal<T> | EntryTerminal<T>[])[];
export type Entries<T> = EntryTerminals<T> | SubEntries<T>;

export type BinaryArrayTerminal = number | bigint | string | null | BinaryArray;
export type BinaryArrayTerminals = (BinaryArrayTerminal | BinaryArrayTerminal[])[];
export type BinaryArray = BinaryArrayTerminals;
