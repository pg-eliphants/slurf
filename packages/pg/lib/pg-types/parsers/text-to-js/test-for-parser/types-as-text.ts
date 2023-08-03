import { Range, RANGE_EMPTY, RANGE_LB_INC, RANGE_LB_INF, RANGE_UB_INF, RANGE_UB_INC } from '../range';
import { utcRangeAsString } from './helpers';

const BIGNUM =
    '31415926535897932384626433832795028841971693993751058.16180339887498948482045868343656381177203091798057628';

const instrumentation = {
    ['string/varchar']: {
        id: 1043, // "varchar"
        tests: [['bang', 'bang']]
    },
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
    numeric: {
        id: 1700,
        tests: [[BIGNUM, BIGNUM]]
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
        id: 16, //bool
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
        id: 1184, //timestamptz
        tests: [
            ['2010-10-31 14:54:13.74-05:30', Date.UTC(2010, 9, 31, 20, 24, 13, 740)],
            ['2011-01-23 22:05:00.68-06', Date.UTC(2011, 0, 24, 4, 5, 0, 680)],
            ['2010-10-30 14:11:12.730838Z', Date.UTC(2010, 9, 30, 14, 11, 12, 730)],
            ['2010-10-30 13:10:01+05', Date.UTC(2010, 9, 30, 8, 10, 1, 0)],
            ['1000-01-01 00:00:00+00 BC', Date.UTC(-999, 0, 1, 0, 0, 0, 0)]
        ]
    },
    timestamp: {
        id: 1114, //timestamp
        // use toISOString() in the parsed date
        tests: [
            ['2010-10-31 00:00:00', '2010-10-31T00:00:00.000Z'],
            ['1000-01-01 00:00:00 BC', '-000999-01-01T00:00:00.000Z']
        ]
    },
    date: {
        id: 1082, // date
        tests: [
            ['2010-10-31', '2010-10-31'],
            ['2010-10-31 BC', '2010-10-31 BC']
        ]
    },
    inet: {
        id: 869, // inet
        tests: [
            ['8.8.8.8', '8.8.8.8'],
            ['2001:4860:4860::8888', '2001:4860:4860::8888'],
            ['127.0.0.1', '127.0.0.1'],
            ['fd00:1::40e', 'fd00:1::40e'],
            ['1.2.3.4', '1.2.3.4']
        ]
    },
    cidr: {
        id: 650, //cidr
        tests: [
            ['172.16.0.0/12', '172.16.0.0/12'],
            ['fe80::/10', 'fe80::/10'],
            ['fc00::/7', 'fc00::/7'],
            ['192.168.0.0/24', '192.168.0.0/24'],
            ['10.0.0.0/8', '10.0.0.0/8']
        ]
    },
    macaddr: {
        id: 829, //macaddr
        tests: [
            ['08:00:2b:01:02:03', '08:00:2b:01:02:03'],
            ['16:10:9f:0d:66:00', '16:10:9f:0d:66:00']
        ]
    },
    numrange: {
        id: 3906, //numrange
        tests: [
            ['empty', new Range(null, null, RANGE_EMPTY)],
            ['(,)', new Range(null, null, RANGE_LB_INF | RANGE_UB_INF)],
            ['(1.5,)', new Range(1.5, null, RANGE_UB_INF)],
            ['(,1.5)', new Range(null, 1.5, RANGE_LB_INF)],
            ['(0,5)', new Range(0, 5, 0)],
            ['(,1.5]', new Range(null, 1.5, RANGE_LB_INF | RANGE_UB_INC)],
            ['[1.5,)', new Range(1.5, null, RANGE_LB_INC | RANGE_UB_INF)],
            ['(0,5)', new Range(0, 5, 0)],
            ['(0,5)', new Range(0, 5, 0)],
            ['[0,0.5)', new Range(0, 0.5, RANGE_LB_INC)],
            ['(0,0.5]', new Range(0, 0.5, RANGE_UB_INC)],
            ['[0,0.5]', new Range(0, 0.5, RANGE_LB_INC | RANGE_UB_INC)]
        ]
    },
    int4range: {
        id: 3904, //int4range
        tests: [
            ['empty', new Range(null, null, RANGE_EMPTY)],
            ['(,)', new Range(null, null, RANGE_LB_INF | RANGE_UB_INF)],
            ['(1,)', new Range(1, null, RANGE_UB_INF)],
            ['(,1)', new Range(null, 1, RANGE_LB_INF)],
            ['(0,5)', new Range(0, 5, 0)],
            ['(,1]', new Range(null, 1, RANGE_LB_INF | RANGE_UB_INC)],
            ['[1,)', new Range(1, null, RANGE_LB_INC | RANGE_UB_INF)],
            ['[0,5)', new Range(0, 5, RANGE_LB_INC)],
            ['(0,5]', new Range(0, 5, RANGE_UB_INC)],
            ['[0,5]', new Range(0, 5, RANGE_LB_INC | RANGE_UB_INC)]
        ]
    },
    int8range: {
        id: 3926, //int8range
        tests: [
            ['empty', new Range(null, null, RANGE_EMPTY)],
            ['(,)', new Range(null, null, RANGE_LB_INF | RANGE_UB_INF)],
            ['(1,)', new Range('1', null, RANGE_UB_INF)],
            ['(,1)', new Range(null, '1', RANGE_LB_INF)],
            ['(0,5)', new Range('0', '5', 0)],
            ['(,1]', new Range(null, '1', RANGE_LB_INF | RANGE_UB_INC)],
            ['[1,)', new Range('1', null, RANGE_LB_INC | RANGE_UB_INF)],
            ['[0,5)', new Range('0', '5', RANGE_LB_INC)],
            ['(0,5]', new Range('0', '5', RANGE_UB_INC)],
            ['[0,5]', new Range('0', '5', RANGE_LB_INC | RANGE_UB_INC)]
        ]
    },
    tstzrange: {
        id: 3910, // tstzrange
        tests: [
            ['(2010-10-31 14:54:13.74-05:30,)', utcRangeAsString({ lower: [2010, 9, 31, 20, 24, 13, 74] })],
            ['(,2010-10-31 14:54:13.74-05:30)', utcRangeAsString({ upper: [2010, 9, 31, 20, 24, 13, 74] })],
            [
                '(2010-10-30 10:54:13.74-05:30,2010-10-31 14:54:13.74-05:30)',
                utcRangeAsString({
                    lower: [2010, 9, 30, 16, 24, 13, 74],
                    upper: [2010, 9, 31, 20, 24, 13, 74]
                })
            ],
            ['("2010-10-31 14:54:13.74-05:30",)', utcRangeAsString({ lower: [2010, 9, 31, 20, 24, 13, 74] })],
            ['(,"2010-10-31 14:54:13.74-05:30")', utcRangeAsString({ upper: [2010, 9, 31, 20, 24, 13, 74] })],
            [
                '("2010-10-30 10:54:13.74-05:30","2010-10-31 14:54:13.74-05:30")',
                utcRangeAsString({
                    lower: [2010, 9, 30, 16, 24, 13, 74],
                    upper: [2010, 9, 31, 20, 24, 13, 74]
                })
            ]
        ]
    },
    tsrange: {
        id: 3908,
        tests: [
            ['(2010-10-31 14:54:13.74,)', utcRangeAsString({ lower: [2010, 9, 31, 14, 54, 13, 74] })],
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
            ['(2010-10-31,)', new Range('2010-10-31', null, RANGE_UB_INF)],
            ['(,2010-10-31)', new Range(null, '2010-10-31', RANGE_LB_INF)],
            ['[2010-10-30,2010-10-31]', new Range('2010-10-30', '2010-10-31', RANGE_LB_INC | RANGE_UB_INC)]
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
    },
    array: {
        boolean: {
            id: 1000, //_bool (underscore means array type)
            tests: [['{true,false}', [true, false]]]
        },
        char: {
            id: 1014, // _bpchar , array of blank padded char
            tests: [['{foo,bar}', ['foo', 'bar']]]
        },
        varchar: {
            id: 1015, // _varchar
            tests: [['{foo,bar}', ['foo', 'bar']]]
        },
        text: {
            // i think this is an error because _text has oid of 1009 not 1008
            // 1008 is _regproc an array of procedures with no arguments
            // example: select 'myproc'::regproc::oid;
            // so we change it to 1009
            // -> 16438
            id: 1009, // changed from 1008, i think this is a bug
            tests: [['{foo}', ['foo']]]
        },
        bytea: {
            id: 1001, // _bytea
            tests: [
                ['{"\\\\x00000000"}', Uint8Array.from([0, 0, 0, 0])],
                ['{NULL,"\\\\x4e554c4c"}', Uint8Array.from('x4e', 'x55', 'x4c', 'x4c')]
            ]
        },
        numeric: {
            id: 1231, // _numeric, arbitrary precision numerical values
            // so in js we keep it as text to prevent conversion into fp64?
            tests: [['{1.2,3.4}', ['1.2', '3.4']]]
        },
        int2: {
            id: 1005, //_int2
            tests: [['{-32768, -32767, 32766, 32767}', [-32768, -32767, 32766, 32767]]]
        },
        int4: {
            id: 1007, // _int4
            tests: [
                [
                    '{-2147483648, -2147483647, 2147483646, 2147483647}',
                    [-2147483648, -2147483647, 2147483646, 2147483647]
                ]
            ]
        },
        int8: {
            id: 1016, // _int8, 64 bit array type
            tests: [
                [
                    '{-9223372036854775808, -9223372036854775807, 9223372036854775806, 9223372036854775807}',
                    [-9223372036854775808n, -9223372036854775807n, 9223372036854775806n, 9223372036854775807n]
                ]
            ]
        },
        json: {
            id: 199, //_json array of jsons
            tests: [
                [
                    '{{1,2},{[3],"[4,5]"},{null,NULL}}',
                    [
                        [1, 2],
                        [[3], [4, 5]],
                        [null, null]
                    ]
                ]
            ]
        },
        jsonb: {
            id: 3807, //_jsonb lol, so, we need a mapper oid -> parse<type>
            tests: [
                [
                    '{{1,2},{[3],"[4,5]"},{null,NULL}}',
                    [
                        [1, 2],
                        [[3], [4, 5]],
                        [null, null]
                    ]
                ]
            ]
        }
    }
};

exports['array/point'] = {
    format: 'text',
    id: 1017,
    tests: [
        [
            '{"(25.1,50.5)","(10.1,40)"}',
            function (t, value) {
                t.deepEqual(value, [
                    { x: 25.1, y: 50.5 },
                    { x: 10.1, y: 40 }
                ]);
            }
        ]
    ]
};

exports['array/oid'] = {
    format: 'text',
    id: 1028,
    tests: [
        [
            '{25864,25860}',
            function (t, value) {
                t.deepEqual(value, [25864, 25860]);
            }
        ]
    ]
};

exports['array/float4'] = {
    format: 'text',
    id: 1021,
    tests: [
        [
            '{1.2, 3.4}',
            function (t, value) {
                t.deepEqual(value, [1.2, 3.4]);
            }
        ]
    ]
};

exports['array/float8'] = {
    format: 'text',
    id: 1022,
    tests: [
        [
            '{-12345678.1234567, 12345678.12345678}',
            function (t, value) {
                t.deepEqual(value, [-12345678.1234567, 12345678.12345678]);
            }
        ]
    ]
};

exports['array/date'] = {
    format: 'text',
    id: 1182,
    tests: [
        [
            '{2014-01-01,2015-12-31}',
            function (t, value) {
                t.deepEqual(value, ['2014-01-01', '2015-12-31']);
            }
        ]
    ]
};

exports['array/interval'] = {
    format: 'text',
    id: 1187,
    tests: [
        [
            '{01:02:03,1 day -00:00:03}',
            function (t, value) {
                const expecteds = [
                    toPostgresInterval({
                        years: 0,
                        months: 0,
                        days: 0,
                        hours: 1,
                        minutes: 2,
                        seconds: 3,
                        milliseconds: 0
                    }),
                    toPostgresInterval({
                        years: 0,
                        months: 0,
                        days: 1,
                        hours: -0,
                        minutes: -0,
                        seconds: -3,
                        milliseconds: -0
                    })
                ];
                t.equal(value.length, 2);
                t.deepEqual(value, expecteds);
            }
        ]
    ]
};

exports['array/inet'] = {
    format: 'text',
    id: 1041,
    tests: [
        [
            '{8.8.8.8}',
            function (t, value) {
                t.deepEqual(value, ['8.8.8.8']);
            }
        ],
        [
            '{2001:4860:4860::8888}',
            function (t, value) {
                t.deepEqual(value, ['2001:4860:4860::8888']);
            }
        ],
        [
            '{127.0.0.1,fd00:1::40e,1.2.3.4}',
            function (t, value) {
                t.deepEqual(value, ['127.0.0.1', 'fd00:1::40e', '1.2.3.4']);
            }
        ]
    ]
};

exports['array/cidr'] = {
    format: 'text',
    id: 651,
    tests: [
        [
            '{172.16.0.0/12}',
            function (t, value) {
                t.deepEqual(value, ['172.16.0.0/12']);
            }
        ],
        [
            '{fe80::/10}',
            function (t, value) {
                t.deepEqual(value, ['fe80::/10']);
            }
        ],
        [
            '{10.0.0.0/8,fc00::/7,192.168.0.0/24}',
            function (t, value) {
                t.deepEqual(value, ['10.0.0.0/8', 'fc00::/7', '192.168.0.0/24']);
            }
        ]
    ]
};

exports['array/macaddr'] = {
    format: 'text',
    id: 1040,
    tests: [
        [
            '{08:00:2b:01:02:03,16:10:9f:0d:66:00}',
            function (t, value) {
                t.deepEqual(value, ['08:00:2b:01:02:03', '16:10:9f:0d:66:00']);
            }
        ]
    ]
};

exports['array/numrange'] = {
    format: 'text',
    id: 3907,
    tests: [
        [
            '{"[1,2]","(4.5,8)","[10,40)","(-21.2,60.3]"}',
            function (t, value) {
                t.deepEqual(value, ['[1,2]', '(4.5,8)', '[10,40)', '(-21.2,60.3]']);
            }
        ],
        [
            '{"[,20]","[3,]","[,]","(,35)","(1,)","(,)"}',
            function (t, value) {
                t.deepEqual(value, ['[,20]', '[3,]', '[,]', '(,35)', '(1,)', '(,)']);
            }
        ],
        [
            '{"[,20)","[3,)","[,)","[,35)","[1,)","[,)"}',
            function (t, value) {
                t.deepEqual(value, ['[,20)', '[3,)', '[,)', '[,35)', '[1,)', '[,)']);
            }
        ]
    ]
};

exports['binary-string/varchar'] = {
    format: 'binary',
    id: 1043,
    tests: [['bang', 'bang']]
};

exports['binary-integer/int4'] = {
    format: 'binary',
    id: 23,
    tests: [[[0, 0, 0, 100], 100]]
};

exports['binary-smallint/int2'] = {
    format: 'binary',
    id: 21,
    tests: [[[0, 101], 101]]
};

exports['binary-bigint/int8'] = {
    format: 'binary',
    id: 20,
    tests: [[Buffer.from([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), '9223372036854775807']]
};

exports['binary-oid'] = {
    format: 'binary',
    id: 26,
    tests: [[[0, 0, 0, 103], 103]]
};

exports['binary-numeric'] = {
    format: 'binary',
    id: 1700,
    tests: [
        [
            [0, 2, 0, 0, 0, 0, 0, 0x64, 0, 12, 0xd, 0x48],
            '12.3400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
        ]
    ]
};

exports['binary-real/float4'] = {
    format: 'binary',
    id: 700,
    tests: [[[0x41, 0x48, 0x00, 0x00], 12.5]]
};

exports['binary-boolean'] = {
    format: 'binary',
    id: 16,
    tests: [
        [[1], true],
        [[0], false]
    ]
};

exports['binary-string'] = {
    format: 'binary',
    id: 25,
    tests: [[Buffer.from([0x73, 0x6c, 0x61, 0x64, 0x64, 0x61]), 'sladda']]
};

exports['binary-array/int4'] = {
    format: 'binary',
    id: 1007,
    tests: [
        [
            Buffer.from([
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0x17, // int4[]
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                4,
                0xff,
                0xff,
                0xff,
                0xff
            ]),
            function (t, value) {
                t.deepEqual(value, [-1]);
            }
        ]
    ]
};

exports['binary-array/int8'] = {
    format: 'binary',
    id: 1016,
    tests: [
        [
            Buffer.from([
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0x14, // int8[]
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                8,
                0xff,
                0xff,
                0xff,
                0xff,
                0xff,
                0xff,
                0xff,
                0xff
            ]),
            function (t, value) {
                t.deepEqual(value, ['-1']);
            }
        ],
        [
            Buffer.from([
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0x14, // int8[]
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                8,
                0x01,
                0xb6,
                0x9b,
                0x4b,
                0xac,
                0xd0,
                0x5f,
                0x15
            ]),
            function (t, value) {
                t.deepEqual(value, ['123456789123456789']);
            }
        ]
    ]
};

exports.point = {
    format: 'text',
    id: 600,
    tests: [
        [
            '(25.1,50.5)',
            function (t, value) {
                t.deepEqual(value, { x: 25.1, y: 50.5 });
            }
        ]
    ]
};

exports.circle = {
    format: 'text',
    id: 718,
    tests: [
        [
            '<(25,10),5>',
            function (t, value) {
                t.deepEqual(value, { x: 25, y: 10, radius: 5 });
            }
        ]
    ]
};

function dateEquals() {
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
    const timestamp = Date.UTC.apply(Date, arguments);
    return function (t, value) {
        t.equal(value.toUTCString(), new Date(timestamp).toUTCString());
    };
}
