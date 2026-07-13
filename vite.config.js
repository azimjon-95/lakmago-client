import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Client 5173-portda ishlaydi. /api va /bot so'rovlari backend (4000)ga uzatiladi.
// Backend o'chiq bo'lsa, api/index.js mock ma'lumotga tushadi.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/bot': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
