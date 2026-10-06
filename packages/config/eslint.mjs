// Cấu hình ESLint dùng chung (flat config). Chỉ bật rule bắt lỗi, không bật rule định dạng.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** API, package Node và file cấu hình. Chặn `any` và `@ts-ignore` qua typescript-eslint recommended. */
export const base = defineConfig([
  globalIgnores(['**/dist/', '**/.output/', '**/.nuxt/', '**/.turbo/', '**/coverage/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
]);

/** Web (Nuxt) và admin (Vue + Vite): thêm Vue SFC. */
export const vue = defineConfig([
  base,
  pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
      globals: { ...globals.browser },
    },
    // Tắt các rule lõi mà TypeScript đã kiểm (như typescript-eslint làm cho file .ts), kể cả `no-undef` cho auto-import của Nuxt.
    rules: { ...tseslint.configs.eslintRecommended.rules },
  },
  {
    // Tên file trang, layout, error.vue và component gốc theo quy ước Nuxt/Vue Router (index.vue, default.vue, error.vue, app.vue, App.vue).
    files: ['**/pages/**/*.vue', '**/layouts/**/*.vue', '**/error.vue', '**/app.vue', '**/App.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
]);
