import init from '../text-to-js';
//import type { PropRecord } from '.';
/*
const text: Record<number, (a: string) => unknown> = {};

function register(oid: number, fn: (a: string) => unknown) {
    text[oid] = fn;
}

init(register);
const arr = Array.from(Object.entries(text)).sort((a, b) => {
    a[0] = parseInt(a[0]) as any;
    b[0] = parseInt(b[0]) as any;
    const namea = typeof a[1] !== 'string' ? (a[1]?.prototype ? a[1]?.prototype?.constructor?.name : a[1].name) : a[1];
    const nameb = typeof b[1] !== 'string' ? (b[1]?.prototype ? b[1]?.prototype?.constructor?.name : b[1].name) : b[1];

    a[1] = namea as any;
    b[1] = nameb as any;
    const [ka, va] = a;
    const [kb, vb] = b;

    if (ka > kb) return 1;
    if (ka < kb) return -1;
    return 0;
});

console.log(arr);

describe('run init', () => {
    it('show off', () => {
        console.log(arr.forEach((arr) => console.log(`[${arr[0]}]: ${arr[1]}`)
        
    });
});
*/
describe('binary to js', () => {
    it('show off', () => {
        expect(true).toBe(true);
    });
});
