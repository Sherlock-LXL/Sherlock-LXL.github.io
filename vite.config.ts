import { defineConfig } from 'vite';
import {webContentPlugin} from './scripts/web-content.mjs';
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  publicDir: false,
  plugins: [webContentPlugin()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 650, rollupOptions: {
    input: {home:'index.html',projects:'projects/index.html',world:'world/index.html'},
    output: {manualChunks:{three:['three']}}
  }}
});
