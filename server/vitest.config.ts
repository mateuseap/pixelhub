import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@pixelhub/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // Colyseus test server binds a port; keep runs serial.
    fileParallelism: false,
  },
});
