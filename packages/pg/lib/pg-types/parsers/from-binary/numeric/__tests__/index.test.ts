import path from 'node:path';

import { loadData } from '@test-helpers';
import type { LineInfo } from '@test-helpers';
import decode from '@pg-types/parsers/from-text/decode';
import readNumeric from '../index';

describe('numeric', function () {
    describe('consistent interpretations', () => {
        return loadData(path.resolve(__dirname, 'fixtures/binary.csv')).then((fixture: LineInfo[]) => {
            for (const testData of fixture) {
                const { err, input, output, cnt } = testData;
                if (!output) {
                    throw new Error(`line: ${cnt} has no control-data`);
                }
                if (testData.err) {
                    throw new Error(`line ${cnt}, err=${err}`);
                }
                const name = output.length > 25 ? output.slice(0, 22) + '...' : output;
                it(name, () => {
                    const bin = decode('\\x' + input);
                    const dataView = new DataView(bin.buffer);
                    const result = readNumeric(dataView);
                    expect(result).toBe(output);
                });
            }
        }) as unknown as void;
    });
    describe('decimal round trips', () => {
        return loadData(path.resolve(__dirname, 'fixtures/decimal.csv')).then((fixture: LineInfo[]) => {
            for (const testData of fixture) {
                const { err, input, output, cnt } = testData;
                if (!output) {
                    throw new Error(`line: ${cnt} has no control-data`);
                }
                if (testData.err) {
                    throw new Error(`line ${cnt}, err=${err}`);
                }
                const name = output.length > 25 ? output.slice(0, 22) + '...' : output;
                it(name, () => {
                    const bin = decode('\\x' + input);
                    const dataView = new DataView(bin.buffer);
                    const result = readNumeric(dataView);
                    expect(result).toBe(output);
                });
            }
        }) as unknown as void;
    });
    describe('errors', () => {
        it('trailing data', () => {
            const dataView = new DataView(decode('\\x00010000000000000001ff').buffer);
            expect(() => readNumeric(dataView)).toThrow(
                'Invalid numeric length: 11 bytes of data representing 1 digits'
            );
        });
        it('digit out of range', () => {
            const dataView = new DataView(decode('\\x0001000000000000ffff').buffer);
            expect(() => readNumeric(dataView)).toThrow('Invalid numeric digit: 65535');
        });
        it('invalid sign', () => {
            const dataView = new DataView(decode('\\x00010000f00000000001').buffer);
            expect(() => readNumeric(dataView)).toThrow('Invalid numeric sign: 0xf000');
        });
        it('scale out of range', () => {
            const dataView = new DataView(decode('\\x00010000000040000001').buffer);
            expect(() => readNumeric(dataView)).toThrow('Invalid numeric dscale: 0x4000');
        });
    });
});
