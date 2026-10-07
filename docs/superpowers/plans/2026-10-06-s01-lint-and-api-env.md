# S01 bổ sung: ESLint và nạp `.env` cho API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thành tiêu chí nghiệm thu S01: lint chạy trong CI cùng typecheck, test, build; `pnpm dev` chạy được cả web và API ở local.

**Architecture:** API dev nạp `apps/api/.env` bằng tuỳ chọn `--env-file` có sẵn của Nest CLI 12 (chuyển thành `node --env-file=.env`). ESLint 10 flat config đặt chung ở `packages/config/eslint.mjs` (xuất `base` cho Node/TS và `vue` cho Vue SFC); mỗi package có `eslint.config.mjs` một dòng và script `lint`; Turborepo có task `lint` với `dependsOn: ["^lint"]` theo hướng dẫn trong `turbo/docs/guides/tools/eslint.mdx`.

**Tech Stack:** ESLint 10, `@eslint/js` 10, typescript-eslint 8 (peer `typescript >=4.8.4 <6.1.0`, khớp TS 6.0.3), eslint-plugin-vue 10 + vue-eslint-parser 10, globals 17, Turborepo 2.11, Nest CLI 12.

**Spec:** `docs/backlog.md` dòng S01 (tiêu chí: "Lint, typecheck, test chạy trên GitHub Actions; một lệnh chạy cả web và API ở local"). Người dùng chốt ngày 2026-10-06: thêm ESLint ngay trong S01, sửa script dev của API để nạp `.env`.

## Global Constraints

- TypeScript giữ `~6.0.3`, không nâng lên 7 (CLAUDE.md, Nguồn chuẩn).
- Thêm thư viện thì ghi một dòng vào `docs/decisions.md`; đổi quyết định thì thêm dòng mới, không xoá dòng cũ (đầu file `docs/decisions.md`).
- Bộ rule: chỉ rule bắt lỗi (`@eslint/js` recommended, typescript-eslint `recommended` không type-aware, eslint-plugin-vue `flat/essential`); không bật rule định dạng, không thêm Prettier.
- Lint phải chặn được `any` và `@ts-ignore` (CLAUDE.md, Nguyên tắc cứng).
- `lint` chạy với `--max-warnings 0` để cảnh báo không tích tụ.
- Không đổi script `start` của API: production lấy biến môi trường từ Docker Compose, không đọc `.env`.
- Code, tên file tiếng Anh; comment tiếng Việt được.
- Commit theo Conventional Commits có ID story, ví dụ `chore: S01 add eslint`. Chỉ `git add` đúng file của task; working tree đang có tài liệu chưa commit của người dùng (`docs/*.md` chưa track, `CLAUDE.md` đã sửa).

## Bảng tiêu chí nghiệm thu

| Tiêu chí S01 | Kiểm ở bước |
| --- | --- |
| Một lệnh chạy cả web và API ở local | Task 1, Step 4 |
| Lint chạy được và chặn lỗi thật | Task 2, Step 6–7 |
| Lint, typecheck, test chạy trên GitHub Actions | Task 3, Step 1 (thêm vào `ci.yml`) và Step 6 (chạy đúng lệnh CI ở local). Lần chạy thật trên GitHub chỉ thấy được sau khi push hoặc mở PR |

## Review Focus

1. Thiếu `apps/api/.env` → `pnpm dev` phải báo lỗi rõ ràng chỉ ra file thiếu, không treo hay báo lỗi khó hiểu. Kiểm ở Task 1, Step 5.
2. ESLint quét thư mục sinh ra (`dist/`, `.nuxt/`, `.output/`) → phải bị bỏ qua. Kiểm ở Task 2, Step 6 (chạy lint sau khi đã build).
3. Import chỉ dùng trong template Vue (`RouterLink`, `RouterView` ở `apps/admin/src/app/App.vue`) → không bị báo `no-unused-vars`. Kiểm ở Task 2, Step 6.
4. Auto-import của Nuxt trong `.vue` (`navigateTo`, `definePageMeta`, `useHead`, `useFetch`) → không bị báo `no-undef`. Kiểm ở Task 2, Step 6.
5. Sửa cấu hình chung `packages/config/eslint.mjs` → cache lint của mọi package phải mất hiệu lực, không được trả kết quả cũ. Kiểm ở Task 2, Step 8.

