# S26 Admin trên Cloudflare Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa `apps/admin` lên Cloudflare Pages (`main` → admin staging, tag `v*` → `admin.ranhduong.vn`) với header bảo mật, cấu hình build bắt buộc và khôi phục khi tải trang lỗi sau deploy hoặc khi phiên Access hết hạn; chặn cấu hình `WEB_ORIGINS` sai ở API.

**Architecture:** Phần lớn tiêu chí S26 đã có từ các story trước (app FSD, CORS/Origin ở `app.setup.ts`, thanh bên S28). Plan này thêm phần còn thiếu: chế độ build `pages` đọc biến `VITE_*` qua Zod và sinh `_headers` (CSP theo đúng origin API/ảnh/upload/bản đồ) bằng một Vite plugin; bỏ `_redirects` vì Pages tự fallback SPA khi không có `404.html`; job `deploy-admin` trong CI chạy `wrangler pages deploy` sau khi `check` xanh; router tải lại một lần khi chunk không tải được. Cloudflare Access giữ nguyên cách cấu hình ở `docs/runbooks/admin-login.md` mục 3.

**Tech Stack:** Vue 3, Vite 8, Vue Router 5, Zod 4, Vitest 5, NestJS (API env), GitHub Actions, Wrangler 4.147.0 qua `pnpm dlx` (không thêm vào package.json).

**Spec:** `docs/backlog.md` S26; `docs/decisions/0004-admin-spa-on-cloudflare-pages.md`; `docs/architecture.md` mục 2–3; `docs/technical-design.md` mục 13 (CSP, CI/CD); `docs/ui-spec.md` mục 12; `docs/runbooks/admin-login.md` (Access, biến theo môi trường); `docs/runbooks/photo-upload.md` (CORS bucket upload).

## Tiêu chí nghiệm thu ↔ bước kiểm

| Tiêu chí S26 | Hiện trạng | Kiểm ở |
| --- | --- | --- |
| `apps/admin` (Vue 3 + Vite, FSD) | Đã có | Task 5 Step 6 (lint/typecheck/test/build toàn repo) |
| Build tĩnh lên Cloudflare Pages tại `admin.ranhduong.vn` | Chưa có đường deploy | Task 2 (build `pages`, `_headers`), Task 4 (job deploy), Task 5 Step 1–4 (chạy bản build trên `wrangler pages dev`). Deploy thật và gắn domain: runbook Task 5, **chờ S02 và chủ dự án tạo dự án Pages/token** |
| Cloudflare Access chỉ cho email được phép | Runbook đã có (admin-login.md §3) | Task 5 Step 5 nối runbook với hostname staging; thử thật **chờ S02** |
| API CORS có credentials cho `ranhduong.vn`, `admin.ranhduong.vn`, kiểm Origin cùng danh sách | Đã có, có test (`testing/app.test.ts`, `auth.http.test.ts`) | Task 1 chặn giá trị `WEB_ORIGINS` không phải origin |
| Layout thanh bên theo Spec UI mục 12 | Đã có từ S28 | Task 5 Step 4 (chụp 1440px và 390px trên bản Pages) |

## Global Constraints

