#!/usr/bin/env python3
import binascii
import csv
import os.path
import re
import struct
import subprocess
import sys


TEST = re.compile(r'[-0-9.Na]+$')


def read_numerics(f):
	header = f.read(19)

	if header != b'PGCOPY\n\xff\r\n\0\0\0\0\0\0\0\0\0':
		raise Exception('Unexpected header')

	results = []

	while True:
		(field_count,) = struct.unpack('>h', f.read(2))

		if field_count == -1:
			assert f.read() == b''
			break

		if field_count != 1:
			raise Exception(f'Unexpected field count: {field_count!r}')

		(field_size,) = struct.unpack('>i', f.read(4))
		results.append(f.read(field_size))

	return results


def main():
	tests = []

	with open(os.path.join(os.path.dirname(__file__), 'decimal.in'), 'r') as f:
		for line in f:
			if line.isspace() or line.startswith('#'):
				continue

			if not TEST.match(line):
				raise ValueError(f'Invalid test: {line!r}')

			tests.append(line.rstrip())

	query = b'COPY (VALUES ' + b', '.join(b"(numeric '%s')" % (test.encode('ascii'),) for test in tests) + b') TO STDOUT (FORMAT binary)'

	with subprocess.Popen(['psql', '--set=ON_ERROR_STOP=1'], stdin=subprocess.PIPE, stdout=subprocess.PIPE) as psql:
		psql.stdin.write(query)
		psql.stdin.close()

		results = read_numerics(psql.stdout)

	if psql.returncode != 0:
		raise subprocess.CalledProcessError(psql.returncode, psql.args)

	writer = csv.writer(sys.stdout, lineterminator='\n')
	writer.writerow(('binary', 'expected'))
	writer.writerows((binascii.hexlify(binary).decode('ascii'), expected) for binary, expected in zip(results, tests))


if __name__ == '__main__':
	main()
