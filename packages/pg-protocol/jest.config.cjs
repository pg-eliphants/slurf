const testRegex = [];

const collectCoverageFrom = ['src/**/*.ts'];

module.exports = {
    automock: false,
    collectCoverage: true,
    maxWorkers: 1,
    collectCoverageFrom,
    coveragePathIgnorePatterns: ['node_modules', 'test', 'doc.ts'],
    coverageDirectory: 'coverage',
    //coverageProvider: 'babel', //"v8" is still experimental, but use "v8" for walk through debugging
    coverageProvider: 'v8', //"v8" is still experimental, but use "v8" for walk through debugging
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    cacheDirectory: '.jest-cache',
    testPathIgnorePatterns: ['/esm/', '/commonjs/', '/types/'],
    //testMatch: ['**/__tests__/**/*.[t]s?(x)', '**/?(*.)+(spec|test).[t]s?(x)'],
    testRegex,
    transform: {
        '\\.test\\.ts$': [
            'ts-jest',
            {
                compiler: 'typescript',
                tsconfig: 'tsconfig.json',
                diagnostics: {
                    ignoreCodes: [151001]
                }
            }
        ]
    },
    moduleNameMapper: {},
    setupFiles: [],
    setupFilesAfterEnv: ['<rootDir>/src/testing/test-buffers.ts']
};
