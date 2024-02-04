import { expect, it, describe } from 'vitest';
import Pipe from '../Pipe';
import { PromiseExtended } from '../../../src/io/helpers';

describe('Pipe', () => {
    describe('enqueue & dequeue', () => {
        it.concurrent('enqueue with unresolved internal', async () => {
            const pipe = new Pipe<string>();
            pipe.enqueue('hello');
            pipe.enqueue('world');
            const data = await pipe.dequeue();
            expect(data).toEqual(['hello', 'world']);
            pipe.enqueue('the');
            pipe.enqueue('quick');
            pipe.enqueue('brown');
            // next macro-task!
            setTimeout(() => pipe.enqueue('fox'), 0);

            // still in this micro-task
            const data2 = await pipe.dequeue();
            expect(data2).toEqual(['the', 'quick', 'brown']);
            const data3 = await pipe.dequeue();
            expect(data3).toEqual(['fox']);
        });
    });
});