- Node 24 (`.nvmrc`), pnpm 12.9.1; TypeScript strict, không `any`, không `@ts-ignore`; không nâng TypeScript lên 7.
- Không thêm dependency vào package.json. Wrangler chỉ chạy qua `pnpm dlx wrangler@4.147.0` (bản 2/10/2026, đủ 2 tuần tuổi); ghi một dòng vào `docs/decisions.md`.
- Chữ hiển thị tiếng Việt theo giọng Spec UI mục 3; class `rd-…` có sẵn (`rd-callout rd-callout--bad`, `rd-btn rd-btn--outline`); không hard-code màu; nút cao 44px theo `admin.css`.
- Dự án Pages dùng nhánh production tên `production`; deploy từ `main` dùng `--branch=main` (alias `main.<project>.pages.dev`, gắn `admin.staging.ranhduong.vn`); tag `v*` dùng `--branch=production`.
- Không commit secret. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` chỉ nằm trong GitHub secrets.
- Nhánh `feat/S26-admin-pages`; commit Conventional Commits có `S26`.
- Không đổi route admin hay route công khai của web.

## Review Focus

1. **Biến GitHub chưa đặt thành chuỗi rỗng:** `${{ vars.X }}` chưa đặt cho ra `''`. `VITE_MAP_STYLE_URL=''` phải dùng style mặc định, không truyền `''` cho MapLibre (Task 2: test `parsePagesEnv` + đổi `??` thành `||` trong `shared/config`).
2. **Thiếu `VITE_API_BASE` khi deploy:** build `pages` phải dừng và nêu tên biến, không lặng lẽ build bản trỏ `http://localhost:3101` (Task 2: test + Step 6).
3. **`WEB_ORIGINS` gõ sai** (`https://admin.ranhduong.vn/`, chữ hoa, có đường dẫn, `*`): chuẩn hoá được thì chuẩn hoá, không được thì API dừng khi khởi động với lỗi nêu `WEB_ORIGINS` (Task 1).
4. **Admin đang mở khi có bản deploy mới hoặc phiên Access hết hạn:** chuyển trang làm hỏng tải chunk; phải tải lại đúng trang đích một lần, không lặp vô hạn, và hiện thông báo có nút Tải lại nếu vẫn lỗi (Task 3: test `claimChunkReload`; Task 5 Step 4 thử thật).
5. **CSP chặn chức năng thật** (bản đồ MapLibre, ảnh, upload presigned, font): không có vi phạm CSP trên đăng nhập, danh sách, form địa điểm có bản đồ và upload, lịch trình (Task 2 test chuỗi CSP; Task 5 Step 4 xem console).

---

### Task 1: API chỉ nhận `WEB_ORIGINS` là origin chính xác

**Files:**
- Modify: `apps/api/src/config/env.ts` (khối `WEB_ORIGINS`)
- Test: `apps/api/src/config/env.test.ts`

**Interfaces:**
- Produces: `Env['WEB_ORIGINS']` vẫn là `string[]`, mỗi phần tử là `new URL(x).origin` (không có `/` cuối, host chữ thường). `configureApp` và `OriginGuard` không đổi.

- [ ] **Step 1: Tạo nhánh**

```bash
git switch -c feat/S26-admin-pages
```

- [ ] **Step 2: Viết test đỏ** trong `describe('loadEnv')`, dùng hằng `REQUIRED` có sẵn trong file:

```ts
it('S26 WEB_ORIGINS chỉ nhận origin http(s), bỏ dấu / cuối và chữ hoa', () => {
  expect(loadEnv({ ...REQUIRED, WEB_ORIGINS: 'https://ranhduong.vn/, https://Admin.ranhduong.vn' }).WEB_ORIGINS)
    .toEqual(['https://ranhduong.vn', 'https://admin.ranhduong.vn']);
  for (const bad of ['https://admin.ranhduong.vn/dang-nhap', '*', 'admin.ranhduong.vn', 'ftp://ranhduong.vn', 'https://ranhduong.vn?x=1', ' , ']) {
    expect(() => loadEnv({ ...REQUIRED, WEB_ORIGINS: bad }), bad).toThrow(/WEB_ORIGINS/);
  }
});
```

- [ ] **Step 3: Chạy để thấy đỏ**

Run: `pnpm --filter @ranhduong/api exec vitest run src/config/env.test.ts`
Expected: FAIL ở test S26 (giá trị chưa chuẩn hoá, giá trị sai không ném lỗi).

- [ ] **Step 4: Sửa schema `WEB_ORIGINS`** trong `env.ts`: sau `transform(csv)`, pipe sang `z.array(...)` có `.min(1)`; mỗi phần tử parse bằng `new URL`, chỉ nhận `http:`/`https:`, `pathname === '/'`, không `search`, `hash`, `username`, `password`, rồi trả `url.origin`. Thông báo lỗi: `Mỗi nguồn phải là origin http(s), ví dụ https://admin.ranhduong.vn`. Giữ nguyên mặc định `http://localhost:3100,http://localhost:5174`.

- [ ] **Step 5: Chạy lại test env và toàn bộ test API**

