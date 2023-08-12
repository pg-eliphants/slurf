const instrumentation = {
    int4: {
        id: 1007, //_int4
        tests: [
            [
                new DataView(
                    Uint8Array.from([
                        0,
                        0,
                        0,
                        1,
                        //
                        0,
                        0,
                        0,
                        0,
                        //
                        0,
                        0,
                        0,
                        0x17, // int4[]
                        //
                        0,
                        0,
                        0,
                        1,
                        //
                        0,
                        0,
                        0,
                        1,
                        //
                        0,
                        0,
                        0,
                        4,
                        //
                        0xff,
                        0xff,
                        0xff,
                        0xff
                    ]).buffer
                ),
                [-1]
            ]
        ]
    },
    int8: {
        id: 1016, // _int8
        tests: [
            [
                new DataView(
                    Uint8Array.from([
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
                    ]).buffer
                ),
                [-1n]
            ],
            [
                new DataView(
                    Uint8Array.from([
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
                    ]).buffer
                ),
                [123456789123456789n]
            ]
        ]
    }
};

export default instrumentation;
