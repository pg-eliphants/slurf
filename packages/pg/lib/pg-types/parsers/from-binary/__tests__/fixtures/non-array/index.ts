const instrumentation = {
    varchar: {
        id: 1043, // varchar
        tests: [[Uint8Array.from([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]), 'hello world']]
    },
    int4: {
        id: 23, // int4
        // 100 in big endian format
        tests: [[Uint8Array.from([0, 0, 0, 100]), 100]]
    },
    int8: {
        id: 20, // int8, 64bit  int
        tests: [
            [Uint8Array.from([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), '9223372036854775807'],
            [Uint8Array.from([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), 9223372036854775807n]
        ]
    },
    oid: {
        id: 26, // same as int4
        tests: [[[0, 0, 0, 103], 103]]
    },
    numeric: {
        id: 1700, // numeric
        tests: [
            [
                Uint8Array.from([0, 2, 0, 0, 0, 0, 0, 0x64, 0, 12, 0xd, 0x48]),
                '12.3400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
            ]
        ]
    },
    float4: {
        id: 700, //float4, fp32
        tests: [[Uint8Array.from([0x41, 0x48, 0x00, 0x00]), 12.5]]
    },
    boolean: {
        id: 16, // bool, takes 1 byte storage
        tests: [
            [Uint8Array.from([1]), true],
            [Uint8Array.from([0]), false]
        ]
    },
    string: {
        id: 25, // text
        tests: [[Uint8Array.from([0x73, 0x6c, 0x61, 0x64, 0x64, 0x61]), 'sladda']]
    }
};

export default instrumentation;
