import { RANGE_EMPTY, RANGE_LB_INC, RANGE_LB_INF, RANGE_UB_INF, RANGE_UB_INC } from '@constants';
import type { FixtureEntry } from '@pg-types/parsers/test-helper';
import type { Interval, Range } from '@pg-types/types';
const instrumentation: Record<
    string,
    | FixtureEntry<string, number>
    | FixtureEntry<string, bigint>
    | FixtureEntry<string, boolean>
    | FixtureEntry<string, string>
    | FixtureEntry<string, Range<number>>
    | FixtureEntry<string, Range<bigint>>
    | FixtureEntry<string, Range<string>>
    | FixtureEntry<string, Interval>
    | FixtureEntry<string, Uint8Array>
> = {
    int4: {
        id: 23, // "int4"
        tests: [['2147483647', 2147483647]]
    },
    int2: {
        id: 21, // int2
        tests: [['32767', 32767]]
    },
    int8: {
        id: 20, // int8
        tests: [['9223372036854775807', 9223372036854775807n]]
    },
    oid: {
        id: 26, // oid (=int32)
        tests: [['103', 103]]
    },
    float4: {
        id: 700, // numeric
        tests: [['123.456', 123.456]]
    },
    float8: {
        id: 701, // float8
        tests: [['12345678.12345678', 12345678.12345678]]
    },
    boolean: {
        id: 16, // bool
        tests: [
            ['TRUE', true],
            ['t', true],
            ['true', true],
            ['y', true],
            ['yes', true],
            ['on', true],
            ['1', true],
            ['f', false]
        ]
    },
    timestamptz: {
        id: 1184, // timestamptz
        tests: [
            ['2010-10-31 14:54:13.74-05:30', Date.UTC(2010, 9, 31, 20, 24, 13, 740)],
            ['2011-01-23 22:05:00.68-06', Date.UTC(2011, 0, 24, 4, 5, 0, 680)],
            ['2010-10-30 14:11:12.730838Z', Date.UTC(2010, 9, 30, 14, 11, 12, 730)],
            ['2010-10-30 13:10:01+05', Date.UTC(2010, 9, 30, 8, 10, 1, 0)],
            ['1000-01-01 00:00:00+00 BC', Date.UTC(-999, 0, 1, 0, 0, 0, 0)]
        ]
    },
    timestamp: {
        id: 1114, // timestamp
        // use toISOString() in the parsed date
        tests: [
            ['2010-10-31 00:00:00', 1288483200000 /*'2010-10-31T00:00:00.000Z'*/],
            ['1000-01-01 00:00:00 BC', -93692592000000 /*'-000999-01-01T00:00:00.000Z'*/]
        ]
    },
    numrange: {
        id: 3906, //numrange
        tests: [
            ['empty', { lower: null, upper: null, mask: RANGE_EMPTY }],
            ['(,)', { lower: null, upper: null, mask: RANGE_LB_INF | RANGE_UB_INF }],
            ['(1.5,)', { lower: 1.5, upper: null, mask: RANGE_UB_INF }],
            ['(,1.5)', { lower: null, upper: 1.5, mask: RANGE_LB_INF }],
            ['(,1.5]', { lower: null, upper: 1.5, mask: RANGE_LB_INF | RANGE_UB_INC }],
            ['(0,5)', { lower: 0, upper: 5, mask: 0 }],
            ['[1.5,)', { lower: 1.5, upper: null, mask: RANGE_LB_INC | RANGE_UB_INF }],
            ['[0,0.5)', { lower: 0, upper: 0.5, mask: RANGE_LB_INC }],
            ['(0,0.5]', { lower: 0, upper: 0.5, mask: RANGE_UB_INC }],
            ['[0,0.5]', { lower: 0, upper: 0.5, mask: RANGE_LB_INC | RANGE_UB_INC }]
        ] as [string, Range<number>][]
    },
    int4range: {
        id: 3904, //int4range
        tests: [
            ['empty', { lower: null, upper: null, mask: RANGE_EMPTY }],
            ['(,)', { lower: null, upper: null, mask: RANGE_LB_INF | RANGE_UB_INF }],
            ['(1,)', { lower: 1, upper: null, mask: RANGE_UB_INF }],
            ['(,1)', { lower: null, upper: 1, mask: RANGE_LB_INF }],
            ['(0,5)', { lower: 0, upper: 5, mask: 0 }],
            ['(,1]', { lower: null, upper: 1, mask: RANGE_LB_INF | RANGE_UB_INC }],
            ['[1,)', { lower: 1, upper: null, mask: RANGE_LB_INC | RANGE_UB_INF }],
            ['[0,5)', { lower: 0, upper: 5, mask: RANGE_LB_INC }],
            ['(0,5]', { lower: 0, upper: 5, mask: RANGE_UB_INC }],
            ['[0,5]', { lower: 0, upper: 5, mask: RANGE_LB_INC | RANGE_UB_INC }]
        ] as [string, Range<number>][]
    },
    int8range: {
        id: 3926, //int8range
        tests: [
            ['empty', { lower: null, upper: null, mask: RANGE_EMPTY }],
            ['(,)', { lower: null, upper: null, mask: RANGE_LB_INF | RANGE_UB_INF }],
            ['(1,)', { lower: 1n, upper: null, mask: RANGE_UB_INF }],
            ['(,1)', { lower: null, upper: 1n, mask: RANGE_LB_INF }],
            ['(0,5)', { lower: 0n, upper: 5n, mask: 0 }],
            ['(,1]', { lower: null, upper: 1n, mask: RANGE_LB_INF | RANGE_UB_INC }],
            ['[1,)', { lower: 1n, upper: null, mask: RANGE_LB_INC | RANGE_UB_INF }],
            ['[0,5)', { lower: 0n, upper: 5n, mask: RANGE_LB_INC }],
            ['(0,5]', { lower: 0n, upper: 5n, mask: RANGE_UB_INC }],
            ['[0,5]', { lower: 0n, upper: 5n, mask: RANGE_LB_INC | RANGE_UB_INC }]
        ] as [string, Range<bigint>][]
    },
    tstzrange: {
        id: 3910, // tstzrange
        tests: [
            [
                '(2010-10-31 14:54:13.74-05:30,)',
                { lower: Date.UTC(2010, 9, 31, 20, 24, 13, 740), upper: null, mask: RANGE_UB_INF }
            ],
            [
                '(,2010-10-31 14:54:13.74-05:30)',
                { lower: null, upper: Date.UTC(2010, 9, 31, 20, 24, 13, 740), mask: RANGE_LB_INF }
            ],
            [
                '(2010-10-30 10:54:13.74-05:30,2010-10-31 14:54:13.74-05:30)',
                {
                    lower: Date.UTC(2010, 9, 30, 16, 24, 13, 740),
                    upper: Date.UTC(2010, 9, 31, 20, 24, 13, 740),
                    mask: 0
                }
            ],
            [
                '("2010-10-31 14:54:13.74-05:30",)',
                { lower: Date.UTC(2010, 9, 31, 20, 24, 13, 740), upper: null, mask: RANGE_UB_INF }
            ],
            [
                '(,"2010-10-31 14:54:13.74-05:30")',
                { lower: null, upper: Date.UTC(2010, 9, 31, 20, 24, 13, 740), mask: RANGE_LB_INF }
            ],
            [
                '("2010-10-30 10:54:13.74-05:30","2010-10-31 14:54:13.74-05:30")',
                {
                    lower: Date.UTC(2010, 9, 30, 16, 24, 13, 740),
                    upper: Date.UTC(2010, 9, 31, 20, 24, 13, 740),
                    mask: 0
                }
            ]
        ] as [string, Range<number>][]
    },
    tsrange: {
        id: 3908,
        tests: [
            [
                '(2010-10-31 14:54:13.74,)',
                { lower: Date.UTC(2010, 9, 31, 14, 54, 13, 740), upper: null, mask: RANGE_UB_INF }
            ],
            [
                '(2010-10-31 14:54:13.74,infinity)',
                { lower: Date.UTC(2010, 9, 31, 14, 54, 13, 740), upper: null, mask: RANGE_UB_INF }
            ],
            [
                '(,2010-10-31 14:54:13.74)',
                { lower: null, upper: Date.UTC(2010, 9, 31, 14, 54, 13, 740), mask: RANGE_LB_INF }
            ],
            [
                '(-infinity,2010-10-31 14:54:13.74)',
                { lower: null, upper: Date.UTC(2010, 9, 31, 14, 54, 13, 740), mask: RANGE_LB_INF }
            ]
            /*[
                '(2010-10-30 10:54:13.74,2010-10-31 14:54:13.74)',
                { lower:Date.UTC(2010, 9, 30, 10, 54, 13, 740), Date.UTC(2010, 9, 31, 14, 54, 13, 740), 0]
            ],
            ['("2010-10-31 14:54:13.74",)', { lower:Date.UTC(2010, 9, 31, 14, 54, 13, 740), null, RANGE_UB_INF]],
            ['("2010-10-31 14:54:13.74",infinity)',{ lower:Date.UTC(2010, 9, 31, 14, 54, 13, 740), null, RANGE_UB_INF]],
            ['(,"2010-10-31 14:54:13.74")', { lower:null, Date.UTC(2010, 9, 31, 14, 54, 13, 740), RANGE_LB_INF]],
            ['(-infinity,"2010-10-31 14:54:13.74")', { lower:null, Date.UTC(2010, 9, 31, 14, 54, 13, 740), RANGE_LB_INF]],
            [
                '("2010-10-30 10:54:13.74","2010-10-31 14:54:13.74")',
                { lower:Date.UTC(2010, 9, 30, 10, 54, 13, 740), Date.UTC(2010, 9, 31, 14, 54, 13, 740), 0]
            ]*/
        ] as [string, Range<number>][]
    },
    daterange: {
        id: 3912,
        tests: [
            ['(2010-10-31,)', { lower: '2010-10-31', upper: null, mask: RANGE_UB_INF }],
            ['(,2010-10-31)', { lower: null, upper: '2010-10-31', mask: RANGE_LB_INF }],
            ['[2010-10-30,2010-10-31]', { lower: '2010-10-30', upper: '2010-10-31', mask: RANGE_LB_INC | RANGE_UB_INC }]
        ] as [string, Range<string>][]
    },
    interval: {
        id: 1186, //interval
        tests: [
            [
                '01:02:03',
                {
                    years: 0,
                    months: 0,
                    days: 0,
                    hours: 1,
                    minutes: 2,
                    seconds: 3,
                    milliseconds: 0
                }
            ],
            [
                '01:02:03.456',
                {
                    years: 0,
                    months: 0,
                    days: 0,
                    hours: 1,
                    minutes: 2,
                    seconds: 3,
                    milliseconds: 456
                }
            ],
            ['1 year -32 days', { years: 1, months: 0, days: -32, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }],
            ['1 day -00:00:03', { years: 0, months: 0, days: 1, hours: 0, minutes: 0, seconds: -3, milliseconds: 0 }]
        ]
    },
    bytea: {
        id: 17, //bytea (blob datatype)
        tests: [
            ['foo\\000\\200\\\\\\377', Uint8Array.from([102, 111, 111, 0, 128, 92, 255])],
            ['', Uint8Array.from([])]
        ]
    }
};

export default instrumentation;
