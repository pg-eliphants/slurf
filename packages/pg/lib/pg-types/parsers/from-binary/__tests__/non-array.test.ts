//import { equals } from 'rambda';

import fixture from './fixtures/non-array';
import textMap from '../';

import testFromFixture from '../../test-helper';

const numberEqual = (a: number, b: number) => a === b;
const stringEqual = (a: string, b: string) => a === b;
const booleanEqual = (a: boolean, b: boolean) => a === b;

const equality = {
    varchar: stringEqual,
    int4: numberEqual,
    int8: (a: bigint, b: bigint) => a === b,
    oid: numberEqual,
    numeric: stringEqual,
    float4: numberEqual,
    float8: numberEqual,
    boolean: booleanEqual,
    text: stringEqual
};

testFromFixture('binary non-array type parsing, text -> js', textMap, fixture, equality);