Run: `pnpm --filter @ranhduong/api exec vitest run src/config/env.test.ts` → PASS.
Run: `pnpm infra:up` rồi `pnpm --filter @ranhduong/api test` và `pnpm --filter @ranhduong/api typecheck` → PASS (các test HTTP dùng `http://admin.gia-lap.example`, vẫn là origin hợp lệ).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/src/config/env.test.ts
git commit -m "fix: S26 validate WEB_ORIGINS as exact origins"
```

---

### Task 2: Build `pages` có biến bắt buộc và `_headers` sinh từ cấu hình

**Files:**
- Create: `apps/admin/build/pages.ts`, `apps/admin/build/pages.test.ts`
- Create: `apps/admin/src/shared/config/defaults.ts`
- Modify: `apps/admin/src/shared/config/index.ts`, `apps/admin/vite.config.ts`, `apps/admin/package.json` (script), `apps/admin/tsconfig.json` (`include` thêm `build/**/*.ts`), `apps/admin/vitest.config.ts` (`include` thêm `build/**/*.test.ts`), `apps/admin/src/env.d.ts` (thêm `VITE_UPLOAD_ORIGIN?`)
- Delete: `apps/admin/public/_redirects`

**Interfaces:**
- Produces (`apps/admin/src/shared/config/defaults.ts`): `export const DEFAULT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'`. File này không đọc `import.meta.env` để `vite.config.ts` (Node) import được.
- Produces (`apps/admin/build/pages.ts`):
  - `interface PagesEnv { apiBase: string; webBase: string; mediaBase: string; mapStyleUrl: string; uploadOrigin: string }`
  - `parsePagesEnv(source: Record<string, string | undefined>): PagesEnv` — đọc `VITE_API_BASE`, `VITE_WEB_BASE`, `VITE_MEDIA_BASE` (bắt buộc, URL http(s) tuyệt đối, bỏ `/` cuối), `VITE_MAP_STYLE_URL` (tuỳ chọn, mặc định `DEFAULT_MAP_STYLE_URL`), `VITE_UPLOAD_ORIGIN` (tuỳ chọn, mặc định `https://*.r2.cloudflarestorage.com`, phải khớp `^https?://(\*\.)?[a-z0-9.-]+(:\d+)?$`). Chuỗi rỗng/chỉ khoảng trắng coi như chưa đặt. Sai thì `throw new Error('Thiếu hoặc sai biến build cho Cloudflare Pages:\n- <TÊN_BIẾN>: <lý do>…')`, liệt kê mọi biến sai.
  - `pagesHeaders(env: PagesEnv): string` — nội dung file `_headers`.
  - `pagesHeadersPlugin(env: PagesEnv): Plugin` (từ `vite`) — `generateBundle` gọi `this.emitFile({ type: 'asset', fileName: '_headers', source: pagesHeaders(env) })`.
- Produces (`apps/admin/package.json`): script `"build:pages": "vite build --mode pages"`.

`pagesHeaders` cho ra đúng thứ tự sau, `{x}` là origin của URL tương ứng, danh sách nguồn bỏ trùng giữ thứ tự xuất hiện đầu:

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: {media}; connect-src 'self' {api} {upload} {mapStyle} https://tiles.openfreemap.org; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  X-Robots-Tag: noindex, nofollow
```

Không đặt `Cache-Control`: mặc định của Pages (`max-age=0, must-revalidate` + ETag) đúng với "admin không cache" ở architecture mục 3, và tránh lưu nhầm HTML fallback dưới URL chunk.

- [ ] **Step 1: Viết test đỏ** `apps/admin/build/pages.test.ts`:

```ts
const STAGING = {
  VITE_API_BASE: 'https://api.staging.ranhduong.vn/v1',
  VITE_WEB_BASE: 'https://staging.ranhduong.vn/',
  VITE_MEDIA_BASE: 'https://media.staging.ranhduong.vn/',
};

