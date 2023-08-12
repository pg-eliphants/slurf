import { equals } from 'rambda';
import testFromFixture from '../../test-helper';

import fixture from './fixtures/geometry';
import textMap from '../index';

const equality = {
    point: equals,
    circle: equals
};

testFromFixture('geometry type parsing, text -> js', textMap, fixture, equality);
