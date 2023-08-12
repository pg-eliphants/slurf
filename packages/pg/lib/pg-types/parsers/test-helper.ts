export { describe, beforeEach, afterEach, it, expect } from 'vitest';
import type { TextMap } from '@pg-types/types';

export type FixtureEntry<T extends string | Uint8Array, S> = {
    id: number;
    tests: [T, S][];
};

export default function testFromFixtures<T extends string | Uint8Array, S>(
    topic: string,
    textMap: TextMap<T>,
    fixture: Record<string, FixtureEntry<T, S>>,
    equality: Record<string, (a: unknown, b: S) => boolean>
): void {
    describe(topic, () => {
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
            const name = entries[0];
            const { id, tests } = entries[1];
            if (!textMap[id]) {
                continue;
            }
            const parser = textMap[id];
            describe(`[${id}]: ${name}`, () => {
                for (const test of tests) {
                    const _in = test[0]; // as string;
                    const _out = test[1] as never;
                    it(name + '->' + String(_in), () => {
                        const result = parser(_in as never) as never;
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
}