---

### Task 0: Tạo nhánh

- [ ] **Step 1: Tạo nhánh từ `master` hiện tại**

```bash
git switch -c chore/S01-lint-api-env
```

Expected: `Switched to a new branch 'chore/S01-lint-api-env'`. File chưa commit của người dùng đi theo working tree, không bị mất.

---

### Task 1: API dev nạp `apps/api/.env`

**Files:**
- Modify: `apps/api/package.json` (script `dev`)

**Interfaces:**
- Consumes: `loadEnv()` trong `apps/api/src/config/env.ts` (đọc `process.env`, giữ nguyên)
- Produces: `pnpm dev` khởi động API với biến trong `apps/api/.env`

- [ ] **Step 1: Xác nhận lỗi hiện tại (đã thấy ngày 2026-10-06)**

Với `apps/api/.env` có sẵn và MongoDB đang chạy, `pnpm dev` cho log API:

```text
Error: Biến môi trường không hợp lệ:
- MONGODB_URI: Invalid input: expected string, received undefined
```

Nếu `apps/api/.env` chưa có: `cp .env.example apps/api/.env`. MongoDB: `docker compose up -d mongo redis` (image `minio/minio` hiện không kéo được nên chưa dùng `pnpm infra:up`).

- [ ] **Step 2: Sửa script `dev`**

Trong `apps/api/package.json`:

```json
"dev": "nest start --watch --env-file .env",
```

Nest CLI 12 đổi tuỳ chọn này thành `node --env-file=.env` (`@nestjs/cli/actions/start.action.js`, dòng 130–132). Turbo chạy script với cwd là `apps/api`, nên `.env` trỏ tới `apps/api/.env`. Biến đã có sẵn trong shell không bị `.env` ghi đè (hành vi của Node).

- [ ] **Step 3: Kiểm tra cổng trước khi chạy**

```powershell
Get-NetTCPConnection -LocalPort 3000,3001,5174 -State Listen -ErrorAction SilentlyContinue
```

Expected: không có gì. Nếu cổng 3000 bị app khác chiếm (ngày 2026-10-06 là `banh-mi-daily`), Nuxt sẽ tự chuyển sang 3001 và tranh cổng với API. Khi đó dừng lại và nhờ người dùng tắt app kia; không tự kill tiến trình của project khác.

- [ ] **Step 4: Chạy `pnpm dev` và gọi thử (tiêu chí "một lệnh chạy cả web và API")**

```bash
pnpm dev
# ở terminal khác, khi log có "API chạy tại http://localhost:3001/v1/health":
curl -s http://localhost:3001/v1/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/da-lat
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5174/
```

Expected:
- `{"status":"ok","db":"up","time":"..."}`
- `200`
- `200`

Dừng `pnpm dev`. Trên Windows, dừng turbo có thể để lại tiến trình con: kiểm tra lại cổng 3000/3001/5174 bằng lệnh ở Step 3 và chỉ dừng tiến trình có command line nằm trong thư mục `ranhduong`.

- [ ] **Step 5: Review Focus 1 — thiếu `.env`**

```bash
mv apps/api/.env apps/api/.env.bak
pnpm --filter @ranhduong/api dev
```

Expected: tiến trình node dừng với thông báo chứa `.env: not found`. Dừng lệnh, rồi khôi phục:

```bash
mv apps/api/.env.bak apps/api/.env
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json
git commit -m "fix: S01 load apps/api/.env in api dev script"
```

---

### Task 2: ESLint dùng chung và task `lint`

