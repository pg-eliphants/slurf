/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import parseArray from './array';
import parseDate from './dates';
import parseInterval from './interval';
import byteaToBinary from './decode';
import parseRange, { Range } from './range';

import { parseBool, parseBigInteger, parsePoint, parseCircle } from './parse-array-transform-helpers';

// this is "circular" reference
export type PropRecord = Record<string, string | number> | SubObject;

interface SubObject extends Record<string, PropRecord> {}

function parseBoolArray(value: string) {
    return parseArray(value, parseBool);
}

function parseIntegerArray(value: string) {
    return parseArray(value, Number);
}

function parseBigIntegerArray(value: string) {
    return parseArray(value, parseBigInteger);
}

function parsePointArray(value: string) {
    return parseArray(value, parsePoint);
}

function parseFloatArray(value: string) {
    return parseArray(value, parseFloat);
}

function parseStringArray(value: string) {
    return parseArray(value, undefined);
}

function parseTimestamp(value: string) {
    const utc = value.endsWith(' BC') ? value.slice(0, -3) + 'Z BC' : value + 'Z';
    return parseDate(utc);
}

function parseTimestampArray(value: string) {
    return parseArray(value, parseTimestamp);
}

function parseTimestampTzArray(value: string) {
    return parseArray(value, parseDate);
}

function parseIntervalArray(value: string) {
    return parseArray(value, parseInterval);
}

function parseByteAArray(value: string) {
    return parseArray(value, byteaToBinary);
}

function parseJsonArray(value: string) {
    return parseArray<PropRecord[]>(value, JSON.parse);
}

function parseInt4Range(raw: string) {
    return parseRange(raw, Number);
}

function parseNumRange(raw: string) {
    return parseRange(raw, parseFloat);
}

function parseInt8Range(raw: string) {
    return parseRange(raw, parseBigInteger);
}

function parseTimestampRange(raw: string) {
    return parseRange(raw, parseTimestamp);
}

function parseTimestampTzRange(raw: string) {
    return parseRange(raw, parseDate);
}

const scalarTypes = ['number', 'string', 'bigint', 'boolean'];

export function isEqual(jsObject: any, out: any) {
    if (
        scalarTypes.includes(typeof jsObject) ||
        jsObject === null ||
        jsObject === undefined ||
        jsObject === Infinity ||
        jsObject === -Infinity
    ) {
        return jsObject === out;
    }
    if (jsObject instanceof Date) {
        if (typeof out === 'number') {
            return jsObject.valueOf() === out;
        }
        if (typeof out === 'string') {
            return jsObject.valueOf() === new Date(out).valueOf();
        }
        return false;
    }
    if (jsObject instanceof Range) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [arg0, arg1, arg2] = out;
        const expected = new Range(arg0, arg1, arg2 as number);
        return jsObject.equals(expected);
    }
    if (jsObject instanceof Uint8Array && (Array.isArray(out) || out instanceof Uint8Array)) {
        if (jsObject.length !== out.length) {
            return false;
        }
        for (let i = 0; i < jsObject.length; i++) {
            if (jsObject[i] !== out[i]) {
                return false;
            }
        }
        return true;
    }
    return false;
}

