import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@pixelhub/shared', replacement: resolve(__dirname, '../shared/src/index.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
});
