import fixture from './fixtures/non-array';
import textMap, { isEqual as isEqualFallback } from '../index';
import { isEqual as isEqualInterval } from '../interval';
import { Range } from '../range';
const equality: { [index: string]: unknown } = {
    interval: isEqualInterval,
    tsrange: (r1: Range<Date>, r2: number[]) => {
        return (
            r2[0] === (r1.lower ? r1.lower.valueOf() : r1.lower) &&
            r2[1] === (r1.upper ? r1.upper.valueOf() : r1.upper) &&
            r2[2] === r1.mask
        );
    }
};

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
            console.log(name);
            for (const test of tests) {
                const _in = test[0] as string;
                const _out = test[1];
                it(name + '->' + _in, () => {
                    //if (name === 'tsrange') {
                    //    const a = 1;
                    //    console.log(a);
                    //}
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const result = parser(_in);

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const isEqual = equality[name] || isEqualFallback;

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    if (!isEqual(result, _out)) {
                        console.info(`not equal for ${name}, in=${_in} resul=${result}, out=${_out}`);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    expect(isEqual(result, _out)).toBeTruthy();
                });
            }
        });
    }
});
