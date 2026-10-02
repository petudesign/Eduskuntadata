import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  server: { host: '127.0.0.1', port: 5174, strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: { outDir: 'dist', emptyOutDir: true },
});
