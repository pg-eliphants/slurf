import fixture from './fixtures/array';
import textMap from '../index';
import { createArrayEqualityValidator } from '@test-helpers';
import { equals } from 'rambda';
import type { Interval } from '@pg-types/types';
import type { Range } from '../range';

import testFromFixture from '../../test-helper';

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

testFromFixture('array type parsing, text -> js', textMap, fixture, equality);
