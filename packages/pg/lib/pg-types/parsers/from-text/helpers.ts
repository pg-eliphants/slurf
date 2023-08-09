export type UTCParams = {
    year: number;
    monthIndex?: number;
    date?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    ms?: number;
};

export type UTCArgs = Parameters<typeof Date.UTC>;

export function utcStringFromDate(utc: UTCArgs): string {
    /**
     * Returns the number of milliseconds between midnight, January 1, 1970 Universal Coordinated Time (UTC) (or GMT) and the specified date.
     * @param year The full year designation is required for cross-century date accuracy. If year is between 0 and 99 is used, then year is assumed to be 1900 + year.
     * @param monthIndex The month as a number between 0 and 11 (January to December).
     * @param date The date as a number between 1 and 31.
     * @param hours Must be supplied if minutes is supplied. A number from 0 to 23 (midnight to 11pm) that specifies the hour.
     * @param minutes Must be supplied if seconds is supplied. A number from 0 to 59 that specifies the minutes.
     * @param seconds Must be supplied if milliseconds is supplied. A number from 0 to 59 that specifies the seconds.
     * @param ms A number from 0 to 999 that specifies the milliseconds.
     */
    return new Date(Date.UTC(...utc)).toUTCString();
}
export function utcRangeAsString({ lower, upper }: { lower?: UTCArgs; upper?: UTCArgs }): {
    upper?: string;
    lower?: string;
} {
    const rc: { upper?: string; lower?: string } = {};
    if (lower !== null && lower !== undefined) {
        rc.lower = utcStringFromDate(lower);
    }
    if (upper !== null && upper !== undefined) {
        rc.upper = utcStringFromDate(upper);
    }
    return rc;
}

export function dateEquals(time1: UTCParams, time2: UTCParams): boolean {
    let ts1 = 0,
        ts2 = 0;
    {
        const { year, monthIndex, date, hours, minutes, seconds, ms } = time1;
        ts1 = Date.UTC(year, monthIndex, date, hours, minutes, seconds, ms);
    }
    {
        const { year, monthIndex, date, hours, minutes, seconds, ms } = time2;
        ts2 = Date.UTC(year, monthIndex, date, hours, minutes, seconds, ms);
    }
    return ts1 === ts2;
}

export function absorbTill(v: string, pos: number, token: string): string {
    let i = pos;
    const len = v.length;
    for (; i < len && v[i] !== token; i++);
    if (i === pos) {
        return '';
    }
    return v.slice(pos, i);
}
