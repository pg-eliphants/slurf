import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.test.ts'],
        globals: true,
        setupFiles: ['./test/setupTests.ts'],
        coverage: {
            provider: 'v8'
        }
    }
});
