import parseRange, { Range, serialize } from './range';

import { RANGE_EMPTY, RANGE_LB_INC, RANGE_UB_INC, RANGE_LB_INF, RANGE_UB_INF } from '@constants';

describe('range from text', () => {
    describe('errors and edge cases', function () {
        it('empty range', function () {
            const range = new Range(null, null, RANGE_EMPTY);
            expect(range.isEmpty()).toBeTruthy();
            expect(serialize(range)).toBe('empty');
        });
        it('unbounded range (-infinity,infinity)', () => {
            const range = new Range(null, null, RANGE_LB_INF | RANGE_UB_INF);
            expect(range.isBounded()).toBeFalsy();
            expect(range.isLowerBoundClosed()).toBeFalsy();
            expect(range.isEmpty()).toBeFalsy();
            expect(serialize(range)).toBe('(-infinity,infinity)');
        });
        it('unbounded range (0,)', () => {
            const range = new Range('0', null, RANGE_UB_INF);
            // false because only bounded on one side
            expect(range.isBounded()).toBeFalsy();
            // becaus it is open "(" not closed, aka "["
            expect(range.isLowerBoundClosed()).toBeFalsy();
            expect(range.isEmpty()).toBeFalsy();
            expect(serialize(range)).toBe('(0,infinity)');
        });
        it('parse (,"")', () => {
            const range = parseRange('(,"")', String);
            expect(serialize(range)).toBe('(-infinity,"")');
        });
        it('parse ("",)', () => {
            const range = parseRange('("",)', String);
            expect(serialize(range)).toBe('("",infinity)');
        });
    });
    describe('fidelity and regression', () => {
        describe('new Range(..)', () => {
            it('(0,10)', () => {
                const range = new Range('0', '10', 0);
                expect(range.isBounded()).toBeTruthy();
                expect(range.isLowerBoundClosed()).toBeFalsy();
                expect(range.isUpperBoundClosed()).toBeFalsy();
                expect(range.isEmpty()).toBeFalsy();
                expect(serialize(range)).toBe('(0,10)');
            });
            it('(0,1]', () => {
                const range = new Range('0', '1', RANGE_UB_INC);
                expect(range.isBounded()).toBeTruthy();
                expect(range.isLowerBoundClosed()).toBeFalsy();
                expect(range.isUpperBoundClosed()).toBeTruthy();
                expect(range.isEmpty()).toBeFalsy();
                expect(serialize(range)).toBe('(0,1]');
            });
            it('[0,1]', () => {
                const range = new Range('0', '1', RANGE_LB_INC | RANGE_UB_INC);
                expect(range.isBounded()).toBeTruthy();
                expect(range.isLowerBoundClosed()).toBeTruthy();
                expect(range.isUpperBoundClosed()).toBeTruthy();
                expect(range.isEmpty()).toBeFalsy();
                expect(serialize(range)).toBe('[0,1]');
            });
            it('[0,1)', () => {
                const range = new Range('0', '1', RANGE_LB_INC);
                expect(range.isBounded()).toBeTruthy();
                expect(range.isLowerBoundClosed()).toBeTruthy();
                expect(range.isUpperBoundClosed()).toBeFalsy();
                expect(range.isEmpty()).toBeFalsy();
                expect(serialize(range)).toBe('[0,1)');
            });
        });
        describe('parseRange (..)', () => {
            it('[0,1]', () => {
                const range = parseRange('[0,1]', Number);
                expect(serialize(range)).toBe('[0,1]');
                expect(range.isBounded()).toBeTruthy();
                expect(range.isLowerBoundClosed()).toBeTruthy();
                expect(range.isUpperBoundClosed()).toBeTruthy();
                expect(range.isEmpty()).toBeFalsy();
            });
            it('[0,1)', () => {
                const range = parseRange('[0,1)', Number);
                expect(serialize(range)).toBe('[0,1)');
                expect(range.isBounded()).toBeTruthy();
                expect(range.isLowerBoundClosed()).toBeTruthy();
                expect(range.isUpperBoundClosed()).toBeFalsy();
                expect(range.isEmpty()).toBeFalsy();
            });
            it('[0,1)', () => {
                const range = parseRange('(0,1)', Number);
                expect(serialize(range)).toBe('(0,1)');
                expect(range.isBounded()).toBeTruthy();
                expect(range.isLowerBoundClosed()).toBeFalsy();
                expect(range.isUpperBoundClosed()).toBeFalsy();
                expect(range.isEmpty()).toBeFalsy();
            });
            it('(A,Z)', () => {
                const range = parseRange('(A,Z)');
                expect(range.equals(new Range('A', 'Z', 0))).toBeTruthy();
            });
            it('("A","Z")', () => {
                const range = parseRange('("A","Z")');
                expect(range.equals(new Range('A', 'Z', 0))).toBeTruthy();
            });
            it('("""A""","""Z""")', () => {
                const range = parseRange('("""A""","""Z""")');
                expect(range.equals(new Range('"A"', '"Z"', 0))).toBeTruthy();
            });
        });
    });
});
/*

test('parse: strings', function (t) {
    const check = (a, b) => t.deepEqual(parse(a), b, a);

  
    check('("\\"A\\"","\\"Z\\"")', new Range('"A"', '"Z"', 0));
    check('("\\(A\\)","\\(Z\\)")', new Range('(A)', '(Z)', 0));
    check('("\\[A\\]","\\[Z\\]")', new Range('[A]', '[Z]', 0));

    t.end();
});

test('serialize: strings', function (t) {
    const check = (a, b) => t.deepEqual(a, serialize(b), a);

    check('(,"")', new Range(null, '', RANGE_LB_INF));
    check('("",)', new Range('', null, RANGE_UB_INF));
    check('("""A""","""Z""")', new Range('"A"', '"Z"', 0));
    check('("\\\\A\\\\","\\\\Z\\\\")', new Range('\\A\\', '\\Z\\', 0));
    check('("(A)","(Z)")', new Range('(A)', '(Z)', 0));
    check('("[A]","[Z]")', new Range('[A]', '[Z]', 0));

    t.end();
});

test('serialize: numbers', function (t) {
    const check = (a, b) => t.deepEqual(a, serialize(b), a);

    check('(,0)', new Range(null, 0, RANGE_LB_INF));
    check('(0,)', new Range(0, null, RANGE_UB_INF));
    check('(1.1,9.9)', new Range(1.1, 9.9, 0));

    t.end();
});

test('roundtrip', function (t) {
    const trip = (raw) => t.is(serialize(parse(raw)), raw, raw);

    trip('empty');
    trip('(0,)');
    trip('(0,10)');
    trip('(,10)');
    trip('(0,1]');
    trip('[0,1]');
    trip('[0,1)');

    t.end();
});

test('Range', function (t) {
    t.ok(parse('[1, 10)', (x) => parseInt(x)).containsPoint(5), '[1, 10).containsPoint(5) is true');
    t.notOk(parse('[1, 10)', (x) => parseInt(x)).containsPoint(-5), '[1, 10).containsPoint(-5) is false');
    t.ok(
        parse('[1, 10)', (x) => parseInt(x)).containsRange(parse('[1, 3]', (x) => parseInt(x))),
        "[1, 10).containsRange('[1, 3]') is true"
    );
    t.notOk(
        parse('[1, 10)', (x) => parseInt(x)).containsRange(parse('[-1, 3]', (x) => parseInt(x))),
        "[1, 10).containsRange('[-1, 3]') is false"
    );

    t.end();
});
*/
