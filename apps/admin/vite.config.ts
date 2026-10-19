import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { pagesDefine, pagesHeadersPlugin, parsePagesEnv } from './build/pages';

const root = fileURLToPath(new URL('.', import.meta.url));

// SPA quản trị, build tĩnh lên Cloudflare Pages (admin.ranhduong.vn). `--mode pages` bắt buộc đủ biến VITE_*,
// đưa giá trị đã chuẩn hoá vào bundle và sinh _headers (S26).
export default defineConfig(({ mode }) => {
  const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };
  if (mode !== 'pages') return { plugins: [vue()], resolve: { alias } };
  const env = parsePagesEnv(loadEnv(mode, root, 'VITE_'));
  return { plugins: [vue(), pagesHeadersPlugin(env)], define: pagesDefine(env), resolve: { alias } };
});