**Files:**
- Create: `packages/config/eslint.mjs`
- Modify: `packages/config/package.json`
- Create: `apps/web/eslint.config.mjs`, `apps/admin/eslint.config.mjs`, `apps/api/eslint.config.mjs`, `packages/contracts/eslint.config.mjs`, `packages/geo/eslint.config.mjs`
- Modify: `package.json` của `apps/web`, `apps/admin`, `apps/api`, `packages/contracts`, `packages/geo` (script `lint`, devDependencies)
- Modify: `package.json` gốc (script `lint`), `turbo.json` (task `lint`), `pnpm-lock.yaml`

**Interfaces:**
- Consumes: không có
- Produces: module `@ranhduong/config/eslint` xuất `base` (Node/TS) và `vue` (base + Vue SFC), kiểu `import('eslint').Linter.Config[]`; script `lint` trong 5 package; `pnpm lint` = `turbo run lint`

- [ ] **Step 1: Cài thư viện**

```bash
pnpm --filter @ranhduong/config add eslint@^10 @eslint/js@^10 typescript-eslint@^8 eslint-plugin-vue@^10 vue-eslint-parser@^10 globals@^17
pnpm --filter @ranhduong/config add -D typescript@~6.0.3
pnpm --filter @ranhduong/web --filter @ranhduong/admin add -D eslint@^10 "@ranhduong/config@workspace:*"
pnpm --filter @ranhduong/api --filter @ranhduong/contracts --filter @ranhduong/geo add -D eslint@^10
```

`vue-eslint-parser` là peer bắt buộc của eslint-plugin-vue 10 nên khai báo rõ. `typescript` trong `packages/config` để peer của typescript-eslint dùng đúng bản 6.0. Expected: cài xong không lỗi peer. Nếu pnpm từ chối một bản vì chính sách tuổi phát hành, để pnpm chọn bản cũ hơn trong cùng dải `^`; không thêm vào `minimumReleaseAgeExclude`.

- [ ] **Step 2: Viết cấu hình chung `packages/config/eslint.mjs`**

```js
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
    // TypeScript và auto-import của Nuxt lo tên chưa khai báo, như typescript-eslint khuyên cho file .ts.
    rules: { 'no-undef': 'off' },
  },
  {
    // Tên file trang và component gốc theo quy ước Nuxt/Vue Router (index.vue, app.vue, App.vue).
    files: ['**/pages/**/*.vue', '**/app.vue', '**/App.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
]);
```

- [ ] **Step 3: Khai báo export của `packages/config`**

`packages/config/package.json` (giữ phần `dependencies`/`devDependencies` mà Step 1 đã thêm):

```json
{
  "name": "@ranhduong/config",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./tsconfig.base.json": "./tsconfig.base.json",
    "./eslint": "./eslint.mjs"
  },
  "files": ["tsconfig.base.json", "eslint.mjs"]
}
```

Các `tsconfig.json` đang `extends` bằng đường dẫn tương đối (`../../packages/config/tsconfig.base.json`) nên không bị `exports` ảnh hưởng; vẫn khai báo `./tsconfig.base.json` cho chắc.

- [ ] **Step 4: Thêm `eslint.config.mjs` cho từng package**

`apps/web/eslint.config.mjs` và `apps/admin/eslint.config.mjs`:

```js
import { vue } from '@ranhduong/config/eslint';

export default vue;
```

`apps/api/eslint.config.mjs`, `packages/contracts/eslint.config.mjs`, `packages/geo/eslint.config.mjs`:

```js
import { base } from '@ranhduong/config/eslint';

export default base;
```

Dùng `.mjs` ở mọi nơi vì `apps/api` không có `"type": "module"`.

- [ ] **Step 5: Thêm script và task**

Trong `scripts` của 5 package (`apps/web`, `apps/admin`, `apps/api`, `packages/contracts`, `packages/geo`):

```json
"lint": "eslint . --max-warnings 0"
```

`package.json` gốc, thêm vào `scripts`:

```json
"lint": "turbo run lint",
```

`turbo.json`, thêm vào `tasks`:

