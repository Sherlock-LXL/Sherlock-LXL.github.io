import { defineConfig } from 'vite';
import {webContentPlugin} from './scripts/web-content.mjs';
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  publicDir: false,
  resolve:{conditions:['onnxruntime-web-use-extern-wasm','module','browser','development|production']},
  plugins: [webContentPlugin()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  worker:{format:'es'},
  build: {outDir:process.env.AI_LAB_ONLY?'dist-ai-lab':'dist',chunkSizeWarningLimit: 650, rollupOptions: {
    input: process.env.AI_LAB_ONLY?{aiLab:'ai-lab/index.html'}:{home:'index.html',projects:'projects/index.html',world:'world/index.html',jiahui:'jiahui/index.html',aiLab:'ai-lab/index.html'},
    output: {manualChunks:{three:['three']}}
  }}
});
