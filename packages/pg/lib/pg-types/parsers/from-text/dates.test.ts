import parseDate from './dates';

export function ms(str: string): number {
    const base = '2010-01-01 01:01:01';
    const dt: Date = new Date(parseDate(base + str)!);
    return dt.getMilliseconds();
}

function iso(date: string): string {
    return new Date(parseDate(date)!).toISOString();
}

function asNumber(date: string): number {
    return asDate(date).valueOf();
}

function asDate(date: string): Date {
    return new Date(date);
}

describe('pg-dates', function () {
    describe('failure handling and edge cases', function () {
        it('parse random string, non isodate', function () {
            const ans = parseDate('non iso date value');
            expect(ans).toBeNull();
        });
    });
    describe('proper working', function () {
        it('2010-12-11 09:09:04', function () {
            const ans = parseDate('2010-12-11 09:09:04');
            expect(ans).toEqual(asNumber('2010-12-11 09:09:04'));
        });
        it('2011-12-11 09:09:04 BC', function () {
            const ans = parseDate('2011-12-11 09:09:04 BC');
            expect(ans).toEqual(asNumber('-002010-12-11T09:09:04'));
        });
        it('0001-12-11 09:09:04 BC', function () {
            const ans = parseDate('0001-12-11 09:09:04 BC');
            expect(ans).toEqual(asNumber('0000-12-11T09:09:04'));
        });
        it('0001-12-11 09:09:04 BC', function () {
            const ans = parseDate('0001-12-11 09:09:04 BC');
            expect(ans).toEqual(asNumber('0000-12-11T09:09:04'));
        });
        it('0001-12-11 BC', function () {
            const ans = new Date(parseDate('0001-12-11 BC')!);
            expect(ans.getFullYear()).toBe(0);
        });
        it('0013-06-01', function () {
            const ans = new Date(parseDate('0013-06-01')!);
            expect(ans.getFullYear()).toBe(13);
        });
        it('0001-12-11 BC', function () {
            const ans = new Date(parseDate('0001-12-11 BC')!);
            expect(ans.getFullYear()).toBe(0);
        });
        it('0013-06-01', function () {
            const ans = new Date(parseDate('0013-06-01')!);
            expect(ans.getFullYear()).toBe(13);
        });
        it('1800-06-01', function () {
            const ans = new Date(parseDate('1800-06-01')!);
            expect(ans.getFullYear()).toBe(1800);
        });
        it('.1 is 100ms', function () {
            expect(ms('.1')).toBe(100);
        });
        it('.01 is 10ms', function () {
            expect(ms('.01')).toBe(10);
        });
        it('.74 is 740ms', function () {
            expect(ms('.74')).toBe(740);
        });
        it('no timezone for iso("2010-12-11 09:09:04.1")', function () {
            expect(iso('2010-12-11 09:09:04.1')).toBe(new Date('2010-12-11T08:09:04.100Z').toISOString());
        });
        it('huge ms value, iso("2011-01-23 22:15:51.280843-06")', function () {
            expect(iso('2011-01-23 22:15:51.280843-06')).toBe('2011-01-24T04:15:51.280Z');
        });
        it('zulu time offset, iso("2011-01-23 22:15:51Z")', function () {
            expect(iso('2011-01-23 22:15:51Z')).toBe('2011-01-23T22:15:51.000Z');
        });
        it('zulu time offset, iso("2011-01-23 22:15:51Z")', function () {
            expect(iso('2011-01-23 22:15:51Z')).toBe('2011-01-23T22:15:51.000Z');
        });
        it('negative hour offset, iso("2011-01-23 10:15:51-04")', function () {
            expect(iso('2011-01-23 10:15:51-04')).toBe('2011-01-23T14:15:51.000Z');
        });
        it('positive HH:mm offset, iso("2011-01-23 10:15:51+06:10")', function () {
            expect(iso('2011-01-23 10:15:51+06:10')).toBe('2011-01-23T04:05:51.000Z');
        });
        it('negative HH:mm offset, iso("2011-01-23 10:15:51-06:10")', function () {
            expect(iso('2011-01-23 10:15:51-06:10')).toBe('2011-01-23T16:25:51.000Z');
        });
        it('positive HH:mm:ss offset, iso("0005-02-03 10:53:28+01:53:28")', function () {
            expect(iso('0005-02-03 10:53:28+01:53:28')).toBe('0005-02-03T09:00:00.000Z');
        });
        it('negative HH:mm:ss offset, iso("0005-02-03 09:58:45-02:01:15")', function () {
            expect(iso('0005-02-03 09:58:45-02:01:15')).toBe('0005-02-03T12:00:00.000Z');
        });
        it('0 to 99 year boundary, iso("0076-01-01 01:30:15+12")', function () {
            expect(iso('0076-01-01 01:30:15+12')).toBe('0075-12-31T13:30:15.000Z');
        });
        it('Infinity")', function () {
            expect(parseDate('infinity')).toBe(Infinity);
        });
        it('-Infinity")', function () {
            expect(parseDate('-infinity')).toBe(-Infinity);
        });
    });
});
