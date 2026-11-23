import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fontScale from './build/postcssFontScale.mjs';

// Client 5173-portda ishlaydi. /api va /bot so'rovlari backend (4000)ga uzatiladi.
// Backend o'chiq bo'lsa, api/index.js mock ma'lumotga tushadi.
// Har build'ga noyob belgi — qurilmadagi katalog keshi (lib/queryPersist.js) yangi deploy'da eskisini ishlatmasin
const APP_BUILD = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`;

/*
 * API boshqa domenda bo'lsa (masalan https://api....), unga ham ulanish HTML bilan birga
 * oldindan ochiladi — birinchi so'rov JS yuklanishini kutib, keyin ulanish ochmaydi.
 */
function apiPreconnect(mode) {
  return {
    name: 'lokma-api-preconnect',
    transformIndexHtml(html) {
      const api = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL || process.env.VITE_API_URL || '';
      let origin = '';
      try { origin = /^https?:\/\//.test(api) ? new URL(api).origin : ''; } catch { origin = ''; }
      if (!origin) return html;
      return html.replace('</head>', `    <link rel="preconnect" href="${origin}" crossorigin />\n  </head>`);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), apiPreconnect(mode)],
  define: { __APP_BUILD__: JSON.stringify(APP_BUILD) },
  css: { postcss: { plugins: [fontScale()] } },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',   // Windows'da localhost (::1) muammosini oldini oladi
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/bot': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
}));
