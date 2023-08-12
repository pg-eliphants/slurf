import { equals } from 'rambda';

import fixture from './fixtures/array';
import textMap from '../index';

import testFromFixture from '../../test-helper';

const equality = {
    int4: equals,
    int8: equals
};

testFromFixture('binary array type parsing, text -> js', textMap, fixture, equality);
