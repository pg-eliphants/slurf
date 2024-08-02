// Where does this go?
/* REM entries<
T extends {[key: string]: any },
K extends keyof T
>(o: T): [keyof T, T[K]][];
*/

import { deepClone } from './deepClone';
import { flatMap } from './flatMap';
import { flattenMerge } from './flatten';
import { ifEmptyString } from './ifEmptyString';
import { ifInvalidPortString } from './ifInvalidPortString';
import { ifNull } from './ifNull';
import { ifUndefined } from './ifUndefined';
import { IAnyObjProps } from './interfaces';
import { makeObjectNull } from './makeObjectNull';
import { makeValueslowerCase } from './makeValueslowerCase';
import { MapWithIndexes } from './MapWithIndexes';
import { OperationResult } from './OperationResult';
import { validationFactory } from './validationFactory';

export {
  deepClone,
  flatMap,
  flattenMerge,
  ifEmptyString,
  ifInvalidPortString,
  ifNull,
  ifUndefined,
  IAnyObjProps,
  makeObjectNull,
  makeValueslowerCase,
  MapWithIndexes,
  OperationResult,
  validationFactory
};

export * from './copyProperties';
export * from './cssAccessor';
export * from './isString';
export * from './isNumber';
export * from './isFunction';
