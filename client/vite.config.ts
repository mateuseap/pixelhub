import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Same-origin /colyseus is proxied to the local server in dev, mirroring the
// nginx location used in Docker/Kubernetes.
export default defineConfig({
  resolve: {
    alias: [
      { find: '@pixelhub/shared', replacement: resolve(__dirname, '../shared/src/index.ts') },
      // Ship the official terser-minified Phaser build via a small shim
      // (about 400 kB smaller than re-minifying the readable ESM dist).
      { find: /^phaser$/, replacement: resolve(__dirname, 'src/phaserShim.ts') },
    ],
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
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Phaser in its own chunk: app changes never bust the engine cache.
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
