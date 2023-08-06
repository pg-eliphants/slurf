import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

type LineInfo = { cnt: number; input: string; output?: string; err?: string };

export function loadData(fullPath: string, sep = /,/) {
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
        lines.forEach((v, i) => {
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
