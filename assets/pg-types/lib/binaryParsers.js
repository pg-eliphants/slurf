const parseInt64 = require('pg-int8');
const parseNumeric = require('pg-numeric');

const parseInt16 = function (value) {
    return value.readInt16BE(0);
};

const parseInt32 = function (value) {
    return value.readInt32BE(0);
};

const parseFloat32 = function (value) {
    return value.readFloatBE(0);
};

const parseFloat64 = function (value) {
    return value.readDoubleBE(0);
};

const parseTimestampUTC = function (value) {
    const rawValue = 0x100000000 * value.readInt32BE(0) + value.readUInt32BE(4);

    // discard usecs and shift from 2000 to 1970
    const result = new Date(Math.round(rawValue / 1000) + 946684800000);

    return result;
};

const parseArray = function (value) {
    const dim = value.readInt32BE(0);
    // skip 4 bytes, start at pos 8
    const elementType = value.readUInt32BE(8);

    let offset = 12;
    const dims = [];
    for (let i = 0; i < dim; i++) {
        // parse dimension
        dims[i] = value.readInt32BE(offset);
        offset += 4;

        // ignore lower bounds
        offset += 4;
    }

    const parseElement = function (elementType) {
        // parse content length
        const length = value.readInt32BE(offset);
        offset += 4;

        // parse null values
        if (length === -1) {
            return null;
        }

        let result;
        if (elementType === 0x17) {
            // int
            result = value.readInt32BE(offset);
            offset += length;
            return result;
        } else if (elementType === 0x14) {
            // bigint
            result = parseInt64(value.slice(offset, (offset += length)));
            return result;
        } else if (elementType === 0x19) {
            // string
            result = value.toString('utf8', offset, (offset += length));
            return result;
        } else {
            throw new Error('ElementType not implemented: ' + elementType);
        }
    };

    // [4, 5, 4 2]
    // 4 ,[5,4,2]
    // loop 4x fetching whatever [5,4,2] spits out
    //   5, [4,2]
    //   loop 5x fetching whatever [4,2] spits out
    //        4, [2]
    //        loop 4x whatever [2] spits out
    //            fetch array of 2 base elements at offset 0
    //        put back 4 in the array
    //        [4,2]
    //        fetch array of 5x (4x(2 element))
    //        put 5 back into array
    //        [5,4,2]
    //   fetch 4x (5x(4x(2 elements)))
    //   put 4 back into array
    //   [4,5,4,2]
    // stop
    const parse = function (dimension, elementType) {
        const array = [];
        let i;

        if (dimension.length > 1) {
            const count = dimension.shift();
            for (i = 0; i < count; i++) {
                array[i] = parse(dimension, elementType);
            }
            dimension.unshift(count);
        } else {
            for (i = 0; i < dimension[0]; i++) {
                array[i] = parseElement(elementType);
            }
        }

        return array;
    };

    return parse(dims, elementType);
};

const parseText = function (value) {
    return value.toString('utf8');
};

const parseBool = function (value) {
    return value[0] !== 0;
};

const init = function (register) {
    register(20, parseInt64);
    register(21, parseInt16);
    register(23, parseInt32);
    register(26, parseInt32);
    register(1700, parseNumeric);
    register(700, parseFloat32);
    register(701, parseFloat64);
    register(16, parseBool);
    register(1114, parseTimestampUTC);
    register(1184, parseTimestampUTC);
    register(1000, parseArray);
    register(1007, parseArray);
    register(1016, parseArray);
    register(1008, parseArray);
    register(1009, parseArray);
    register(25, parseText);
};

module.exports = {
    init: init
};
