all: test/binary.csv test/decimal.csv

test/binary.csv: test/binary.in test/binary.py
	test/binary.py $< > $@

test/decimal.csv: test/decimal.in test/decimal.py
	test/decimal.py $< > $@

.PHONY: all
