import { absorbTill } from './parser-helpers';
import type { Point } from '../../types';

export default function parsePoint(value: string): Point | null {
    if (value[0] !== '(') {
        return null;
    }
    let cursor = 1;
    const digitsX = absorbTill(value, cursor, ',');
    if (!digitsX) {
        return null;
    }
    cursor += digitsX.length + 1; // skip past ')'
    const digitsY = absorbTill(value, cursor, ')');
    if (!digitsY) {
        return null;
    }
    return {
        x: parseFloat(digitsX),
        y: parseFloat(digitsY)
    };
}
