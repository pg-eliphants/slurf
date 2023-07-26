/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import parseArray from './array';
import parseDate from './dates';
import parseInterval from './interval';
import parseByteA from './decode';
import parseRange from './range';

import { parseBool, parseBigInteger, parsePoint, parseCircle } from './parse-array-transform-helpers';

// this is "circular" reference
type PropRecord = Record<string, string | number> | SubObject;

interface SubObject extends Record<string, PropRecord> {}

export function parseBoolArray(value: string) {
    return parseArray(value, parseBool);
}

export function parseIntegerArray(value: string) {
    return parseArray(value, Number);
}

export function parseBigIntegerArray(value: string) {
    return parseArray(value, parseBigInteger);
}

export function parsePointArray(value: string) {
    return parseArray(value, parsePoint);
}

export function parseFloatArray(value: string) {
    return parseArray(value, parseFloat);
}

export function parseStringArray(value: string) {
    return parseArray(value, undefined);
}

export function parseTimestamp(value: string) {
    const utc = value.endsWith(' BC') ? value.slice(0, -3) + 'Z BC' : value + 'Z';
    return parseDate(utc);
}

export function parseTimestampArray(value: string) {
    return parseArray(value, parseTimestamp);
}

export function parseTimestampTzArray(value: string) {
    return parseArray(value, parseDate);
}

export function parseIntervalArray(value: string) {
    return parseArray(value, parseInterval);
}

export function parseByteAArray(value: string) {
    return parseArray(value, parseByteA);
}

export function parseJsonArray(value: string) {
    return parseArray<PropRecord[]>(value, JSON.parse);
}

export function parseInt4Range(raw: string) {
    return parseRange(raw, Number);
}

export function parseNumRange(raw: string) {
    return parseRange(raw, parseFloat);
}

export function parseInt8Range(raw: string) {
    return parseRange(raw, parseBigInteger);
}

export function parseTimestampRange(raw: string) {
    return parseRange(raw, parseTimestamp);
}

export function parseTimestampTzRange(raw: string) {
    return parseRange(raw, parseDate);
}

export function init(register: (iod: number, fn: (a: string) => unknown) => void): void {
    register(16, parseBool);
    register(17, parseByteA);
    register(20, parseBigInteger); // int8
    register(21, Number); // int2
    register(23, Number); // int4
    register(26, Number); // oid
    register(700, parseFloat); // float4/real
    register(701, parseFloat); // float8/double
    register(1114, parseTimestamp); // timestamp without time zone
    register(1184, parseDate); // timestamp with time zone
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

    register(114, JSON.parse); // json
    register(3802, JSON.parse); // jsonb
    register(199, parseJsonArray); // json[]
    register(3807, parseJsonArray); // jsonb[]
    register(3904, parseInt4Range); // int4range
    register(3906, parseNumRange); // numrange
    register(3907, parseStringArray); // numrange[]
    register(3908, parseTimestampRange); // tsrange
    register(3910, parseTimestampTzRange); // tstzrange
    register(3912, parseRange); // daterange
    register(3926, parseInt8Range); // int8range
    register(2951, parseStringArray); // uuid[]
    register(791, parseStringArray); // money[]
    register(1183, parseStringArray); // time[]
    register(1270, parseStringArray); // timetz[]
}
