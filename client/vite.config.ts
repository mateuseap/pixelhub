import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Same-origin /colyseus is proxied to the local server in dev, mirroring the
// nginx location used in Docker/Kubernetes.
export default defineConfig({
  resolve: {
    alias: {
      '@pixelhub/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/colyseus': {
        target: 'http://localhost:2567',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/colyseus/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1800,
  },
});
