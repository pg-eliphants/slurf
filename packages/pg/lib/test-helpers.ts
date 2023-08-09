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

export type RecursiveArray = {
    length: number;
    [key: number]: RecursiveArray | number | string | boolean | bigint | null | undefined;
};

export function isArrayEqual(a: RecursiveArray, b: RecursiveArray): boolean {
    if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
        return isArrayEqual(new Uint8Array(a), new Uint8Array(b));
    }
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (Array.isArray(a[i]) && Array.isArray(b[i])) {
            if (!isArrayEqual(a[i] as RecursiveArray, b[i] as RecursiveArray)) {
                return false;
            }
        }
        // only scalar types here
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
/*
export type RecursiveObject = {
    [key: string]: RecursiveObject | number | string | boolean;
};

function isStringArrayEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) {
        return false;
    }
    let base = 0;
    for (const k1 of arr1) {
        const idx = arr2.indexOf(k1, base);
        if (idx === -1) {
            return false;
        }
        const temp = arr2[base];
        arr2[base] = k1;
        arr2[idx] = temp;
        base++;
    }
    return true;
}

export function isObjectEqual(obj1: RecursiveObject, obj2: RecursiveObject): boolean {
    if (!(obj1 instanceof Object && obj2 instanceof Object)) {
        return false;
    }
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    let base = 0;
    for (const k1 of keys1) {
        const idx = keys2.indexOf(k1, base);
        if (idx < 0) {
            return false;
        }
        // is it euqal
        if (obj1[k1] !== obj2[k1]) {
            return false;
        }
        const temp = keys2[base];
        keys2[base] = k1;
        keys2[idx] = temp;
        base++;
    }
    if (base !== keys2.length) {
        return false;
    }
    return true;
}
*/