it('thiếu biến bắt buộc thì dừng và nêu đủ tên biến', () => {
  expect(() => parsePagesEnv({})).toThrow(/VITE_API_BASE[\s\S]*VITE_WEB_BASE[\s\S]*VITE_MEDIA_BASE/);
  expect(() => parsePagesEnv({ ...STAGING, VITE_API_BASE: '   ' })).toThrow(/VITE_API_BASE/);
  expect(() => parsePagesEnv({ ...STAGING, VITE_MEDIA_BASE: 'media.ranhduong.vn' })).toThrow(/VITE_MEDIA_BASE/);
  expect(() => parsePagesEnv({ ...STAGING, VITE_UPLOAD_ORIGIN: 'https://x.r2.cloudflarestorage.com/bucket' })).toThrow(/VITE_UPLOAD_ORIGIN/);
});

it('biến tuỳ chọn để trống (biến GitHub chưa đặt) thì dùng mặc định; bỏ / cuối', () => {
  expect(parsePagesEnv({ ...STAGING, VITE_MAP_STYLE_URL: '', VITE_UPLOAD_ORIGIN: '' })).toEqual({
    apiBase: 'https://api.staging.ranhduong.vn/v1',
    webBase: 'https://staging.ranhduong.vn',
    mediaBase: 'https://media.staging.ranhduong.vn',
    mapStyleUrl: DEFAULT_MAP_STYLE_URL,
    uploadOrigin: 'https://*.r2.cloudflarestorage.com',
  });
});

it('_headers: CSP chỉ mở đúng origin cần, không eval, chặn index và nhúng khung', () => {
  const text = pagesHeaders(parsePagesEnv(STAGING));
  expect(text.startsWith('/*\n')).toBe(true);
  expect(text).toContain("connect-src 'self' https://api.staging.ranhduong.vn https://*.r2.cloudflarestorage.com https://tiles.openfreemap.org;");
  expect(text).toContain("img-src 'self' data: blob: https://media.staging.ranhduong.vn;");
  expect(text).toContain("script-src 'self';");
  expect(text).toContain("frame-ancestors 'none'");
  expect(text).not.toContain('unsafe-eval');
  expect(text).toContain('  X-Robots-Tag: noindex, nofollow\n');
  expect(text).not.toMatch(/Cache-Control/i);
  for (const line of text.split('\n')) expect(line.length).toBeLessThan(2000);
});

