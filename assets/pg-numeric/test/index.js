'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');

const test = {
	group(groupName, build) {
		function test(testName, run) {
			console.log(groupName + ' > ' + testName);
			run();
		}

		build(test);
	},
};

const readNumeric = require('../');

const truncate = text =>
	text.replace(/(.{1,4}?)\1{6,}/g, '$1$1…$1$1');

test.group('decimal round trips', test => {
	const testRows = fs.readFileSync(path.join(__dirname, 'decimal.csv'), 'utf8').match(/.+/g).slice(1);

	for (const row of testRows) {
		const cols = row.split(',');
		const testHex = cols[0];
		const expected = cols[1];

		test(util.inspect(expected), () => {
			assert.strictEqual(readNumeric(Buffer.from(testHex, 'hex')), expected);
		});
	}
});

test.group('consistent interpretations', test => {
	const testRows = fs.readFileSync(path.join(__dirname, 'binary.csv'), 'utf8').match(/.+/g).slice(1);

	for (const row of testRows) {
		const cols = row.split(',');
		const testHex = cols[0];
		const expected = cols[1];

		test(`${truncate(testHex)} ('${truncate(expected)}')`, () => {
			assert.strictEqual(readNumeric(Buffer.from(testHex, 'hex')), expected);
		});
	}
});

test.group('errors', test => {
	test('trailing data', () => {
		assert.throws(() => {
			readNumeric(Buffer.from('00010000000000000001ff', 'hex'));
		}, /RangeError: Invalid numeric length/);
	});

	test('digit out of range', () => {
		assert.throws(() => {
			readNumeric(Buffer.from('0001000000000000ffff', 'hex'));
		}, /RangeError: Invalid numeric digit: 65535/);
	});

	test('invalid sign', () => {
		assert.throws(() => {
			readNumeric(Buffer.from('00010000f00000000001', 'hex'));
		}, /RangeError: Invalid numeric sign: 0xf000/);
	});

	test('scale out of range', () => {
		assert.throws(() => {
			readNumeric(Buffer.from('00010000000040000001', 'hex'));
		}, /RangeError: Invalid numeric dscale: 0x4000/);
	});
});
