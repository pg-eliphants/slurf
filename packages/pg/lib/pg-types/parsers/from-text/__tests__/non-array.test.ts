import fixture from './fixtures/non-array';
import textMap from '../index';
import { isEqual as isEqualInterval } from '../interval';
import { Range } from '../range';

function fallBack<T extends string | number | bigint | boolean>(a: T, b: T): boolean {
    return a === b;
}

function range<T extends string | number | bigint>(r1: Range<T>, r2: [null | T, null | T, number]): boolean {
    return r2[0] === r1.lower && r2[1] === r1.upper && r2[2] === r1.mask;
}

const equality = {
    interval: isEqualInterval,
    tsrange: (r1: Range<Date>, r2: number[]) => {
        return (
            r2[0] === (r1.lower ? r1.lower.valueOf() : r1.lower) &&
            r2[1] === (r1.upper ? r1.upper.valueOf() : r1.upper) &&
            r2[2] === r1.mask
        );
    },
    int8: fallBack<bigint>,
    int4: fallBack<number>,
    int2: fallBack<number>,
    oid: fallBack<number>,
    boolean: fallBack<boolean>,
    float4: fallBack<number>,
    float8: fallBack<number>,
    timestamptz: fallBack<number>,
    timestamp(a: number, b: string): boolean {
        return a === new Date(b).valueOf();
    },
    numrange: range<number>,
    int4range: range<number>,
    int8range: range<bigint>,
    tstzrange: range<number>,
    daterange: range<string>,
    bytea(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
};

type KeyMap = keyof typeof equality;

describe('scalar type parsing, text -> js', () => {
    it('check if all fixtures have a corresponsing parser', () => {
        const missing: number[] = [];
        for (const entries of Object.entries(fixture)) {
            const id = entries[1].id;
            if (!textMap[id]) {
                missing.push(id);
            }
        }
        expect(missing).toEqual([]);
    });
    for (const entries of Object.entries(fixture)) {
        const name = entries[0] as KeyMap;
        const { id, tests } = entries[1];
        if (!textMap[id]) {
            continue;
        }
        // create testcase
        const parser = textMap[id];
        describe(name, () => {
            for (const test of tests) {
                const _in = test[0] as string;
                const _out = test[1] as never;
                it(name + '->' + _in, () => {
                    const result = parser(_in) as never;
                    const isEqual = equality[name];
                    expect(isEqual(result, _out)).toBeTruthy();
                });
            }
        });
    }
});
