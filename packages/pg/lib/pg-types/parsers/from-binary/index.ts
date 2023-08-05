import parseNumeric from './numeric';
import { decoder } from '@helpers';
import parseArray from './array';

const parseInt16 = function (value: DataView) {
    return value.getInt16(0);
};

function parseInt64(value: DataView) {
    return value.getBigInt64(0);
}

const parseInt32 = function (value: DataView) {
    return value.getInt32(0);
};

const parseFloat32 = function (value: DataView) {
    return value.getFloat32(0);
};

const parseFloat64 = function (value: DataView) {
    return value.getFloat64(0);
};

const parseTimestampUTC = function (value: DataView) {
    const rawValue = 0x100000000 * value.getInt32(0) + value.getUint32(4);
    // discard usecs and shift from 2000 to 1970
    const result = new Date(Math.round(rawValue / 1000) + 946684800000);
    return result;
};

const parseText = function (value: DataView) {
    return decoder.decode(value.buffer);
};

const parseBool = function (value: DataView) {
    return value.getUint8(0) !== 0;
};

const binaryMap = {
    [16]: parseBool,
    [20]: parseInt64, //int8
    [21]: parseInt16, // int2
    [23]: parseInt32, // int4
    [25]: parseText, // text
    [26]: parseInt32, // oid
    [700]: parseFloat32, // float4
    [701]: parseFloat64, // float8
    [1000]: parseArray, // _bool
    [1007]: parseArray, // _int4
    [1008]: parseArray, // _regproc (is this going to work?)  (array of functions with no arguments)
    [1009]: parseArray, // _text
    [1016]: parseArray, // _int8
    [1114]: parseTimestampUTC, // timestamp
    [1184]: parseTimestampUTC, //timestamptz
    [1700]: parseNumeric // numeric
};

export default binaryMap;
