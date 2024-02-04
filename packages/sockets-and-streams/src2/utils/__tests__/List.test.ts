import { expect, it, describe } from 'vitest';
import type { List } from '../list';
import { first, last , insertBefore, insertAfter, removeSelf, count } from '../list';

type Opaque = {
    id: string;
}

describe('List', () => {
    describe('fidelity', () => {
        it.concurrent('create list and add items', () => {
            let start: List<Opaque> = null; // empty list
            let end: List<Opaque> = insertAfter(start, { value: { id: 'R' }});
            if (start === null) {
                start = end;
            }
            end = insertAfter(end, { value: { id: 'X' }});

            const fixture: List<Opaque> = {
                prev: null,
                value: { id: 'R'},
                next: {
                    value: { id: 'X' },
                    next: null,
                }
            };
            fixture.next!.prev = fixture;

            expect(start).toEqual(fixture);
        });
        it.concurrent('create list add 3 items, delete middle one', () => {
            let start: List<Opaque> = null; // empty list
            let end: List<Opaque> = insertAfter(start, { value: { id: 'R' }});
            if (start === null) {
                start = end;
            }
            const second = end = insertAfter(end, { value: { id: 'X' }});
            end = insertAfter(end, { value: { id: 'Y' }});
            let cursor = start;
            while (cursor){
                console.log(cursor?.value, cursor.prev, cursor.next);
                cursor = cursor?.next!;
            }
            removeSelf(second);
            cursor = start;
            while (cursor){
                console.log(cursor?.value, cursor.prev, cursor.next);
                cursor = cursor?.next!;
            }
            console.log(second);
            // insert second back agan after first
            insertAfter(start, second);
            cursor = start;
            console.log('3.')
            while (cursor){
                console.log(cursor?.value, cursor.prev, cursor.next);
                cursor = cursor?.next!;
            }
            console.log('4.')
        });
    });
});
