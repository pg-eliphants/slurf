import type { Circle } from '../../types';
import { absorbTill } from './parser-helpers';

// circle looks like this "<(x,y),r>"
export default function parseCircle(value: string): Circle | null {
    if (value[0] !== '<' && value[1] !== '(') {
        return null;
    }
    let cursor = 2;
    const digitsX = absorbTill(value, cursor, ',');
    if (!digitsX) {
        return null;
    }
    cursor += digitsX.length + 1; // skip past ','
    const digitsY = absorbTill(value, cursor, ')');
    if (!digitsY) {
        return null;
    }
    cursor += digitsY.length + 2; // skip past ')' and ','
    const digitsR = absorbTill(value, cursor, '>');
    if (!digitsR) {
        return null;
    }
    return {
        x: parseFloat(digitsX),
        y: parseFloat(digitsY),
        r: parseFloat(digitsR)
    };
}