it('style bản đồ ở domain khác thì thêm origin đó vào connect-src', () => {
  const text = pagesHeaders(parsePagesEnv({ ...STAGING, VITE_MAP_STYLE_URL: 'https://staging.ranhduong.vn/maps/notebook/style.json' }));
  expect(text).toContain("connect-src 'self' https://api.staging.ranhduong.vn https://*.r2.cloudflarestorage.com https://staging.ranhduong.vn https://tiles.openfreemap.org;");
});
```

- [ ] **Step 2: Thêm `build/**/*.test.ts` vào `vitest.config.ts`, `build/**/*.ts` vào `tsconfig.json`, chạy để thấy đỏ**

Run: `pnpm --filter @ranhduong/admin exec vitest run build/pages.test.ts`
Expected: FAIL vì `./pages` chưa có.

- [ ] **Step 3: Viết `defaults.ts` và `build/pages.ts`** theo Interfaces ở trên (Zod cho `parsePagesEnv`).

- [ ] **Step 4: Chạy test**

Run: `pnpm --filter @ranhduong/admin exec vitest run build/pages.test.ts` → PASS.

- [ ] **Step 5: Nối vào app và build**
  - `vite.config.ts`: `defineConfig(({ mode }) => …)`; chỉ khi `mode === 'pages'` thì `parsePagesEnv(loadEnv(mode, <thư mục apps/admin>, 'VITE_'))` và thêm `pagesHeadersPlugin(env)` sau `vue()`. Chế độ khác giữ nguyên như hiện tại.
  - `shared/config/index.ts`: `MAP_STYLE_URL` dùng `import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_MAP_STYLE_URL`; `MEDIA_BASE`, `WEB_BASE` cũng đổi `??` thành `||` (chuỗi rỗng coi như chưa đặt).
  - `env.d.ts`: thêm `readonly VITE_UPLOAD_ORIGIN?: string` có comment "Chỉ dùng lúc build `pages` để mở CSP cho URL upload presigned".
  - Xoá `public/_redirects`: Pages tự trả `index.html` cho đường dẫn không phải file khi dự án không có `404.html` (docs Pages "Serving Pages", mục single-page application).
  - `package.json`: thêm script `build:pages`.

- [ ] **Step 6: Kiểm build**

```bash
pnpm turbo run build --filter=@ranhduong/admin^...
pnpm --filter @ranhduong/admin build:pages
```
Expected: lỗi, thông báo có `VITE_API_BASE`, `VITE_WEB_BASE`, `VITE_MEDIA_BASE`; exit code khác 0.

```bash
VITE_API_BASE=https://api.staging.ranhduong.vn/v1 VITE_WEB_BASE=https://staging.ranhduong.vn VITE_MEDIA_BASE=https://media.staging.ranhduong.vn pnpm --filter @ranhduong/admin build:pages
grep -o '<script[^>]*>' apps/admin/dist/index.html
```
Expected: build xanh; `apps/admin/dist/_headers` có nội dung như trên; không có `apps/admin/dist/_redirects`; mọi thẻ `<script` in ra đều có `src=` (không script inline, nên `script-src 'self'` đủ).

```bash
pnpm --filter @ranhduong/admin build && test ! -e apps/admin/dist/_headers && echo ok
```
Expected: `ok` (build thường trong CI không cần biến và không sinh `_headers`).

- [ ] **Step 7: lint, typecheck, test admin**

Run: `pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin test` → xanh.

- [ ] **Step 8: Commit**

```bash
git add apps/admin
git commit -m "feat: S26 build admin for Cloudflare Pages with generated headers"
```

---

### Task 3: Tải lại một lần khi không tải được trang (bản mới hoặc hết phiên Access)

Sau một lần deploy, file chunk cũ không còn; khi phiên Cloudflare Access hết hạn, request chunk bị chuyển sang trang đăng nhập Access. Cả hai làm `import()` của route lỗi. Tải lại toàn trang tới đúng trang đích là đủ (đi qua Access nếu cần, lấy `index.html` mới).

**Files:**
- Create: `apps/admin/src/shared/lib/chunk-reload.ts`, `apps/admin/src/shared/lib/chunk-reload.test.ts`
- Create: `apps/admin/src/app/chunk-recovery.ts`
- Modify: `apps/admin/src/app/main.ts`, `apps/admin/src/app/App.vue`

**Interfaces:**
- Produces (`shared/lib/chunk-reload.ts`, không import tầng trên):
  - `isChunkLoadError(error: unknown): boolean` — `true` khi là `Error` có message khớp `/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i`.
  - `CHUNK_RELOAD_KEY = 'rd-admin:chunk-reload'`, `CHUNK_RELOAD_WINDOW_MS = 10_000`.
  - `claimChunkReload(target: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null, now: number): boolean` — `true` (và ghi `{ target, at: now }` dạng JSON) nếu được tải lại; `false` nếu đã tải lại cùng `target` trong 10 giây, hoặc `storage` là `null`/ném lỗi (không có chỗ ghi thì không tải lại, tránh lặp vô hạn).
- Produces (`app/chunk-recovery.ts`):
  - `chunkFailedTarget: Ref<string | null>` — đường dẫn trang không mở được.
  - `installChunkRecovery(router: Router): void` — `router.onError((error, to) => …)`: lỗi chunk thì `claimChunkReload(to.fullPath, <sessionStorage trong try/catch>, Date.now())`; được thì `window.location.assign(to.fullPath)`, không thì `chunkFailedTarget.value = to.fullPath`. `router.afterEach((_to, _from, failure) => { if (!failure) chunkFailedTarget.value = null })`.

- [ ] **Step 1: Viết test đỏ** `chunk-reload.test.ts`:
  - `isChunkLoadError`: `new TypeError('Failed to fetch dynamically imported module: https://admin.ranhduong.vn/assets/PlacesPage-a1.js')` → `true`; `new TypeError('error loading dynamically imported module: …')` → `true`; `new TypeError('Importing a module script failed.')` → `true`; `new Error('Unable to preload CSS for /assets/x.css')` → `true`; `new Error('Network error')` → `false`; chuỗi `'Failed to fetch dynamically imported module'` (không phải Error) → `false`.
  - `claimChunkReload`, mỗi ca một storage giả mới (bọc `Map`):
    - storage rỗng, `('/bao-cao', s, 1000)` → `true`, và `s.getItem(CHUNK_RELOAD_KEY)` là `'{"target":"/bao-cao","at":1000}'`.
    - đã lưu `{"target":"/bao-cao","at":1000}`: `('/bao-cao', s, 10_999)` → `false`; `('/bao-cao', s, 11_000)` → `true`; `('/mua', s, 2000)` → `true`.
    - đã lưu `'{'` (hỏng) → `('/bao-cao', s, 1000)` là `true`.
    - `storage = null` → `false`; storage có `setItem` ném `DOMException` → `false`.

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/chunk-reload.test.ts` → FAIL (chưa có module).

