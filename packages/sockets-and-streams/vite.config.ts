/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config';

import path from 'path';
import http from 'node:http';

export default defineConfig({
    test: {
        setupFiles: ['./vite.test.setup.ts'],
        testTimeout: 1e9,
        globals: true,
        include: ['**/src/protocol/messages/front/__tests__/Parse.test.ts', '**/src/io/__tests__/jitter.test.ts', '**/src/utils/__tests__/List.test.ts'],        exclude: [...configDefaults.exclude]
        // ...
    }
});
