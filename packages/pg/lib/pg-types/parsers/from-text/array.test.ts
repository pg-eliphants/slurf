import parse from './array';

describe('array types handling', () => {
    describe('errors and edge cases', function () {
        it('empty', function () {
            expect(parse('{}')).toEqual([]);
        });
        it('empty string', function () {
            expect(parse('{""}')).toEqual(['']);
        });
        it('escaped', function () {
            expect(parse('{"\\"\\"\\"","\\\\\\\\\\\\"}')).toEqual(['"""', '\\\\\\']);
        });
    });
    describe('regression', function () {
        it('numerics', function () {
            expect(parse('{1,2,3}')).toEqual(['1', '2', '3']);
        });
        it('strings', function () {
            expect(parse('{a,b,c}')).toEqual(['a', 'b', 'c']);
        });
        it('null', function () {
            expect(parse('{NULL,NULL}')).toEqual([null, null]);
        });
        it('with transform 1, string -> number', function () {
            expect(parse('{1,2,3}', (value) => parseInt(value, 10))).toEqual([1, 2, 3]);
        });
        it('with transform 2, string -> number', function () {
            expect(parse('[0:2]={1,2,3}', (value) => parseInt(value, 10))).toEqual([1, 2, 3]);
        });
    });
});
