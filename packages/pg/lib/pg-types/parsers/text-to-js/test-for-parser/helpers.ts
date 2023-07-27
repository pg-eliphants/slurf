export type UTCArgs = Parameters<typeof Date.UTC>;

export function utcStringFromDate(utc: UTCArgs) {
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
