type IntervalContext = {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
};

const propertiesISOEquivalent = {
    years: 'Y',
    months: 'M',
    days: 'D',
    hours: 'H',
    minutes: 'M',
    seconds: 'S'
};

type StrRet = () => string;

type ReturnType =
    | (IntervalContext & {
          toPostgres: StrRet;
          toISOString: StrRet;
          toISOStringShort: StrRet;
          toISO: StrRet;
      })
    | undefined;

export default function parse(interval: string | Partial<IntervalContext>): ReturnType {
    const position = {
        value: 0
    };

    const ctx: IntervalContext = {
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0
    };

    function toISOString({ short }: { short: boolean }) {
        let datePart = '';

        if (!short || ctx.years) {
            datePart += ctx.years + propertiesISOEquivalent.years;
        }

        if (!short || ctx.months) {
            datePart += ctx.months + propertiesISOEquivalent.months;
        }

        if (!short || ctx.days) {
            datePart += ctx.days + propertiesISOEquivalent.days;
        }

        let timePart = '';

        if (!short || ctx.hours) {
            timePart += ctx.hours + propertiesISOEquivalent.hours;
        }

        if (!short || ctx.minutes) {
            timePart += ctx.minutes + propertiesISOEquivalent.minutes;
        }

        if (!short || ctx.seconds || ctx.milliseconds) {
            if (ctx.milliseconds) {
                timePart +=
                    Math.trunc((ctx.seconds + ctx.milliseconds / 1000) * 1000000) / 1000000 +
                    propertiesISOEquivalent.seconds;
            } else {
                timePart += ctx.seconds + propertiesISOEquivalent.seconds;
            }
        }

        if (!timePart && !datePart) {
            return 'PT0S';
        }

        if (!timePart) {
            return `P${datePart}`;
        }

        return `P${datePart}T${timePart}`;
    }

    function toISO() {
        return toISOString({ short: false });
    }

    function toISOStringShort() {
        return toISOString({ short: true });
    }

    function parseMillisecond(interval: string) {
        const currentValue = readNextNum(interval);

        if (currentValue < 10) {
            return currentValue * 100;
        }

        if (currentValue < 100) {
            return currentValue * 10;
        }

        if (currentValue < 1000) {
            return currentValue;
        }

        if (currentValue < 10000) {
            return currentValue / 10;
        }

        if (currentValue < 100000) {
            return currentValue / 100;
        }

        if (currentValue < 1000000) {
            return currentValue / 1000;
        }

        // slow path
        const remainder = currentValue.toString().length - 3;
        return currentValue / Math.pow(10, remainder);
    }

    function readNextNum(interval: string) {
        let val = 0;

        while (position.value < interval.length) {
            const char = interval[position.value];

            if (char >= '0' && char <= '9') {
                val = val * 10 + +char;
                position.value++;
            } else {
                break;
            }
        }
        return val;
    }

    function toPostgres() {
        let postgresString = '';

        if (ctx.years) {
            postgresString += ctx.years === 1 ? ctx.years + ' year' : ctx.years + ' years';
        }

        if (ctx.months) {
            if (postgresString.length) {
                postgresString += ' ';
            }

            postgresString += ctx.months === 1 ? ctx.months + ' month' : ctx.months + ' months';
        }

        if (ctx.days) {
            if (postgresString.length) {
                postgresString += ' ';
            }

            postgresString += ctx.days === 1 ? ctx.days + ' day' : ctx.days + ' days';
        }

        if (ctx.hours) {
            if (postgresString.length) {
                postgresString += ' ';
            }

            postgresString += ctx.hours === 1 ? ctx.hours + ' hour' : ctx.hours + ' hours';
        }

        if (ctx.minutes) {
            if (postgresString.length) {
                postgresString += ' ';
            }

            postgresString += ctx.minutes === 1 ? ctx.minutes + ' minute' : ctx.minutes + ' minutes';
        }

        if (ctx.seconds || ctx.milliseconds) {
            if (postgresString.length) {
                postgresString += ' ';
            }

            if (ctx.milliseconds) {
                const value = Math.trunc((ctx.seconds + ctx.milliseconds / 1000) * 1000000) / 1000000;

                postgresString += value === 1 ? value + ' second' : value + ' seconds';
            } else {
                postgresString += ctx.seconds === 1 ? ctx.seconds + ' second' : ctx.seconds + ' seconds';
            }
        }
        return postgresString === '' ? '0' : postgresString;
    }

    function parse(interval: string): void {
        if (!interval) {
            return;
        }

        position.value = 0;

        let currentValue;
        let nextNegative = 1;

        while (position.value < interval.length) {
            const char = interval[position.value];

            if (char === '-') {
                nextNegative = -1;
                position.value++;
                continue;
            } else if (char === '+') {
                position.value++;
                continue;
            } else if (char === ' ') {
                position.value++;
                continue;
            } else if (char < '0' || char > '9') {
                position.value++;
                continue;
            } else {
                currentValue = readNextNum(interval);

                if (interval[position.value] === ':') {
                    ctx.hours = currentValue ? nextNegative * currentValue : 0;

                    position.value++;
                    currentValue = readNextNum(interval);
                    ctx.minutes = currentValue ? nextNegative * currentValue : 0;

                    position.value++;
                    currentValue = readNextNum(interval);
                    ctx.seconds = currentValue ? nextNegative * currentValue : 0;

                    if (interval[position.value] === '.') {
                        position.value++;

                        currentValue = parseMillisecond(interval);
                        ctx.milliseconds = currentValue ? nextNegative * currentValue : 0;
                    }

                    return;
                }

                // skip space
                position.value++;

                const unit = interval[position.value];

                if (unit === 'y') {
                    ctx.years = currentValue ? nextNegative * currentValue : 0;
                } else if (unit === 'm') {
                    ctx.months = currentValue ? nextNegative * currentValue : 0;
                } else if (unit === 'd') {
                    ctx.days = currentValue ? nextNegative * currentValue : 0;
                }

                nextNegative = 1;
            }
        }
    }
    const type = typeof interval;
    if (type === 'string') {
        parse(interval as string);
    } else if (!interval) {
        return;
    } else if (type === 'object') {
        Object.assign(ctx, { ...(interval as IntervalContext) });
    }

    Object.defineProperties(ctx, {
        toPostgres: {
            enumerable: false,
            writable: false,
            value: toPostgres
        },
        toISOString: {
            enumerable: false,
            writable: false,
            value: toISO
        },
        toISO: {
            enumerable: false,
            writable: false,
            value: toISOString
        },
        toISOStringShort: {
            enumerable: false,
            writable: false,
            value: toISOStringShort
        }
    });
    return ctx as ReturnType;
}
