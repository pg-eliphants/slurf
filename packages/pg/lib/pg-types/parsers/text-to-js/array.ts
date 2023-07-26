type SubEntries<T> = { entries: EntryTerminals<T>; position: number };
type EntryTerminal<T> = string | null | T;
type EntryTerminals<T> = (EntryTerminal<T> | EntryTerminal<T>[])[];
type Entries<T> = EntryTerminals<T> | SubEntries<T>;

export default function parse<T>(source: string, transform?: (a: string) => T): EntryTerminals<T> {
    return parsePostgresArray(source, transform) as EntryTerminals<T>;
}

function parsePostgresArray<T>(source: string, transform?: (a: string) => T, nested = false): Entries<T> {
    let character = '';
    let quote = false;
    let position = 0;
    let dimension = 0;
    const entries: Entries<T> = [];
    let recorded = '';

    const newEntry = function (includeEmpty = false) {
        let entry: EntryTerminal<T> = recorded;

        if (entry.length > 0 || includeEmpty) {
            if (entry === 'NULL' && !includeEmpty) {
                entry = null;
            }

            if (entry !== null && transform) {
                entry = transform(entry);
            }

            entries.push(entry);
            recorded = '';
        }
    };

    if (source[0] === '[') {
        while (position < source.length) {
            const char = source[position++];

            if (char === '=') {
                break;
            }
        }
    }

    while (position < source.length) {
        let escaped = false;
        character = source[position++];

        if (character === '\\') {
            character = source[position++];
            escaped = true;
        }

        if (character === '{' && !quote) {
            dimension++;

            if (dimension > 1) {
                const parser = parsePostgresArray(source.slice(position - 1), transform, true) as SubEntries<T>;

                (entries as EntryTerminals<T>).push(parser.entries as EntryTerminal<T>);
                position += parser.position - 2;
            }
        } else if (character === '}' && !quote) {
            dimension--;

            if (!dimension) {
                newEntry();

                if (nested) {
                    return {
                        entries,
                        position
                    } as SubEntries<T>;
                }
            }
        } else if (character === '"' && !escaped) {
            if (quote) {
                newEntry(true);
            }

            quote = !quote;
        } else if (character === ',' && !quote) {
            newEntry();
        } else {
            recorded += character;
        }
    }

    if (dimension !== 0) {
        throw new Error('array dimension not balanced');
    }

    return entries;
}
