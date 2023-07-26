import { absorbTill } from '../../../helpers';

export function parseBool(value: string) {
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

// String(1E3) ->                     '1000'
// String(1E12) ->                    '1000000000000'
// String(1E19) ->                    '10000000000000000000'
// String(Number.MAX_SAFE_INTEGER) -> '9007199254740991'
// Note Math.log2(1E19) = 63.1166 far beyond the safe integer MAX_SAFE_INTEGER (53 bits)

export function parseBigInteger(value: string) {
    const valStr = String(value).trim();
    if (/^\d+$/.test(valStr)) {
        return valStr;
    }
    return value.trim();
}

export function parsePoint(value: string) {
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

// circle looks like this "<(x,y),r>"
export function parseCircle(value: string) {
    if (value[0] !== '<' && value[1] !== '(') {
        return null;
    }
    let cursor = 2;
    const digitsX = absorbTill(value, cursor, ',');
    if (!digitsX) {
        return null;
    }
    cursor += digitsX.length + 1; // skip past ')'
    const digitsY = absorbTill(value, cursor, ')');
    if (!digitsY) {
        return null;
    }
    cursor += digitsY.length + 2; // skip past '),'
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
