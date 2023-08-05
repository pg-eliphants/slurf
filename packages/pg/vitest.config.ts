import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.test.ts'],
        globals: true,
        setupFiles: ['./test/setupTests.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html']
        }
    },
    resolve: {
        alias: {
            '@test-helpers': path.join(__dirname, 'lib/test-helpers.ts')
        }
    }
});
