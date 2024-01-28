import { expect, it, describe } from 'vitest';
import Jitter from '../Jitter';

describe('Jitter', () => {
    describe('fidelity', () => {
        it('random random between -2 and 3', () => {
            const jitter = new Jitter(Math.random, -2, 3);
            const data = Array.from({ length: 1000 }).map(() => jitter.getRandom());
            const min = Math.min(...data);
            const max = Math.max(...data);
            expect(min).toBeLessThanOrEqual(-1.9);
            expect(max).toBeGreaterThanOrEqual(2.9);
        });
    });
});
