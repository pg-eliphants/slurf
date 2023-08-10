import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export type LineInfo = { cnt: number; input: string; output?: string; err?: string };

export function loadData(fullPath: string, sep = /,/): Promise<LineInfo[]> {
    const reader = createInterface({
        input: createReadStream(fullPath, { encoding: 'utf8' })
    });
    let resolve: (lines: Required<LineInfo[]>) => void;
    const lines: LineInfo[] = [];
    let cnt = 1;
    reader.on('line', (input: string) => {
        if (cnt === 1) {
            cnt++;
            return;
        }
        if (input[0] === '#') {
            cnt++;
            return;
        }
        if ('\r\n'.includes(input)) {
            cnt++;
            return;
        }
        if (!input) {
            cnt++;
            return;
        }
        lines.push({ cnt, input });
        cnt++;
    });
    reader.on('close', () => {
        lines.forEach((v) => {
            const cols = v.input.split(sep).map((v) => v.trim());
            if (cols.length !== 2) {
                v.err = 'is not exactly 2 columns';
                console.info(`line: ${v.cnt} has error=[${v.err}], column count=[${cols.length}]`);
            } else {
                v.output = cols[1];
                v.input = cols[0];
            }
        });
        resolve(lines as Required<LineInfo>[]);
    });
    return new Promise<LineInfo[]>((_resolve) => {
        resolve = _resolve;
    });
}

export type RecursiveArray<T> = {
    length: number;
    [key: number]: RecursiveArray<T> | T;
};

export function createArrayEqualityValidator<T>(equality: (a: T, b: T) => boolean) {
    return function isArrayEqual(a: RecursiveArray<T>, b: RecursiveArray<T>): boolean {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (Array.isArray(a[i]) && Array.isArray(b[i])) {
                if (!isArrayEqual(a[i] as RecursiveArray<T>, b[i] as RecursiveArray<T>)) {
                    return false;
                }
                continue;
            }
            // only scalar types here
            if (!equality(a[i] as T, b[i] as T)) {
                return false;
            }
        }
        return true;
    };
}
