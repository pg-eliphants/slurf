import fixture from './fixtures/array';
import textMap from '../index';
import { isArrayEqual } from '@test-helpers';

const equality = {
    boolean: isArrayEqual,
    char: isArrayEqual,
    varchar: isArrayEqual,
    text: isArrayEqual,
    bytea: isArrayEqual,
    numeric: isArrayEqual,
    int2: isArrayEqual,
    int4: isArrayEqual,
    int8: isArrayEqual,
    json: isArrayEqual,
    jsonb: isArrayEqual,
    oid: isArrayEqual,
    float4: isArrayEqual,
    float8: isArrayEqual,
    date: isArrayEqual,
    interval: isArrayEqual,
    inet: isArrayEqual
};

type KeyMap = keyof typeof equality;

describe('array type parsing, text -> js', () => {
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
        if (!parser) {
            console.log(`no parser for parser ${name}/${id}`);
            continue;
        }
        describe(name, () => {
            for (const test of tests) {
                const _in = test[0] as string;
                const _out = test[1] as never;
                it(name + '->' + _in, () => {
                    const result = parser(_in) as never;
                    const isEqual = equality[name];
                    if (isEqual) {
                        expect(isEqual(result, _out)).toBeTruthy();
                    }
                });
            }
        });
    }
});