```json
"lint": { "dependsOn": ["^lint"] },
```

`^lint` làm cache lint của package mất hiệu lực khi `@ranhduong/config` đổi, dù `config` không có script `lint` (theo `turbo/docs/guides/tools/eslint.mdx`).

- [ ] **Step 6: Chạy lint trên code hiện có (Review Focus 2, 3, 4)**

```bash
pnpm build
pnpm lint --force
```

Expected: `Tasks: 5 successful, 5 total`, không có lỗi hay cảnh báo nào. Cụ thể:
- không có đường dẫn nào trong `dist/`, `.nuxt/`, `.output/` xuất hiện trong output (Review Focus 2);
- `apps/admin/src/app/App.vue` không bị báo `RouterLink`/`RouterView` unused (Review Focus 3);
- `apps/web/app/pages/**/*.vue` không bị báo `no-undef` cho `navigateTo`, `definePageMeta`, `useHead`, `useFetch` (Review Focus 4).

Nếu có lỗi trên code thật: sửa code nếu đó là lỗi thật; nếu là rule không hợp với quy ước của repo thì dừng lại và hỏi người dùng trước khi tắt rule.

- [ ] **Step 7: Kiểm tra lint chặn được lỗi thật (đỏ rồi xanh)**

Tạo tạm `packages/geo/src/lint-probe.ts`:

```ts
// @ts-ignore
export const probe: any = 1;
```

```bash
pnpm --filter @ranhduong/geo lint
```

Expected: FAIL, exit khác 0, có `@typescript-eslint/ban-ts-comment` và `@typescript-eslint/no-explicit-any`.

Tạo tạm `apps/admin/src/pages/Probe.vue`:

```vue
<template>
  <div v-if="true" v-for="i in 3" :key="i" />
</template>
```

```bash
pnpm --filter @ranhduong/admin lint
```

Expected: FAIL, có `vue/no-use-v-if-with-v-for` (rule của `flat/essential`; chứng tỏ Vue SFC có được lint).

Xoá cả hai file tạm, chạy lại:

```bash
rm packages/geo/src/lint-probe.ts apps/admin/src/pages/Probe.vue
pnpm --filter @ranhduong/geo --filter @ranhduong/admin lint
```

Expected: PASS.

- [ ] **Step 8: Review Focus 5 — đổi cấu hình chung làm mất cache**

```bash
pnpm lint            # lần 2: cả 5 task "cache hit"
```

Thêm tạm một dòng comment vào cuối `packages/config/eslint.mjs`, rồi:

```bash
pnpm lint
```

Expected: cả 5 task `cache miss`. Bỏ dòng comment tạm.

- [ ] **Step 9: Commit**

```bash
git add packages/config/eslint.mjs packages/config/package.json \
  apps/web/eslint.config.mjs apps/admin/eslint.config.mjs apps/api/eslint.config.mjs \
  packages/contracts/eslint.config.mjs packages/geo/eslint.config.mjs \
  apps/web/package.json apps/admin/package.json apps/api/package.json \
  packages/contracts/package.json packages/geo/package.json \
  package.json turbo.json pnpm-lock.yaml
git commit -m "chore: S01 add eslint with shared flat config"
```

---

### Task 3: Lint trong CI và cập nhật tài liệu

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/decisions.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`

**Interfaces:**
- Consumes: script `lint` và task turbo `lint` từ Task 2
- Produces: lệnh CI `pnpm turbo run lint typecheck test build`

- [ ] **Step 1: CI chạy lint**

Dòng cuối `.github/workflows/ci.yml`:

```yaml
      - run: pnpm turbo run lint typecheck test build
