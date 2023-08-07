import { RANGE_EMPTY, RANGE_LB_INC, RANGE_LB_INF, RANGE_UB_INF, RANGE_UB_INC } from '@constants';
import { utcRangeAsString } from '../../../helpers';

const instrumentation = {
    ['integer/int4']: {
        id: 23, // "int4"
        tests: [['2147483647', 2147483647]]
    },
    ['smallint/int2']: {
        id: 21, // int2
        tests: [['32767', 32767]]
    },
    ['bigint/int8']: {
        id: 20, // int8
        tests: [['9223372036854775807', '9223372036854775807']]
    },
    oid: {
        id: 26, // oid (=int32)
        tests: [['103', 103]]
    },
    ['real/float4']: {
        id: 700, // numeric
        tests: [['123.456', 123.456]]
    },
    'double precision / float 8': {
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
            ['2010-10-31 00:00:00', '2010-10-31T00:00:00.000Z'],
            ['1000-01-01 00:00:00 BC', '-000999-01-01T00:00:00.000Z']
        ]
    },
    numrange: {
        id: 3906, //numrange
        tests: [
            ['empty', [null, null, RANGE_EMPTY]],
            ['(,)', [null, null, RANGE_LB_INF | RANGE_UB_INF]],
            ['(1.5,)', [1.5, null, RANGE_UB_INF]],
            ['(,1.5)', [null, 1.5, RANGE_LB_INF]],
            ['(0,5)', [0, 5, 0]],
            ['(,1.5]', [null, 1.5, RANGE_LB_INF | RANGE_UB_INC]],
            ['[1.5,)', [1.5, null, RANGE_LB_INC | RANGE_UB_INF]],
            ['(0,5)', [0, 5, 0]],
            ['(0,5)', [0, 5, 0]],
            ['[0,0.5)', [0, 0.5, RANGE_LB_INC]],
            ['(0,0.5]', [0, 0.5, RANGE_UB_INC]],
            ['[0,0.5]', [0, 0.5, RANGE_LB_INC | RANGE_UB_INC]]
        ]
    },
    int4range: {
        id: 3904, //int4range
        tests: [
            ['empty', [null, null, RANGE_EMPTY]],
            ['(,)', [null, null, RANGE_LB_INF | RANGE_UB_INF]],
            ['(1,)', [1, null, RANGE_UB_INF]],
            ['(,1)', [null, 1, RANGE_LB_INF]],
            ['(0,5)', [0, 5, 0]],
            ['(,1]', [null, 1, RANGE_LB_INF | RANGE_UB_INC]],
            ['[1,)', [1, null, RANGE_LB_INC | RANGE_UB_INF]],
            ['[0,5)', [0, 5, RANGE_LB_INC]],
            ['(0,5]', [0, 5, RANGE_UB_INC]],
            ['[0,5]', [0, 5, RANGE_LB_INC | RANGE_UB_INC]]
        ]
    },
    int8range: {
        id: 3926, //int8range
        tests: [
            ['empty', [null, null, RANGE_EMPTY]],
            ['(,)', [null, null, RANGE_LB_INF | RANGE_UB_INF]],
            ['(1,)', ['1', null, RANGE_UB_INF]],
            ['(,1)', [null, '1', RANGE_LB_INF]],
            ['(0,5)', ['0', '5', 0]],
            ['(,1]', [null, '1', RANGE_LB_INF | RANGE_UB_INC]],
            ['[1,)', ['1', null, RANGE_LB_INC | RANGE_UB_INF]],
            ['[0,5)', ['0', '5', RANGE_LB_INC]],
            ['(0,5]', ['0', '5', RANGE_UB_INC]],
            ['[0,5]', ['0', '5', RANGE_LB_INC | RANGE_UB_INC]]
        ]
    },
    tstzrange: {
        id: 3910, // tstzrange
        tests: [
            //jsObject.valueOf()
            //  20:24:13.74
            ['(2010-10-31 14:54:13.74-05:30,)', [Date.UTC(2010, 9, 31, 20, 24, 13, 740), null, RANGE_UB_INF]],
            ['(,2010-10-31 14:54:13.74-05:30)', [null, Date.UTC(2010, 9, 31, 20, 24, 13, 740), RANGE_LB_INF]],
            [
                '(2010-10-30 10:54:13.74-05:30,2010-10-31 14:54:13.74-05:30)',
                [Date.UTC(2010, 9, 30, 16, 24, 13, 740), Date.UTC(2010, 9, 31, 20, 24, 13, 740), 0]
            ],
            ['("2010-10-31 14:54:13.74-05:30",)', [Date.UTC(2010, 9, 31, 20, 24, 13, 740), null, RANGE_UB_INF]],
            ['(,"2010-10-31 14:54:13.74-05:30")', [null, Date.UTC(2010, 9, 31, 20, 24, 13, 740), RANGE_LB_INF]],
            [
                '("2010-10-30 10:54:13.74-05:30","2010-10-31 14:54:13.74-05:30")',
                [Date.UTC(2010, 9, 30, 16, 24, 13, 740), Date.UTC(2010, 9, 31, 20, 24, 13, 740), 0]
            ]
        ]
    },
    tsrange: {
        id: 3908,
        tests: [
            ['(2010-10-31 14:54:13.74,)', utcRangeAsString({ lower: [2010, 9, 31, 14, 54, 13, 740] })],
            ['(2010-10-31 14:54:13.74,infinity)', utcRangeAsString({ lower: [2010, 9, 31, 14, 54, 13, 74] })],
            ['(,2010-10-31 14:54:13.74)', utcRangeAsString({ upper: [2010, 9, 31, 14, 54, 13, 74] })],
            ['(-infinity,2010-10-31 14:54:13.74)', utcRangeAsString({ upper: [2010, 9, 31, 14, 54, 13, 74] })],
            [
                '(2010-10-30 10:54:13.74,2010-10-31 14:54:13.74)',
                utcRangeAsString({ lower: [2010, 9, 30, 10, 54, 13, 74], upper: [2010, 9, 31, 14, 54, 13, 74] })
            ],
            ['("2010-10-31 14:54:13.74",)', utcRangeAsString({ lower: [2010, 9, 31, 14, 54, 13, 74] })],
            ['("2010-10-31 14:54:13.74",infinity)', utcRangeAsString({ lower: [2010, 9, 31, 14, 54, 13, 74] })],
            ['(,"2010-10-31 14:54:13.74")', utcRangeAsString({ upper: [2010, 9, 31, 14, 54, 13, 74] })],
            ['(-infinity,"2010-10-31 14:54:13.74")', utcRangeAsString({ upper: [2010, 9, 31, 14, 54, 13, 74] })],
            [
                '("2010-10-30 10:54:13.74","2010-10-31 14:54:13.74")',
                utcRangeAsString({ lower: [2010, 9, 30, 10, 54, 13, 74], upper: [2010, 9, 31, 14, 54, 13, 74] })
            ]
        ]
    },
    daterange: {
        id: 3912,
        tests: [
            ['(2010-10-31,)', ['2010-10-31', null, RANGE_UB_INF]],
            ['(,2010-10-31)', [null, '2010-10-31', RANGE_LB_INF]],
            ['[2010-10-30,2010-10-31]', ['2010-10-30', '2010-10-31', RANGE_LB_INC | RANGE_UB_INC]]
        ]
    },
    interval: {
        id: 1186, //interval
        tests: [
            ['01:02:03', 'toPostgres: 3 seconds 2 minutes 1 hours'],
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
            ['1 year -32 days', 'toPostgres: -32 days 1 years'],
            ['1 day -00:00:03', '-3 seconds 1 days']
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
