import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
            // 'server-only' throws outside a React Server environment; it is a no-op in tests
            'server-only': path.resolve(__dirname, 'tests/server-only-stub.ts'),
        },
    },
    test: { include: ['tests/**/*.test.ts'] },
});
