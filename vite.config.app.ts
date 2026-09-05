// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

import viteGlslify from './plugins/viteGlslify';

export default defineConfig({
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@desktop': path.resolve(__dirname, 'src/desktop'),
      '@mobile': path.resolve(__dirname, 'src/mobile'),
      '@testable': path.resolve(__dirname, 'testable'),
    },
  },
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: [path.resolve(__dirname)],
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite'),
  optimizeDeps: {
    entries: [path.resolve(__dirname, 'src/**/*.ts')],
  },
  plugins: [basicSsl(), wasm(), viteGlslify()],
});
