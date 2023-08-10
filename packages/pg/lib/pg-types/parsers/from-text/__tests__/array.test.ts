import fixture from './fixtures/array';
import textMap from '../index';
import { createArrayEqualityValidator } from '@test-helpers';
import { equals } from 'rambda';
import type { Interval } from '@pg-types/types';
import type { Range } from '../range';

const isBooleanRecursiveArrayEqual = createArrayEqualityValidator((a: boolean, b: boolean) => a === b);
const isStringRecursiveArrayEqual = createArrayEqualityValidator((a: string, b: string) => a === b);
const isByteArrayRecursiveArrayEqual = createArrayEqualityValidator((a: Uint8Array | null, b: Uint8Array | null) => {
    if (a === null) {
        return b === null;
    }
    if (b === null) {
        return false;
    }
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
});

const isNumberRecursiveArrayEqual = createArrayEqualityValidator((a: number, b: number) => a === b);
const isBigIntRecursiveArrayEqual = createArrayEqualityValidator((a: bigint, b: bigint) => a === b);
const isObjectRecursiveArrayEqual = createArrayEqualityValidator((a: unknown, b: unknown) => {
    return equals(a, b);
});

const isIntervalRecursiveArrayEqual = createArrayEqualityValidator((a: Interval, b: Interval) => {
    return equals(a, b);
});

const isNumRangeRecursiveArrayEqual = createArrayEqualityValidator((a: Range<number>, b: Range<number>) => {
    return equals(a, b);
});

const equality = {
    boolean: isBooleanRecursiveArrayEqual,
    char: isStringRecursiveArrayEqual,
    varchar: isStringRecursiveArrayEqual,
    text: isStringRecursiveArrayEqual,
    bytea: isByteArrayRecursiveArrayEqual,
    numeric: isStringRecursiveArrayEqual,
    int2: isNumberRecursiveArrayEqual,
    int4: isNumberRecursiveArrayEqual,
    int8: isBigIntRecursiveArrayEqual,
    json: isObjectRecursiveArrayEqual,
    point: isObjectRecursiveArrayEqual,
    oid: isNumberRecursiveArrayEqual,
    float4: isNumberRecursiveArrayEqual,
    float8: isNumberRecursiveArrayEqual,
    date: isStringRecursiveArrayEqual,
    interval: isIntervalRecursiveArrayEqual,
    inet: isStringRecursiveArrayEqual,
    cidr: isStringRecursiveArrayEqual,
    macaddr: isStringRecursiveArrayEqual,
    numrange: isNumRangeRecursiveArrayEqual
};

type KeyMap = keyof typeof equality;

describe('array type parsing, text -> js', () => {
    it('check if all fixtures have a corresponding parser', () => {
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
                    if (isEqual) {
                        expect(isEqual(result, _out)).toBeTruthy();
                        return;
                    }
                    throw new Error('no equality check for:' + name);
                });
            }
        });
    }
});
