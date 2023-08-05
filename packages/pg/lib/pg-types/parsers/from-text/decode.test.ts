import decode from './decode';

describe('decode', function () {
    describe('fidelity and regression', function () {
        it('pg version < 9 escape format', function () {
            const bytes = Uint8Array.from([102, 111, 111, 0, 128, 92, 255]);
            expect(decode('foo\\000\\200\\\\\\377')).toEqual(bytes);
        });
        it('pg version >= 9 hex format', function () {
            const bytes = Uint8Array.from([0x12, 0x34]);
            expect(decode('\\x1234')).toEqual(bytes);
        });
    });
});
