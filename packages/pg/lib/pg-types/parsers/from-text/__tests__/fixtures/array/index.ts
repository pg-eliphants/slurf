const instrumentation = {
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
            ['{"\\\\x00000000"}', [Uint8Array.from([0, 0, 0, 0])]],
            ['{NULL,"\\\\x4e554c4c"}', [null, Uint8Array.from([0x4e, 0x55, 0x4c, 0x4c])]]
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
            ['{-2147483648, -2147483647, 2147483646, 2147483647}', [-2147483648, -2147483647, 2147483646, 2147483647]]
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
    },
    point: {
        id: 1017, //_point
        tests: [
            [
                '{"(25.1,50.5)","(10.1,40)"}',
                [
                    { x: 25.1, y: 50.5 },
                    { x: 10.1, y: 40 }
                ]
            ]
        ]
    },
    oid: {
        id: 1028, //_oid
        tests: [['{25864,25860}', [25864, 25860]]]
    },
    float4: {
        id: 1021, //_float4 (float 32 bits), but as js fp64 number
        tests: [['{1.2, 3.4}', [1.2, 3.4]]]
    },
    float8: {
        id: 1022, //_float8 (float  bits)
        tests: [['{-12345678.1234567, 12345678.12345678}', [-12345678.1234567, 12345678.12345678]]]
    },
    date: {
        id: 1182, //_date
        tests: [['{2014-01-01,2015-12-31}', ['2014-01-01', '2015-12-31']]]
    },
    interval: {
        id: 1187, // _interval
        tests: [
            [
                '{01:02:03,1 day -00:00:03}',

                {
                    years: 0,
                    months: 0,
                    days: 0,
                    hours: 1,
                    minutes: 2,
                    seconds: 3,
                    milliseconds: 0
                },
                {
                    years: 0,
                    months: 0,
                    days: 1,
                    hours: -0,
                    minutes: -0,
                    seconds: -3,
                    milliseconds: -0
                }
            ]
        ]
    },
    inet: {
        id: 1041, //_inet
        tests: [
            ['{8.8.8.8}', ['8.8.8.8']],
            ['{2001:4860:4860::8888}', ['2001:4860:4860::8888']],
            ['{127.0.0.1,fd00:1::40e,1.2.3.4}', ['127.0.0.1', 'fd00:1::40e', '1.2.3.4']]
        ]
    },
    cidr: {
        id: 651, //_cidr
        tests: [
            ['{172.16.0.0/12}', ['172.16.0.0/12']],
            ['{fe80::/10}', ['fe80::/10']],
            ['{10.0.0.0/8,fc00::/7,192.168.0.0/24}', ['10.0.0.0/8', 'fc00::/7', '192.168.0.0/24']]
        ]
    },
    macaddr: {
        id: 1040, //_macaddr
        tests: [['{08:00:2b:01:02:03,16:10:9f:0d:66:00}', ['08:00:2b:01:02:03', '16:10:9f:0d:66:00']]]
    },
    numrange: {
        id: 3907, //_numrange , this is not a nummultirange (that is an oid 4532)
        tests: [
            ['{"[1,2]","(4.5,8)","[10,40)","(-21.2,60.3]"}', ['[1,2]', '(4.5,8)', '[10,40)', '(-21.2,60.3]']],
            ['{"[,20]","[3,]","[,]","(,35)","(1,)","(,)"}', ['[,20]', '[3,]', '[,]', '(,35)', '(1,)', '(,)']],
            ['{"[,20]","[3,]","[,]","(,35)","(1,)","(,)"}', ['[,20)', '[3,)', '[,)', '[,35)', '[1,)', '[,)']]
        ]
    }
};

export default instrumentation;
