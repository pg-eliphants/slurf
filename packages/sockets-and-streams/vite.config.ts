/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config';

import path from 'path';
import http from 'node:http';

export default defineConfig({
    test: {
        setupFiles: ['./vite.test.setup.ts'],
        testTimeout: 1e9,
        globals: true,
        include: ['**/src/io/__tests__/jitter.test.ts', '**/__tests__/Pipe.test.ts'],
        exclude: [...configDefaults.exclude]
        // ...
    }
});