- [ ] **Step 3: Viết `chunk-reload.ts`** theo Interfaces.

- [ ] **Step 4: Chạy test** → PASS.

- [ ] **Step 5: Nối vào app**
  - `app/chunk-recovery.ts` theo Interfaces.
  - `main.ts`: gọi `installChunkRecovery(router)` trước `createApp(...).use(router)`; đổi thành `void router.isReady().catch(() => undefined).then(() => app.mount('#app'))` để lần vào đầu lỗi vẫn hiện được thông báo thay vì trang trắng.
  - `App.vue`: khi `chunkFailedTarget` khác `null`, hiện ở đầu cả hai nhánh (trang public và `RdAdminShell`):

```html
<div class="rd-callout rd-callout--bad" role="alert">
  <p>Chưa mở được trang này. Có thể trang quản trị vừa có bản mới hoặc mạng đang chập chờn.</p>
  <button type="button" class="rd-btn rd-btn--outline" @click="reload">Tải lại trang</button>
</div>
```

  `reload` gọi `window.location.assign(chunkFailedTarget)`.

- [ ] **Step 6: lint, typecheck, test admin** → xanh (luật lint `shared/lib` không import tầng trên phải qua).

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src
git commit -m "feat: S26 reload admin route once when a chunk fails to load"
```

---

### Task 4: Job deploy admin trong CI

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: script `build:pages` và biến `VITE_*` của Task 2.
- Produces: các tên cấu hình GitHub mà runbook Task 5 hướng dẫn tạo — biến repo `ADMIN_PAGES_PROJECT`; environment `admin-staging` và `admin-production`, mỗi cái có biến `VITE_API_BASE`, `VITE_WEB_BASE`, `VITE_MEDIA_BASE`, `VITE_MAP_STYLE_URL` (tuỳ chọn), `VITE_UPLOAD_ORIGIN` (tuỳ chọn); secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

- [ ] **Step 1: Sửa trigger** `push` thành `branches: [main]` và `tags: ['v*']`. Job `check` giữ nguyên.

- [ ] **Step 2: Thêm job `deploy-admin`**:
  - `needs: check`; `if: github.event_name == 'push' && vars.ADMIN_PAGES_PROJECT != ''` (chưa tạo dự án Pages thì bỏ qua, CI vẫn xanh trước S02).
  - `environment: ${{ startsWith(github.ref, 'refs/tags/v') && 'admin-production' || 'admin-staging' }}`.
  - `concurrency: { group: admin-pages-<production|staging theo cùng điều kiện>, cancel-in-progress: false }` (bản chờ mới hơn thay bản chờ cũ; không cắt ngang lần upload đang chạy).
  - `env.PAGES_BRANCH`: `production` cho tag, `main` cho nhánh main.
  - Bước: checkout, `pnpm/action-setup@v4` (12.9.1), `actions/setup-node@v4` (`.nvmrc`, cache pnpm), `pnpm install --frozen-lockfile`, `pnpm turbo run build --filter=@ranhduong/admin^...`, `pnpm --filter @ranhduong/admin build:pages` với năm biến `VITE_*` lấy từ `vars`, rồi:

```bash
pnpm dlx wrangler@4.147.0 pages deploy apps/admin/dist --project-name="$ADMIN_PAGES_PROJECT" --branch="$PAGES_BRANCH" --commit-hash="$GITHUB_SHA"
```
  với `ADMIN_PAGES_PROJECT: ${{ vars.ADMIN_PAGES_PROJECT }}`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` từ `secrets` đặt ở `env` của bước (không nội suy secret thẳng vào dòng lệnh).

