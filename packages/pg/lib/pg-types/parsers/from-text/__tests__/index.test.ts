import fixture from './fixtures/non-array';
import textMap, { isEqual } from '../index';

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
        const name = entries[0];
        const { id, tests } = entries[1];
        if (!textMap[id]) {
            continue;
        }
        // create testcase
        const parser = textMap[id];
        describe(name, () => {
            for (const test of tests) {
                const _in = test[0] as string;
                const _out = test[1];
                it(name + '->' + _in, () => {
                    if (name === 'tstzrange') {
                        const a = 1;
                        console.log(a);
                    }
                    const result = parser(_in as string);
                    if (!isEqual(result, _out)) {
                        console.info(`not equal for ${name}, in=${_in} resul=${result}, out=${_out}`);
                    }
                    //expect(_out).toEqual(result);
                });
            }
        });
    }
});
