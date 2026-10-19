import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { pagesHeadersPlugin, parsePagesEnv } from './build/pages';

const root = fileURLToPath(new URL('.', import.meta.url));

// SPA quản trị, build tĩnh lên Cloudflare Pages (admin.ranhduong.vn). `--mode pages` bắt buộc đủ biến VITE_* và sinh _headers (S26).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'pages' ? [vue(), pagesHeadersPlugin(parsePagesEnv(loadEnv(mode, root, 'VITE_')))] : [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
}));