- [ ] **Step 3: Kiểm cú pháp workflow**

Run: `docker run --rm -v "$(pwd):/repo" -w /repo rhysd/actionlint:1.7.7`
Expected: không in lỗi, exit 0. Không có Docker thì ghi lại là chưa kiểm được, không báo xanh.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: S26 deploy admin to Cloudflare Pages after checks"
```

---

### Task 5: Thử bản build trên runtime Pages, tài liệu, kiểm toàn bộ và review

**Files:**
- Create: `docs/runbooks/admin-pages.md`, ảnh trong `docs/runbooks/assets/` (`s26-admin-pages-desktop.png`, `s26-admin-pages-mobile.png`)
- Modify: `docs/runbooks/admin-login.md` (mục 2: link sang runbook mới), `docs/decisions.md` (một dòng), `docs/backlog.md` (cột trạng thái S26), `CLAUDE.md` (mục Trạng thái)

- [ ] **Step 1: Chạy API cho origin `:8788`**

```bash
pnpm infra:up
ADMIN_URL=http://localhost:8788 pnpm --filter @ranhduong/api media:setup:local
WEB_ORIGINS=http://localhost:3100,http://localhost:5174,http://localhost:8788 ADMIN_URL=http://localhost:8788 pnpm --filter @ranhduong/api dev
```

- [ ] **Step 2: Build `pages` với giá trị local và chạy runtime Pages**

```bash
VITE_API_BASE=http://localhost:3101/v1 VITE_WEB_BASE=http://localhost:3100 VITE_MEDIA_BASE=http://localhost:9000/ranhduong-media VITE_UPLOAD_ORIGIN=http://localhost:9000 pnpm --filter @ranhduong/admin build:pages
pnpm dlx wrangler@4.147.0 pages dev apps/admin/dist --port 8788
```
Expected: wrangler không cảnh báo về `_redirects`/`_headers`.

- [ ] **Step 3: Kiểm header và fallback SPA**

Run: `curl -sI http://localhost:8788/dia-diem/khong-co`
Expected: `200`, `content-type: text/html`, có `content-security-policy` đúng chuỗi Task 2 với origin local, `x-robots-tag: noindex, nofollow`, `x-frame-options: DENY`.

- [ ] **Step 4: Thử trên Chrome (CDP device emulation 390×844, và 1440×1000)**
  - Tạo phiên admin: `redis-cli SET sess:<sid> '{"email":"<email trong ADMIN_EMAILS>","subject":"gia-lap","createdAt":"<ISO bây giờ>"}' EX 3600`, `<sid>` 43 ký tự khớp `RANDOM_TOKEN_PATTERN`; đặt cookie `sid=<sid>` cho `localhost`.
  - Đi qua `/dang-nhap` (khi chưa có cookie), `/dia-diem`, mở một địa điểm giả có bản đồ (tile OpenFreeMap hiện), upload một ảnh giả vào MinIO, `/lich-trinh/<id>`, `/bao-cao`. Console không có vi phạm CSP (Zod in thông báo thử `new Function` bị chặn là chấp nhận được, ghi vào runbook). Mạng: request API có cookie, preflight trả `access-control-allow-origin: http://localhost:8788`.
  - Thanh bên 232px ở 1440px, thanh trên 56px và ngăn trượt ở 390px (Spec UI mục 12); không tràn ngang. Chụp hai ảnh vào `docs/runbooks/assets/`.
  - Chunk lỗi: khi đang ở `/dia-diem`, xoá file `apps/admin/dist/assets/MetricsPage-*.js`, bấm Báo cáo → trang tải lại một lần tới `/bao-cao`, sau đó hiện thông báo "Chưa mở được trang này…" với nút Tải lại trang, không lặp tải lại. Build lại để khôi phục file.
  - Xong thì chạy lại `pnpm --filter @ranhduong/api media:setup:local` (không override) để CORS MinIO về `:5174`.

