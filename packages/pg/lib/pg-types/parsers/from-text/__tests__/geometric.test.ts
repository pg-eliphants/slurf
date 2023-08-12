import fixture from './fixtures/geometry';
import textMap from '../index';
import type { Circle, Point } from '@pg-types/types';

const equality = {
    point: (p1: Point, p2: { x: number; y: number }): boolean => {
        return p1.x === p2.x && p1.y === p2.y;
    },
    circle: (c1: Circle, c2: { x: number; y: number; r: number }) => {
        return c1.x === c2.x && c1.y === c2.y && c1.r === c2.r;
    }
};

type KeyMap = keyof typeof equality;

describe('geometry type parsing, text -> js', () => {
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