```

- [ ] **Step 2: `docs/decisions.md`** — thêm một dòng cuối bảng, giữ nguyên dòng "Chưa cấu hình ESLint":

```markdown
| 2026-10-06 | ESLint 10 (flat config) + typescript-eslint 8 + eslint-plugin-vue 10, cấu hình chung ở `packages/config/eslint.mjs`; CI chạy `lint` cùng typecheck, test, build | Tiêu chí nghiệm thu S01; thay cho dòng "Chưa cấu hình ESLint". Chỉ bật rule bắt lỗi (chặn `any`, `@ts-ignore`), không bật rule định dạng, chưa dùng Prettier |
```

- [ ] **Step 3: `CLAUDE.md`**

- Bảng cấu trúc, dòng `packages/config`: `` `tsconfig.base.json` và cấu hình ESLint (`eslint.mjs`) dùng chung (strict, `noUncheckedIndexedAccess`) ``
- Khối lệnh gốc: thêm `pnpm lint                             # turbo run lint (ESLint)`; đổi dòng CI thành `pnpm turbo run lint typecheck test build   # CI chạy đúng lệnh này; phải xanh trước khi commit`.
- Bảng script theo package: thêm `lint` cho web, admin, api, contracts, geo.
- Thay dòng `- **Chưa có lint**: repo chưa cấu hình ESLint hay Prettier (xem `docs/decisions.md`).` bằng `- **Lint**: ESLint chạy ở web, admin, api, contracts, geo với cấu hình chung `packages/config/eslint.mjs`; chưa có Prettier (xem `docs/decisions.md`).`
- Vùng TDD: `typecheck, lint (khi đã có)` → `typecheck, lint`.
- Mục Lệnh, sau `cp .env.example apps/api/.env`: comment thành `# API dev nạp file này qua --env-file; sửa giá trị nếu cần`.

- [ ] **Step 4: `AGENTS.md`** (phần ngoài khối `turborepo-agent-rules`)

- `- \`pnpm build\`, \`pnpm typecheck\`, \`pnpm test\`: run workspace tasks.` → thêm `pnpm lint`.
- `- \`pnpm turbo run typecheck test build\`: required pre-commit checks; also run in CI.` → `pnpm turbo run lint typecheck test build`.
- `ESLint and Prettier are not configured.` → `ESLint uses the shared flat config in \`packages/config/eslint.mjs\` (error-catching rules only); Prettier is not configured.`
- Dòng `pnpm dev` → thêm `; the API reads \`apps/api/.env\``.

- [ ] **Step 5: `README.md`**

`Kiểm tra trước khi đẩy code: \`pnpm turbo run typecheck test build\`.` → `pnpm turbo run lint typecheck test build`.

- [ ] **Step 6: Chạy đúng lệnh CI, không dùng cache**

```bash
pnpm install --frozen-lockfile
pnpm turbo run lint typecheck test build --force
```

Expected: exit 0; `Tasks: 15 successful, 15 total` (5 lint, 3 typecheck, 2 test, 5 build); contracts 4 test pass, geo 7 test pass.

- [ ] **Step 7: Chạy lại `pnpm dev`** theo Task 1, Step 3–4. Expected như Task 1, Step 4.

- [ ] **Step 8: Commit**

`CLAUDE.md` đang có thay đổi chưa commit của người dùng từ trước. Trước khi commit, hỏi người dùng có gộp các thay đổi đó vào commit này không; nếu không, chỉ stage phần của Task 3 bằng `git add -p CLAUDE.md`.

```bash
git add .github/workflows/ci.yml docs/decisions.md AGENTS.md README.md CLAUDE.md \
  docs/superpowers/plans/2026-10-06-s01-lint-and-api-env.md
git commit -m "chore: S01 run lint in CI and document it"
```

---

## Ngoài phạm vi (ghi lại để hỏi sau)

- `pnpm infra:up` lỗi `pull access denied for minio/minio`: cần đổi image MinIO trước S06.
- `docs/backlog.md` ghi S01 "Chưa làm" trong khi `CLAUDE.md` ghi "Xong: S01": người dùng quyết định cập nhật bên nào.
- Lint ranh giới lớp FSD (chặn import ngược lớp) chưa có trong bộ rule này.
- `apps/web` vẫn chưa có script `typecheck` (Nuxt cần `nuxi typecheck` + `vue-tsc`).
