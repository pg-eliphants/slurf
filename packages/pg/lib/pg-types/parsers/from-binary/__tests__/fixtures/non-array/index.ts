const instrumentation = {
    varchar: {
        id: 1043, // varchar
        tests: [
            [
                new DataView(Uint8Array.from([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]).buffer),
                'hello world'
            ]
        ]
    },
    int4: {
        id: 23, // int4
        // 100 in big endian format
        tests: [[new DataView(Uint8Array.from([0, 0, 0, 100]).buffer), 100]]
    },
    int8: {
        id: 20, // int8, 64bit  int
        tests: [
            [
                new DataView(Uint8Array.from([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]).buffer),
                9223372036854775807n
            ]
        ]
    },
    oid: {
        id: 26, // same as int4
        tests: [[new DataView(Uint8Array.from([0, 0, 0, 103]).buffer), 103]]
    },
    numeric: {
        id: 1700, // numeric
        tests: [
            [
                new DataView(Uint8Array.from([0, 2, 0, 0, 0, 0, 0, 0x64, 0, 12, 0xd, 0x48]).buffer),
                '12.3400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
            ]
        ]
    },
    float4: {
        id: 700, //float4, fp32
        tests: [[new DataView(Uint8Array.from([0x41, 0x48, 0x00, 0x00]).buffer), 12.5]]
    },
    boolean: {
        id: 16, // bool, takes 1 byte storage
        tests: [
            [new DataView(Uint8Array.from([1]).buffer), true],
            [new DataView(Uint8Array.from([0]).buffer), false]
        ]
    },
    text: {
        id: 25, // text
        tests: [[new DataView(Uint8Array.from([0x73, 0x6c, 0x61, 0x64, 0x64, 0x61]).buffer), 'sladda']]
    }
};

export default instrumentation;
