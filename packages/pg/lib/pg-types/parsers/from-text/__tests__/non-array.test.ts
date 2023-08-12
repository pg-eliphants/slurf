import { equals } from 'rambda';
import fixture from './fixtures/non-array';
import textMap from '../index';
import { isEqual as isEqualInterval } from '../interval';
import { Range } from '../range';
import type { Interval } from '@pg-types/types';

import testFromFixture from '../../test-helper';

function fallBack<T extends string | number | bigint | boolean>(a: T, b: T): boolean {
    return a === b;
}

function range<T extends string | number | bigint>(r1: Range<T>, r2: Range<T>): boolean {
    return equals(r1, r2);
}

const equality: Record<
    string,
    | ((a: string, b: string) => boolean)
    | ((a: Interval, b: Interval) => boolean)
    | ((a: bigint, b: bigint) => boolean)
    | ((a: number, b: number) => boolean)
    | ((a: boolean, b: boolean) => boolean)
    | ((a: Range<number>, r2: Range<number>) => boolean)
    | ((a: Range<bigint>, r2: Range<bigint>) => boolean)
    | ((a: Range<string>, r2: Range<string>) => boolean)
    | ((a: Uint8Array, r2: Uint8Array) => boolean)
> = {
    interval: isEqualInterval,
    tsrange: (r1: Range<number>, r2: Range<number>) => {
        return equals(r1, r2);
    },
    int8: fallBack<bigint>,
    int4: fallBack<number>,
    int2: fallBack<number>,
    oid: fallBack<number>,
    boolean: fallBack<boolean>,
    float4: fallBack<number>,
    float8: fallBack<number>,
    timestamptz: fallBack<number>,
    timestamp(a: number, b: number): boolean {
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

testFromFixture('scalar type parsing, text -> js', textMap, fixture, equality);
