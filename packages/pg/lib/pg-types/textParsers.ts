/*const array = require('postgres-array');
const parseTimestampTz = require('postgres-date');
const parseInterval = require('postgres-interval');
const parseByteA = require('postgres-bytea');
const range = require('postgres-range');
*/

import parseArray from './array';

function parseBool(value: string) {
    return (
        value === 'TRUE' ||
        value === 't' ||
        value === 'true' ||
        value === 'y' ||
        value === 'yes' ||
        value === 'on' ||
        value === '1'
    );
}

function parseBoolArray(value: string) {
    return parseArray(value, parseBool);
}

function parseIntegerArray(value: string) {
    return parseArray(value, Number);
}

function parseBigIntegerArray(value: string) {
    return parseArray(value, BigInt);
}

const parsePointArray = function (value: string) {
    return parseArray(value, parsePoint);
};

const parseFloatArray = function (value: string) {
    return parseArray(value, parseFloat);
};

const parseStringArray = function (value: string) {
    return parseArray(value, undefined);
};

const parseTimestamp = function (value: string) {
    const utc = value.endsWith(' BC') ? value.slice(0, -3) + 'Z BC' : value + 'Z';

    return parseTimestampTz(utc);
};

const parseTimestampArray = function (value) {
    return parseArray(value, parseTimestamp);
};

const parseTimestampTzArray = function (value) {
    return parseArray(value, parseTimestampTz);
};

const parseIntervalArray = function (value) {
    return parseArray(value, parseInterval);
};

const parseByteAArray = function (value) {
    return parseArray(value, parseByteA);
};

const parseBigInteger = function (value) {
    const valStr = String(value);
    if (/^\d+$/.test(valStr)) {
        return valStr;
    }
    return value;
};

const parseJsonArray = function (value) {
    return parseArray(value, JSON);
};

const parsePoint = function (value) {
    if (value[0] !== '(') {
        return null;
    }

    value = value.substring(1, value.length - 1).split(',');

    return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
    };
};

const parseCircle = function (value: string) {
    if (value[0] !== '<' && value[1] !== '(') {
        return null;
    }

    let point = '(';
    let radius = '';
    let pointParsed = false;
    for (let i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
            point += value[i];
        }

        if (value[i] === ')') {
            pointParsed = true;
            continue;
        } else if (!pointParsed) {
            continue;
        }

        if (value[i] === ',') {
            continue;
        }

        radius += value[i];
    }
    const result = parsePoint(point);
    result.radius = parseFloat(radius);

    return result;
};

function parseInt4Range(raw) {
    return range(raw, Number);
}

function parseNumRange(raw) {
    return range(raw, parseFloat);
}

function parseInt8Range(raw) {
    return range(raw, parseBigInteger);
}

function parseTimestampRange(raw) {
    return range(raw, parseTimestamp);
}

function parseTimestampTzRange(raw) {
    return range(raw, parseTimestampTz);
}

const init = function (register) {
    register(20, parseBigInteger); // int8
    register(21, Number); // int2
    register(23, Number); // int4
    register(26, Number); // oid
    register(700, parseFloat); // float4/real
    register(701, parseFloat); // float8/double
    register(16, parseBool);
    register(1114, parseTimestamp); // timestamp without time zone
    register(1184, parseTimestampTz); // timestamp with time zone
    register(600, parsePoint); // point
    register(651, parseStringArray); // cidr[]
    register(718, parseCircle); // circle
    register(1000, parseBoolArray);
    register(1001, parseByteAArray);
    register(1005, parseIntegerArray); // _int2
    register(1007, parseIntegerArray); // _int4
    register(1028, parseIntegerArray); // oid[]
    register(1016, parseBigIntegerArray); // _int8
    register(1017, parsePointArray); // point[]
    register(1021, parseFloatArray); // _float4
    register(1022, parseFloatArray); // _float8
    register(1231, parseStringArray); // _numeric
    register(1014, parseStringArray); // char
    register(1015, parseStringArray); // varchar
    register(1008, parseStringArray);
    register(1009, parseStringArray);
    register(1040, parseStringArray); // macaddr[]
    register(1041, parseStringArray); // inet[]
    register(1115, parseTimestampArray); // timestamp without time zone[]
    register(1182, parseStringArray); // date[]
    register(1185, parseTimestampTzArray); // timestamp with time zone[]
    register(1186, parseInterval);
    register(1187, parseIntervalArray);
    register(17, parseByteA);
    register(114, JSON); // json
    register(3802, JSON); // jsonb
    register(199, parseJsonArray); // json[]
    register(3807, parseJsonArray); // jsonb[]
    register(3904, parseInt4Range); // int4range
    register(3906, parseNumRange); // numrange
    register(3907, parseStringArray); // numrange[]
    register(3908, parseTimestampRange); // tsrange
    register(3910, parseTimestampTzRange); // tstzrange
    register(3912, range); // daterange
    register(3926, parseInt8Range); // int8range
    register(2951, parseStringArray); // uuid[]
    register(791, parseStringArray); // money[]
    register(1183, parseStringArray); // time[]
    register(1270, parseStringArray); // timetz[]
};

module.exports = {
    init: init
};
