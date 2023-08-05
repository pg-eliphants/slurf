#!/usr/bin/env python3
import binascii
import csv
import os.path
import re
import struct
import subprocess
import sys


HEADER = b'PGCOPY\n\xff\r\n\0\0\0\0\0\0\0\0\0'
TEST = re.compile(r'[0-9a-f]+$')


def main():
	tests = []

	with open(os.path.join(os.path.dirname(__file__), 'binary.in'), 'r') as f:
		for line in f:
			if line.isspace() or line.startswith('#'):
				continue

			if not TEST.match(line):
				raise ValueError(f'Invalid test: {line!r}')

			tests.append(line.rstrip())

	tests.append('ffff7fff00000000' + '2345' * 0xffff)

	query = 'CREATE TEMPORARY TABLE t (x numeric); COPY t FROM STDIN (FORMAT binary); COPY t TO STDOUT'

	with subprocess.Popen(['psql', '--set=ON_ERROR_STOP=1', '-c', query], stdin=subprocess.PIPE, stdout=subprocess.PIPE) as psql:
		psql.stdin.write(HEADER)

		for test in tests:
			test_binary = binascii.unhexlify(test)
			psql.stdin.write(b'\x00\x01' + struct.pack('>i', len(test_binary)) + test_binary)

		psql.stdin.write(b'\xff\xff')
		psql.stdin.close()

		results = [line.rstrip().decode('ascii') for line in psql.stdout]

	if psql.returncode != 0:
		raise subprocess.CalledProcessError(psql.returncode, psql.args)

	writer = csv.writer(sys.stdout, lineterminator='\n')
	writer.writerow(('binary', 'expected'))
	writer.writerows((binary, expected) for binary, expected in zip(tests, results))


if __name__ == '__main__':
	main()