- [ ] **Step 5: Viết `docs/runbooks/admin-pages.md`** gồm:
  1. Tạo dự án: `pnpm dlx wrangler@4.147.0 pages project create <tên> --production-branch=production`; API token quyền *Account → Cloudflare Pages → Edit*.
  2. GitHub: biến repo `ADMIN_PAGES_PROJECT`; environment `admin-staging`/`admin-production` với các biến `VITE_*` (bảng giá trị staging/production: `https://api.staging.ranhduong.vn/v1` … theo tên miền chốt ở S02); secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Ghi rõ: chưa đặt `ADMIN_PAGES_PROJECT` thì job deploy bỏ qua.
  3. Domain: `admin.ranhduong.vn` thêm ở Custom domains (production). `admin.staging.ranhduong.vn`: thêm ở Custom domains, sau khi đã có một lần deploy `main` thì sửa CNAME sang `main.<project>.pages.dev`, bản ghi phải proxied (docs Pages "Add a custom domain to a branch").
  4. Access: theo `admin-login.md` mục 3 cho cả hai hostname và `*.pages.dev`.
  5. API và R2: `WEB_ORIGINS`, `ADMIN_URL` mỗi môi trường (Task 1 dừng API nếu gõ sai origin); CORS bucket upload thêm origin admin staging.
  6. CSP: các nguồn được mở và lý do; khi thêm Sentry (S19) hay nguồn mới thì sửa `pagesHeaders` và test; không bật Cloudflare Web Analytics cho dự án (script bị CSP chặn).
  7. Phát hành và quay lui: `main` → staging, tag `v*` → production sau khi thử staging; quay lui bằng Deployments → Rollback trong dashboard Pages.
  8. Kiểm sau deploy: `curl -sI` header, Access chặn email lạ, mở `/dia-diem/<id>` trực tiếp, điện thoại thật.
  9. Kết quả thử local ở Step 2–4 và ảnh chụp.

  `docs/decisions.md`: thêm dòng ngày 2026-10-19: "S26 deploy admin bằng `pnpm dlx wrangler@4.147.0 pages deploy` trong CI, không thêm wrangler vào package.json; `_headers` sinh lúc build `pages` từ biến `VITE_*`; bỏ `_redirects`, dùng fallback SPA mặc định của Pages."

- [ ] **Step 6: Kiểm toàn bộ như CI**

Run: `pnpm turbo run lint typecheck test build` rồi `pnpm --filter @ranhduong/web test:ssr`
Expected: tất cả xanh. Ghi số liệu thật vào runbook; đỏ thì sửa trước khi đi tiếp.

- [ ] **Step 7: Review độc lập** bằng superpowers:requesting-code-review trên toàn nhánh; sửa phát hiện quan trọng kèm test hồi quy rồi chạy lại Step 6.

- [ ] **Step 8: Cập nhật trạng thái**
  - `docs/backlog.md` hàng S26: `Code xong trên feat/S26-admin-pages: build pages có biến bắt buộc, _headers CSP/noindex sinh từ cấu hình, fallback SPA mặc định, tải lại một lần khi chunk lỗi; job deploy-admin (main → staging, tag v* → production) qua wrangler 4.147.0; API chặn WEB_ORIGINS sai. Đã thử wrangler pages dev, Chrome 390px/desktop; runbook docs/runbooks/admin-pages.md. Chờ chủ dự án tạo dự án Pages/token/GitHub environments, S02 (domain), Cloudflare Access, staging, điện thoại thật và Sentry 24 giờ`.
  - `CLAUDE.md` mục Trạng thái: thêm một gạch đầu dòng S26 cùng ý, ngắn như các dòng khác.

- [ ] **Step 9: Commit**

```bash
git add docs CLAUDE.md
git commit -m "docs: S26 record admin Pages deploy runbook and status"
```

Việc ngoài code, chủ dự án làm sau khi S02 có domain: tạo dự án Pages và token, tạo GitHub environments/biến, gắn hai custom domain, bật Access, đặt `WEB_ORIGINS`/`ADMIN_URL`/CORS R2 cho staging, push `main` để thử staging, rồi thử trên điện thoại thật.