/**
postgres=# with js as (SELECT unnest(string_to_array('16,17,20,21,23,26,114,199,600,651,700,701,718,791,1000,1001,1005,1007,1008,1009,1014,1015,1016,1017,1021,1022,1028,1040,1041,1114,1115,1182,1183,1184,1185,1186,1187,1231,1270,2951,3802,3807,3904,3906,3907,3908,3910,3912,3926', ',') ))
select js.unnest::int as id, pgt.oid, pgt.typname  from pg_type pgt left join js on pgt.oid::int = js.unnest::int order by 2
;
  id  |  oid  |                typname
------+-------+----------------------------------------
   16 |    16 | bool
   17 |    17 | bytea
      |    18 | char
      |    19 | name
   20 |    20 | int8
   21 |    21 | int2
      |    22 | int2vector
   23 |    23 | int4
      |    24 | regproc
      |    25 | text
   26 |    26 | oid
      |    27 | tid
      |    28 | xid
      |    29 | cid
      |    30 | oidvector
      |    32 | pg_ddl_command
      |    71 | pg_type
      |    75 | pg_attribute
      |    81 | pg_proc
      |    83 | pg_class
  114 |   114 | json
      |   142 | xml
      |   143 | _xml
      |   194 | pg_node_tree
  199 |   199 | _json
      |   210 | _pg_type
      |   269 | table_am_handler
      |   270 | _pg_attribute
      |   271 | _xid8
      |   272 | _pg_proc
      |   273 | _pg_class
      |   325 | index_am_handler
  600 |   600 | point
      |   601 | lseg
      |   602 | path
      |   603 | box
      |   604 | polygon
      |   628 | line
      |   629 | _line
      |   650 | cidr
  651 |   651 | _cidr
  700 |   700 | float4
  701 |   701 | float8
      |   705 | unknown
  718 |   718 | circle
      |   719 | _circle
      |   774 | macaddr8
      |   775 | _macaddr8
      |   790 | money
  791 |   791 | _money
      |   829 | macaddr
      |   869 | inet
 1000 |  1000 | _bool
 1001 |  1001 | _bytea
      |  1002 | _char
      |  1003 | _name
 1005 |  1005 | _int2
      |  1006 | _int2vector
 1007 |  1007 | _int4
 1008 |  1008 | _regproc
 1009 |  1009 | _text
      |  1010 | _tid
      |  1011 | _xid
      |  1012 | _cid
      |  1013 | _oidvector
 1014 |  1014 | _bpchar
 1015 |  1015 | _varchar
 1016 |  1016 | _int8
 1017 |  1017 | _point
      |  1018 | _lseg
      |  1019 | _path
      |  1020 | _box
 1021 |  1021 | _float4
 1022 |  1022 | _float8
      |  1027 | _polygon
 1028 |  1028 | _oid
      |  1033 | aclitem
      |  1034 | _aclitem
 1040 |  1040 | _macaddr
 1041 |  1041 | _inet
      |  1042 | bpchar
      |  1043 | varchar
      |  1082 | date
      |  1083 | time
 1114 |  1114 | timestamp
 1115 |  1115 | _timestamp
 1182 |  1182 | _date
 1183 |  1183 | _time
 1184 |  1184 | timestamptz
 1185 |  1185 | _timestamptz
 1186 |  1186 | interval
 1187 |  1187 | _interval
 1231 |  1231 | _numeric
      |  1248 | pg_database
      |  1263 | _cstring
      |  1266 | timetz
 1270 |  1270 | _timetz
      |  1560 | bit
      |  1561 | _bit
      |  1562 | varbit
      |  1563 | _varbit
      |  1700 | numeric
      |  1790 | refcursor
      |  2201 | _refcursor
      |  2202 | regprocedure
      |  2203 | regoper
      |  2204 | regoperator
      |  2205 | regclass
      |  2206 | regtype
      |  2207 | _regprocedure
      |  2208 | _regoper
      |  2209 | _regoperator
      |  2210 | _regclass
      |  2211 | _regtype
      |  2249 | record
      |  2275 | cstring
      |  2276 | any
      |  2277 | anyarray
      |  2278 | void
      |  2279 | trigger
      |  2280 | language_handler
      |  2281 | internal
      |  2283 | anyelement
      |  2287 | _record
      |  2776 | anynonarray
      |  2842 | pg_authid
      |  2843 | pg_auth_members
      |  2949 | _txid_snapshot
      |  2950 | uuid
 2951 |  2951 | _uuid
      |  2970 | txid_snapshot
      |  3115 | fdw_handler
      |  3220 | pg_lsn
      |  3221 | _pg_lsn
      |  3310 | tsm_handler
      |  3361 | pg_ndistinct
      |  3402 | pg_dependencies
      |  3500 | anyenum
      |  3614 | tsvector
      |  3615 | tsquery
      |  3642 | gtsvector
      |  3643 | _tsvector
      |  3644 | _gtsvector
      |  3645 | _tsquery
      |  3734 | regconfig
      |  3735 | _regconfig
      |  3769 | regdictionary
      |  3770 | _regdictionary
 3802 |  3802 | jsonb
 3807 |  3807 | _jsonb
      |  3831 | anyrange
      |  3838 | event_trigger
 3904 |  3904 | int4range           select 'int4range'::regtype::oid;
      |  3905 | _int4range          select '_int4range'::regtype::oid;
 3906 |  3906 | numrange
 3907 |  3907 | _numrange
 3908 |  3908 | tsrange
      |  3909 | _tsrange
 3910 |  3910 | tstzrange
      |  3911 | _tstzrange
 3912 |  3912 | daterange
      |  3913 | _daterange
 3926 |  3926 | int8range

                                    select 'int4multirange'::regtype::oid;

 
*/

/* some queries:
auth_db=> select 'int4range'::regtype::oid;
 oid
------
 3904
(1 row)

auth_db=> select '_int4range'::regtype::oid;
 oid
------
 3905
(1 row)

auth_db=> select 'int4multirange'::regtype::oid;
 oid
------
 4451
(1 row)
*/

type TextMap = {
    [index: number]: (raw: string) => any;
};

const textMap: TextMap = {
    [16]: parseBool,
    [17]: byteaToBinary,
    [20]: parseBigInteger,
    [21]: Number,
    [23]: Number,
    [26]: Number,
    [114]: JSON.parse,
    [199]: parseJsonArray,
    [600]: parsePoint,
    [651]: parseStringArray,
    [700]: parseFloat,
    [701]: parseFloat,
    [718]: parseCircle,
    [791]: parseStringArray,
    [1000]: parseBoolArray,
    [1001]: parseByteAArray,
    [1005]: parseIntegerArray,
    [1007]: parseIntegerArray,
    [1008]: parseStringArray,
    [1009]: parseStringArray,
    [1014]: parseStringArray,
    [1015]: parseStringArray,
    [1016]: parseBigIntegerArray,
    [1017]: parsePointArray,
    [1021]: parseFloatArray,
    [1022]: parseFloatArray,
    [1028]: parseIntegerArray,
    [1040]: parseStringArray,
    [1041]: parseStringArray,
    [1114]: parseTimestamp,
    [1115]: parseTimestampArray,
    [1182]: parseStringArray,
    [1183]: parseStringArray,
    [1184]: parseDate,
    [1185]: parseTimestampTzArray,
    [1186]: parseInterval,
    [1187]: parseIntervalArray,
    [1231]: parseStringArray,
    [1270]: parseStringArray,
    [2951]: parseStringArray,
    [3802]: JSON.parse,
    [3807]: parseJsonArray,
    [3904]: parseInt4Range,
    [3906]: parseNumRange,
    [3907]: parseStringArray,
    [3908]: parseTimestampRange,
    [3910]: parseTimestampTzRange,
    [3912]: parseRange,
    [3926]: parseInt8Range
};

export default textMap;
