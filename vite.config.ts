import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

export default defineConfig({
  root: 'src/renderer',
  publicDir: path.resolve(__dirname, 'resources/public'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: path.resolve(__dirname, 'src/main/index.ts'),
        vite: {
          resolve: {
            alias: { '@shared': path.resolve(__dirname, 'src/shared') },
          },
          build: {
            outDir: path.resolve(__dirname, 'dist-electron/main'),
            rollupOptions: {
              external: ['electron-store', 'electron-log', 'electron-updater'],
            },
          },
        },
      },
      preload: {
        input: path.resolve(__dirname, 'src/preload/index.ts'),
        vite: {
          resolve: {
            alias: { '@shared': path.resolve(__dirname, 'src/shared') },
          },
          build: {
            outDir: path.resolve(__dirname, 'dist-electron/preload'),
            rollupOptions: {
              // Sandboxed preload scripts (webPreferences.sandbox: true, set in
              // src/main/index.ts) must be CommonJS — Electron doesn't support
              // ESM preload under the sandbox — so force .js/cjs output even
              // though the rest of the project is "type": "module".
              output: {
                format: 'cjs',
                entryFileNames: 'index.js',
              },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
