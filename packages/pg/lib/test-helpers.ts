import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export function loadData(fullPath: string, sep = /,/) {
    const reader = createInterface({
        input: createReadStream(fullPath, { encoding: 'utf8' })
    });
    let resolve: () => void;
    const lines: string[] = [];
    reader.on('line', (input: string) => {
        if (input[0] === '#') {
            return;
        }
        if ('\r\n\t'.includes(input)) {
            return;
        }
        if (!input) {
            return;
        }
        lines.push(input);
    });
    reader.on('close', () => {
        // create xy array of Float64Array
        lines.forEach((v, i) => {
            const cols = v
                .split(sep)
                .map((v) => v.trim())
                .filter((f) => f);
            if (cols.length !== 2) {
                console.info(`on line ${i} ther is not exactly 2 columns, but:${i}`);
            }
        });
        resolve();
    });
    return new Promise<void>((_resolve) => {
        resolve = _resolve;
    });
}
