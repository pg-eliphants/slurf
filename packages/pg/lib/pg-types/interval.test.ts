import parse from './interval';

describe('interval parser', function () {
    describe('regression', function () {
        it('partial object 552ms', function () {
            expect(parse({ milliseconds: 552 })!.toPostgres()).toBe('0.552 seconds');
        });
        it('interval 01:02:03.456', function () {
            expect(parse('01:02:03.456')).toEqual({
                days: 0,
                hours: 1,
                milliseconds: 456,
                minutes: 2,
                months: 0,
                seconds: 3,
                years: 0
            });
        });
        it('interval -01:02:03.456', function () {
            expect(parse('-01:02:03.456')).toEqual({
                days: 0,
                hours: -1,
                milliseconds: -456,
                minutes: -2,
                months: 0,
                seconds: -3,
                years: 0
            });
        });

        it('varous millisecond tests', function () {
            expect(parse('00:00:00-5')!.milliseconds).toBe(0);
            expect(parse('00:00:00.5')!.milliseconds).toBe(500);
            expect(parse('00:00:00.50')!.milliseconds).toBe(500);
            expect(parse('00:00:00.500')!.milliseconds).toBe(500);
            expect(parse('00:00:00.5000')!.milliseconds).toBe(500);
            expect(parse('00:00:00.100500')!.milliseconds).toBe(100.5);
            expect(parse('00:00:00.1005005')!.milliseconds).toBe(100.5005);
        });
        it('zero', function () {
            expect(parse('00:00:00')).toEqual({
                days: 0,
                hours: 0,
                milliseconds: 0,
                minutes: 0,
                months: 0,
                seconds: 0,
                years: 0
            });
        });
        describe('toPostgres() function', function () {
            it('1 hour 2 minutes 3 seconds', function () {
                expect(parse('01:02:03')!.toPostgres()).toBe('1 hour 2 minutes 3 seconds');
            });
            it('1 year -32 days', function () {
                expect(parse('1 year -32 days')!.toPostgres()).toBe('1 year -32 days');
            });

            it('1 day -00:00:03', function () {
                expect(parse('1 day -00:00:03')!.toPostgres()).toBe('1 day -3 seconds');
            });
            it('00:00:00', function () {
                expect(parse('00:00:00')!.toPostgres()).toBe('0');
            });
            it('00:00:01.100', function () {
                expect(parse('00:00:01.100')!.toPostgres()).toBe('1.1 seconds');
            });
            it('00:00:00.5', function () {
                expect(parse('00:00:00.5')!.toPostgres()).toBe('0.5 seconds');
            });
            it('00:00:00.100500', function () {
                expect(parse('00:00:00.100500')!.toPostgres()).toBe('0.1005 seconds');
            });
            it('00:00:00.100500', function () {
                expect(parse('00:00:00.100500')!.toPostgres()).toBe('0.1005 seconds');
            });
            it('00:00:00.123456', function () {
                expect(parse('00:00:00.123456')!.toPostgres()).toBe('0.123456 seconds');
            });
            it('-00:00:00.123456', function () {
                expect(parse('-00:00:00.123456')!.toPostgres()).toBe('-0.123456 seconds');
            });
            it('-00:00:59.999999', function () {
                expect(parse('-00:00:59.999999')!.toPostgres()).toBe('-59.999999 seconds');
            });
        });
        describe('toISOString() function', function () {
            it('01:02:03', function () {
                expect(parse('01:02:03')!.toISOString()).toBe('P0Y0M0DT1H2M3S');
            });
            it('100:02:03', function () {
                expect(parse('100:02:03')!.toISOString()).toBe('P0Y0M0DT100H2M3S');
            });
            it('1 year -32 days', function () {
                expect(parse('1 year -32 days')!.toISOString()).toBe('P1Y0M-32DT0H0M0S');
            });
            it('1 day -00:00:03', function () {
                expect(parse('1 day -00:00:03')!.toISOString()).toBe('P0Y0M1DT0H0M-3S');
            });
            it('00:00:00', function () {
                expect(parse('00:00:00')!.toISOString()).toBe('P0Y0M0DT0H0M0S');
            });
            it('00:00:00.0', function () {
                expect(parse('00:00:00.0')!.toISOString()).toBe('P0Y0M0DT0H0M0S');
            });
            it('00:00:01.100', function () {
                expect(parse('00:00:01.100')!.toISOString()).toBe('P0Y0M0DT0H0M1.1S');
            });
            it('00:00:00.5', function () {
                expect(parse('00:00:00.5')!.toISOString()).toBe('P0Y0M0DT0H0M0.5S');
            });
            it('00:00:00.100500', function () {
                expect(parse('00:00:00.100500')!.toISOString()).toBe('P0Y0M0DT0H0M0.1005S');
            });
            it('00:00:00.123456', function () {
                expect(parse('00:00:00.123456')!.toISOString()).toBe('P0Y0M0DT0H0M0.123456S');
            });
            it('-00:00:00.123456', function () {
                expect(parse('-00:00:00.123456')!.toISOString()).toBe('P0Y0M0DT0H0M-0.123456S');
            });
            it('-00:00:59.999999', function () {
                expect(parse('-00:00:59.999999')!.toISOString()).toBe('P0Y0M0DT0H0M-59.999999S');
            });
        });
        describe('toISOStringShort() function', function () {
            it('01:02:03', function () {
                expect(parse('01:02:03')!.toISOStringShort()).toBe('PT1H2M3S');
            });
            it('100:02:03', function () {
                expect(parse('100:02:03')!.toISOStringShort()).toBe('PT100H2M3S');
            });
            it('1 year -32 days', function () {
                expect(parse('1 year -32 days')!.toISOStringShort()).toBe('P1Y-32D');
            });
            it('1 day -00:00:03', function () {
                expect(parse('1 day -00:00:03')!.toISOStringShort()).toBe('P1DT-3S');
            });
            it('00:00:00', function () {
                expect(parse('00:00:00')!.toISOStringShort()).toBe('PT0S');
            });
            it('00:00:00.0', function () {
                expect(parse('00:00:00.0')!.toISOStringShort()).toBe('PT0S');
            });
            it('00:00:01.100', function () {
                expect(parse('00:00:01.100')!.toISOStringShort()).toBe('PT1.1S');
            });
            it('00:00:00.5', function () {
                expect(parse('00:00:00.5')!.toISOStringShort()).toBe('PT0.5S');
            });
            it('00:00:00.100500', function () {
                expect(parse('00:00:00.100500')!.toISOStringShort()).toBe('PT0.1005S');
            });
            it('00:00:00.123456', function () {
                expect(parse('00:00:00.123456')!.toISOStringShort()).toBe('PT0.123456S');
            });
            it('-00:00:00.123456', function () {
                expect(parse('-00:00:00.123456')!.toISOStringShort()).toBe('PT-0.123456S');
            });
        });
    });
    describe('error and edge cases', function () {
        it('empty', function () {
            expect(parse('empty')).toEqual({
                days: 0,
                hours: 0,
                milliseconds: 0,
                minutes: 0,
                months: 0,
                seconds: 0,
                years: 0
            });
        });
        it('invalid interval format 00:00:00-5', function () {
            expect(parse('00:00:00-5')).toEqual({
                days: 0,
                hours: 0,
                milliseconds: 0,
                minutes: 0,
                months: 0,
                seconds: 0,
                years: 0
            });
        });
    });
});
