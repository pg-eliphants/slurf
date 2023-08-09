import type { BinaryArrayTerminals } from '@pg-types/types';
import { decoder } from '@helpers';

export default function parseArray<T extends boolean | number | bigint | string | null>(
    value: DataView
): BinaryArrayTerminals<T> {
    const dim = value.getInt32(0);
    // skip value.getInt32(4);
    const elementType = value.getUint32(8);

    let offset = 12;
    const dims = new Uint32Array(dim);
    for (let i = 0; i < dim; i++) {
        // parse dimension
        dims[i] = value.getInt32(offset);
        // skip over the lower bound, normally offset += 4  (x2)
        offset += 8;
    }

    const parseElement = function (elementType: number): T {
        // parse content length
        const length = value.getUint32(offset);
        offset += 4;

        // parse null values
        if (length === -1) {
            return null as T;
        }

        let result: number | bigint | string;
        if (elementType === 0x17) {
            // int
            result = value.getUint32(offset);
            offset += length;
            return result as T;
        } else if (elementType === 0x14) {
            // bigint
            const bigIntDataView = new DataView(value.buffer, offset, length);
            result = bigIntDataView.getBigInt64(0);
            return result as T;
        } else if (elementType === 0x19) {
            // string
            result = decoder.decode(value.buffer.slice(offset, (offset += length)));
            return result as T;
        } else {
            throw new Error('ElementType not implemented: ' + elementType);
        }
    };

    // this is so weird, its like inversion
    function parse(dimension: Uint32Array, elementType: number, cursor = 0) {
        const array: BinaryArrayTerminals<T> = [];
        let i;

        if (cursor < dimension.length - 1) {
            const count = dimension[cursor];
            for (i = 0; i < count; i++) {
                array[i] = parse(dimension, elementType, cursor + 1);
            }
        } else {
            for (i = 0; i < dimension[0]; i++) {
                array[i] = parseElement(elementType);
            }
        }
        return array;
    }

    return parse(dims, elementType);
}
