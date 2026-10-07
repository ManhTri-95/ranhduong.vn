# S04 Đăng nhập admin bằng Google: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chỉ email trong danh sách mới dùng được `admin.ranhduong.vn`. Cloudflare Access chặn trước khi tải trang. API chỉ tạo phiên cho email Google đã xác minh nằm trong `ADMIN_EMAILS`, và kiểm lại danh sách ở mỗi request quản trị.

**Architecture:** Hai lớp chặn độc lập (ADR 0004). Lớp 1 là Cloudflare Access: chỉ cấu hình, không có code, làm theo runbook ở Task 8. Lớp 2 là API: OAuth Authorization Code + PKCE xử lý phía server (ADR 0009). `state` và `code_verifier` lưu Redis 10 phút, gắn với trình duyệt bằng cookie `rd_oauth_state`. `id_token` được xác minh chữ ký bằng `jose`. Email hợp lệ thì API tạo phiên `sess:{sid}` trong Redis (30 ngày, trượt) và đặt cookie phiên. `AdminGuard` đọc phiên và kiểm lại `ADMIN_EMAILS` ở mỗi request. `OriginGuard` toàn cục chặn request ghi dữ liệu từ nguồn lạ. Admin SPA có trang `/dang-nhap` và router guard gọi `GET /v1/auth/session`.

**Tech Stack:** NestJS 12 (Express 5), ioredis 5, jose 6, Zod 4, Vitest 5 với Redis và MongoDB thật, `@nestjs/testing`; admin: Vue 3, Vue Router 5, ofetch; Cloudflare Access (Zero Trust); Google Auth Platform.

**Spec:** `docs/backlog.md` S04 (tiêu chí: *Chỉ email trong danh sách được dùng admin.ranhduong.vn; email khác bị từ chối ở cả Cloudflare Access và API*), `docs/backlog.md` mục 2 (đăng nhập chỉ cho admin, chưa phân vai trò) và mục 6 (definition of done), `docs/technical-design.md` mục 5 (luồng đăng nhập), mục 6 (mã lỗi), mục 13 (cookie, Origin), `docs/architecture.md` mục 3 (tên miền, cookie `.ranhduong.vn`) và mục 4 (cấu trúc module), `docs/ui-spec.md` mục 3 (giọng văn) và mục 12 (giao diện quản trị), ADR 0004, 0009, 0011.

## Global Constraints

- TypeScript strict ở mọi package; không tắt `strict`, `noUncheckedIndexedAccess`; không dùng `any`, `@ts-ignore`, `as unknown as`.
- Kiểu dữ liệu đi qua API, query hoặc form nằm trong `packages/contracts` (`ReturnToPath`, `OAuthCallbackQuery`, `AdminSession`, `ApiError`); API validate bằng đúng schema đó (ADR 0011).
- API đọc biến môi trường qua `loadEnv()` hoặc `loadDbEnv()`. Riêng helper test (`src/testing/*`, không vào build) đọc `MONGODB_TEST_URI`, `REDIS_TEST_URL`.
- Lỗi API có dạng `{ code, message }`, mã lấy từ technical-design mục 6 (`UNAUTHENTICATED` → 401, `FORBIDDEN` → 403).
- Cookie phiên: `HttpOnly; SameSite=Lax`; có `Secure` khi API chạy https; production đặt `Domain=.ranhduong.vn`. `returnTo` chỉ nhận đường dẫn nội bộ. Request ghi dữ liệu phải có `Origin` thuộc `WEB_ORIGINS` (ADR 0009).
- Email bị từ chối thì không tạo phiên, không đặt cookie phiên, không ghi DB.
- Test chỉ dùng dữ liệu giả có tên rõ là giả (`quan-tri-gia-lap@example.com`, `*.gia-lap.example`). Test không gọi Google thật.
- Thêm thư viện thì ghi một dòng vào `docs/decisions.md`. Không nâng TypeScript lên 7.
- Class được Nest inject theo kiểu (`SessionStore`, `OAuthStateStore`, `GoogleOAuth`, `AuthService`) phải import bằng import giá trị, không dùng `import type`, vì Nest đọc decorator metadata.
- Admin: dùng biến trong `tokens.css`, không hard-code màu, font, bo góc. `--accent` đi với chữ `--ink`. Vùng bấm tối thiểu 44×44px. Nút đăng nhập là `<a href>` (điều hướng toàn trang để API đặt cookie), nút đăng xuất là `<button>`. Chữ tiếng Việt theo giọng văn ui-spec mục 3. Làm cho 390px trước. Admin gọi API qua `src/shared/api/client.ts`.
- Nhánh `feat/S04-admin-google-login`; commit theo Conventional Commits, có ID story (`feat: S04 …`). `git add` từng đường dẫn cụ thể, vì thư mục `.pnpm-store/` chưa được ignore và không được add vào commit.
- Trước khi commit: `pnpm turbo run lint typecheck test build` phải xanh (cần chạy `pnpm infra:up` trước).

## Review Focus

1. **Email ngoài danh sách đăng nhập Google thành công** (Google luôn cho đăng nhập): API không tạo phiên, không đặt cookie phiên, chuyển về `/dang-nhap?error=not_allowed`. Test ở Task 5 ("email không có trong danh sách") và Task 6 ("email ngoài danh sách").
2. **Vào admin qua `*.pages.dev` để né Cloudflare Access:** bản preview và alias `<project>.pages.dev` cũng phải bị Access chặn. Kiểm ở Task 8, runbook mục 3 bước 4 và 5.
3. **Email bị bỏ khỏi `ADMIN_EMAILS` khi người đó vẫn còn phiên:** sau khi API khởi động lại, request quản trị tiếp theo trả 403. Test ở Task 6 ("phiên của email đã bị bỏ khỏi ADMIN_EMAILS").
4. **`returnTo` độc hại** (`//x`, `/\x`, `/<tab>/x`, URL tuyệt đối): luôn quay về đúng origin của `ADMIN_URL`. Test ở Task 1 (`parseReturnTo`) và Task 5 ("returnTo không an toàn").
5. **Mở link callback không phải của mình, hoặc dùng lại callback** (login CSRF, replay): trả `failed` hoặc `expired`, không có phiên. Test ở Task 5 và Task 6.

## Tiêu chí nghiệm thu → bước kiểm

| Tiêu chí S04 | Kiểm ở |
| --- | --- |
| Email khác bị từ chối ở API | Task 5 Step 1 (`not_allowed`, chưa xác minh, danh sách trống, không tạo phiên), Task 6 Step 2 (HTTP: không có cookie phiên, 401, 403), Task 7 Step 7 (thử bằng tài khoản Google thật ngoài danh sách) |
| Email khác bị từ chối ở Cloudflare Access | Task 8 Step 6 (runbook mục 3: thử ẩn danh trên `admin.ranhduong.vn`, `<project>.pages.dev` và một URL preview). Cần S02 và S26 xong trước |
| Chỉ email trong danh sách dùng được admin | Task 5 (tạo phiên, quay về `returnTo`), Task 6 (cookie phiên, `GET /auth/session` 200), Task 7 Step 7 (đăng nhập thật ở local), Task 8 Step 6 (staging) |
| DoD: logic có điều kiện có unit test | Task 1–6 |
| DoD: CI xanh | Task 2 (CI có Redis), Task 8 Step 4 |
| DoD: thử trên staging và điện thoại thật | Task 8 Step 6, chờ S02 và S26 |

## Việc của chủ dự án

1. **Trước Task 7 Step 7 (thử đăng nhập thật ở local):** tạo Google OAuth client cho API theo runbook mục 1 (Task 8 Step 1 có nội dung đầy đủ). Điền `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và email của bạn vào `ADMIN_EMAILS` trong `apps/api/.env`.
2. **Sau khi S02 và S26 xong:** cấu hình Cloudflare Access theo runbook mục 3, rồi thử trên staging và điện thoại thật (Task 8 Step 6).

## Ngoài phạm vi (cố ý chưa làm)

- Collection `users`, vai trò, gộp ID khách `gid`: để lát 3, khi khách được đăng nhập. Lát 1 chưa có tính năng nào cần `userId`; phiên admin chỉ giữ email và `sub` của Google (ghi vào `docs/decisions.md` ở Task 8).
- Rate limit `/auth/*` (20/giờ mỗi IP, technical-design mục 13): cần IP thật qua header `CF-Connecting-IP`, mà header này chỉ có sau khi S02 dựng xong Cloudflare Tunnel. Ghi vào backlog ở Task 8.
- Xử lý 401 giữa chừng trong admin (phiên hết hạn khi đang sửa form): làm ở S05, khi admin bắt đầu gọi API ghi dữ liệu.
- `apps/admin` chưa có script `typecheck` (chưa cài `vue-tsc`), nên CI chưa kiểm kiểu file `.vue`. Story này không thêm; báo chủ dự án ở Task 8.
- Helmet, CSP: để S02.

## Cấu trúc file

```text
packages/contracts/src/
  auth.ts                         LoginError, ReturnToPath, parseReturnTo, OAuthCallbackQuery, AdminSession (mới)
  errors.ts                       ApiErrorCode, ApiError                                       (mới)
  auth.test.ts                                                                                 (mới)
  index.ts                        export thêm auth, errors                                     (sửa)
apps/api/src/
  config/env.ts                   REDIS_URL, GOOGLE_*, API_PUBLIC_URL, ADMIN_URL, SESSION_COOKIE_*; loadDbEnv (sửa)
  config/env.test.ts                                                                           (mới)
  config/config.module.ts         module toàn cục cung cấp ENV                                 (mới)
  setup-app.ts                    prefix /v1, CORS, OriginGuard; dùng chung main.ts và test HTTP (mới)
  main.ts, app.module.ts                                                                       (sửa)
  seed/seed.module.ts             dùng loadDbEnv                                               (sửa)
  shared/crypto/random-token.ts   randomToken, RANDOM_TOKEN_PATTERN                            (mới)
  shared/redis/redis.module.ts    module toàn cục cung cấp REDIS (ioredis)                     (mới)
  shared/redis/parse-stored.ts    đọc JSON trong Redis bằng schema Zod                         (mới)
  shared/http/cookies.ts          readCookie                                                   (mới)
  shared/http/origin.guard.ts     kiểm Origin cho request ghi dữ liệu                          (mới)
  shared/session/admin-emails.ts  isAllowedAdmin                                               (mới)
  shared/session/session-cookie.ts  thuộc tính cookie phiên                                    (mới)
  shared/session/session.store.ts   SessionStore (Redis sess:{sid})                            (mới)
  shared/session/admin.guard.ts     AdminGuard, CurrentSession                                 (mới)
  shared/session/session.module.ts  module toàn cục: SessionStore, AdminGuard                  (mới)
  modules/auth/pkce.ts            createPkcePair, codeChallengeS256                            (mới)
  modules/auth/google-oauth.client.ts  GoogleOAuth (cổng), GoogleOAuthClient (jose)           (mới)
  modules/auth/oauth-state.store.ts    OAuthStateStore (Redis oauth:{state}, GETDEL)           (mới)
  modules/auth/auth.service.ts    start, finish, logout                                        (mới)
  modules/auth/auth.controller.ts GET google/start, GET google/callback, GET session, POST logout (mới)
  modules/auth/auth.module.ts                                                                  (mới)
  modules/auth/auth.http.test.ts  test HTTP toàn luồng                                         (mới)
  testing/redis.ts                connectTestRedis, testKeys, dropTestRedis                    (mới)
  testing/env.ts                  testEnv                                                      (mới)
  *.test.ts                       test cạnh file
apps/admin/src/
  shared/api/client.ts            export API_BASE                                              (sửa)
  entities/session/index.ts       SessionState, sessionState, loadSession                      (mới)
  features/auth/index.ts          googleLoginUrl, logout                                       (mới)
  pages/LoginPage.vue             /dang-nhap                                                   (mới)
  app/router.ts                   route /dang-nhap, beforeEach, RouteMeta.public               (sửa)
  app/App.vue                     trang công khai không có thanh bên; email + Đăng xuất       (sửa)
docs/runbooks/admin-login.md      Google OAuth client, biến môi trường, Cloudflare Access, thêm/bớt admin (mới)
.github/workflows/ci.yml          thêm service Redis                                           (sửa)
turbo.json, .env.example, README.md, docs/decisions.md, docs/backlog.md, CLAUDE.md             (sửa)
```

## Bước 0: Chuẩn bị nhánh

- [ ] `docs/backlog.md` đang có thay đổi chưa commit (trạng thái S03). Hỏi chủ dự án có muốn commit thay đổi đó lên `main` trước không (`docs: S03 update backlog status`). Không gộp thay đổi này vào nhánh S04 khi chưa hỏi.
- [ ] Tạo nhánh và bật hạ tầng:

```bash
git switch main && git pull
git switch -c feat/S04-admin-google-login
pnpm infra:up
```

---

### Task 1: Contracts cho đăng nhập và lỗi API

**Files:**
- Create: `packages/contracts/src/auth.ts`
- Create: `packages/contracts/src/errors.ts`
- Create: `packages/contracts/src/auth.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `LoginError`: Zod enum `'not_allowed' | 'expired' | 'failed'`, kèm `type LoginError`
  - `ReturnToPath`: Zod string, kèm `type ReturnToPath = string`
  - `parseReturnTo(raw: unknown): string`, trả `'/'` khi giá trị không an toàn
  - `OAuthCallbackQuery`: `{ state: string; code?: string; error?: string }`
  - `AdminSession`: `{ email: string }`
  - `ApiErrorCode` (enum mã lỗi technical-design mục 6), `ApiError`: `{ code: ApiErrorCode; message: string; details?: unknown }`

- [ ] **Step 1: Viết test (đỏ)**

`packages/contracts/src/auth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AdminSession, OAuthCallbackQuery, parseReturnTo } from './auth.js';

describe('parseReturnTo', () => {
  it.each(['/', '/dia-diem', '/dia-diem/66f0c0ffee0000000000000a?tab=anh#gio', '/dia-diem/%2F%2Fgia-lap'])(
    'giữ đường dẫn nội bộ %s',
    (path) => {
      expect(parseReturnTo(path)).toBe(path);
    },
  );

  it.each([
    ['thiếu', undefined],
    ['chuỗi rỗng', ''],
    ['tham số lặp (Express đọc thành mảng)', ['/dia-diem', '/lich-trinh']],
    ['URL tuyệt đối', 'https://gia-lap.example/dia-diem'],
    ['bắt đầu bằng //', '//gia-lap.example'],
    ['có dấu gạch ngược', '/\\gia-lap.example'],
    ['tab giữa hai dấu gạch', '/\t/gia-lap.example'],
    ['xuống dòng', '/\n/gia-lap.example'],
    ['khoảng trắng', '/dia diem'],
    ['javascript:', 'javascript:alert(1)'],
    ['dài quá 512 ký tự', `/${'a'.repeat(512)}`],
  ])('đưa về "/" khi %s', (_label, raw) => {
    expect(parseReturnTo(raw)).toBe('/');
  });

  it('kết quả ghép với URL admin luôn giữ nguyên origin', () => {
    const base = 'https://admin.gia-lap.example';
    for (const raw of ['/', '/a', '//x', '/\\x', '/\t/x', '/.//x', '/..//x', '/%5C%5Cx']) {
      expect(new URL(parseReturnTo(raw), base).origin).toBe(base);
    }
  });
});

describe('OAuthCallbackQuery', () => {
  it('nhận query thành công và query khi người dùng bấm Huỷ ở Google', () => {
    expect(OAuthCallbackQuery.parse({ state: 's', code: 'c', scope: 'email openid' })).toEqual({ state: 's', code: 'c' });
    expect(OAuthCallbackQuery.parse({ state: 's', error: 'access_denied' })).toEqual({ state: 's', error: 'access_denied' });
  });

  it('từ chối khi thiếu state, state quá dài hoặc tham số bị lặp', () => {
    expect(OAuthCallbackQuery.safeParse({ code: 'c' }).success).toBe(false);
    expect(OAuthCallbackQuery.safeParse({ state: 's'.repeat(257), code: 'c' }).success).toBe(false);
    expect(OAuthCallbackQuery.safeParse({ state: ['s1', 's2'], code: 'c' }).success).toBe(false);
  });
});

describe('AdminSession', () => {
  it('chỉ trả email ra ngoài, bỏ các trường nội bộ của phiên', () => {
    expect(
      AdminSession.parse({ email: 'quan-tri-gia-lap@example.com', subject: 'google-sub-gia-lap', createdAt: '2026-10-07T03:00:00.000Z' }),
    ).toEqual({ email: 'quan-tri-gia-lap@example.com' });
  });
});
```

- [ ] **Step 2: Chạy test, phải đỏ**

Run: `pnpm --filter @ranhduong/contracts test`
Expected: FAIL, báo không tìm thấy module `./auth.js`.

- [ ] **Step 3: Viết code**

`packages/contracts/src/auth.ts`:

```ts
import { z } from 'zod';

/** Mã lỗi đăng nhập API gửi lại cho admin qua `/dang-nhap?error=`. */
export const LoginError = z.enum(['not_allowed', 'expired', 'failed']);
export type LoginError = z.infer<typeof LoginError>;

// Ký tự điều khiển và khoảng trắng (trình duyệt bỏ tab, xuống dòng khi đọc URL nên '/\t/x' thành '//x'),
// DEL và '\' (trình duyệt coi '\' như '/').
const hasUnsafeChar = (s: string) =>
  [...s].some((ch) => (ch.codePointAt(0) ?? 0) <= 0x20 || ch === '\u007f' || ch === '\\');

/**
 * Đường dẫn nội bộ để quay lại sau khi đăng nhập (ADR 0009): bắt đầu bằng đúng một '/',
 * không có khoảng trắng, ký tự điều khiển hay '\'. Nhờ vậy không thể chuyển hướng sang trang khác.
 */
export const ReturnToPath = z
  .string()
  .max(512)
  .refine((s) => s.startsWith('/') && !s.startsWith('//') && !hasUnsafeChar(s), 'returnTo phải là đường dẫn nội bộ');
export type ReturnToPath = z.infer<typeof ReturnToPath>;

/** Đọc returnTo từ query; thiếu hoặc không an toàn thì về '/'. */
export function parseReturnTo(raw: unknown): ReturnToPath {
  const parsed = ReturnToPath.safeParse(raw);
  return parsed.success ? parsed.data : '/';
}

/** Query Google gửi về `/auth/google/callback`: thành công có `code`, người dùng huỷ thì có `error`. */
export const OAuthCallbackQuery = z.object({
  state: z.string().min(1).max(256),
  code: z.string().min(1).optional(),
  error: z.string().optional(),
});
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuery>;

/** Phiên admin trả về từ `GET /auth/session`. */
export const AdminSession = z.object({ email: z.email() });
export type AdminSession = z.infer<typeof AdminSession>;
```

`packages/contracts/src/errors.ts`:

```ts
import { z } from 'zod';

/** Mã lỗi API (technical-design mục 6). Body lỗi luôn có dạng `{ code, message, details? }`. */
export const ApiErrorCode = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'CHECKIN_TOO_FAR',
  'CHECKIN_LOW_ACCURACY',
  'CHECKIN_ALREADY_TODAY',
  'DUPLICATE_SUSPECTED',
  'VOUCHER_SOLD_OUT',
  'VOUCHER_ALREADY_CLAIMED',
  'VOUCHER_EXPIRED',
  'VOUCHER_OUT_OF_WINDOW',
  'CONTACT_REQUIRED',
  'NOT_ENOUGH_PLACES',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiError = z.object({ code: ApiErrorCode, message: z.string(), details: z.unknown().optional() });
export type ApiError = z.infer<typeof ApiError>;
```

`packages/contracts/src/index.ts`: thêm hai dòng theo thứ tự chữ cái:

```ts
export * from './auth.js';
export * from './city.js';
export * from './common.js';
export * from './enums.js';
export * from './errors.js';
export * from './geojson.js';
export * from './opening-hours.js';
export * from './place.js';
```

- [ ] **Step 4: Chạy test, phải xanh; build để API thấy export mới**

Run: `pnpm --filter @ranhduong/contracts test && pnpm --filter @ranhduong/contracts lint && pnpm --filter @ranhduong/contracts typecheck && pnpm --filter @ranhduong/contracts build`
Expected: PASS hết.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/auth.ts packages/contracts/src/errors.ts packages/contracts/src/auth.test.ts packages/contracts/src/index.ts
git commit -m "feat: S04 add auth and api error contracts"
```

---

### Task 2: Biến môi trường, Redis và CI

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Create: `apps/api/src/config/env.test.ts`
- Create: `apps/api/src/config/config.module.ts`
- Create: `apps/api/src/shared/redis/redis.module.ts`
- Create: `apps/api/src/testing/redis.ts`
- Create: `apps/api/src/testing/redis.test.ts`
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/seed/seed.module.ts`, `apps/api/package.json` (qua `pnpm add`)
- Modify: `.github/workflows/ci.yml`, `turbo.json`, `.env.example`, `docs/decisions.md`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `Env` có thêm `REDIS_URL: string`, `GOOGLE_CLIENT_ID: string`, `GOOGLE_CLIENT_SECRET: string`, `API_PUBLIC_URL: string` (không có `/` cuối), `ADMIN_URL: string` (không có `/` cuối), `SESSION_COOKIE_DOMAIN: string | undefined`, `SESSION_COOKIE_NAME: string`
  - `loadEnv(source?): Env`, `loadDbEnv(source?): { MONGODB_URI: string }`, `ENV` (token)
  - `ConfigModule.register(env: Env): DynamicModule`: toàn cục, cung cấp `ENV`
  - `REDIS` (token), `RedisModule`: toàn cục, cung cấp một instance `Redis` của ioredis
  - `connectTestRedis(): Promise<Redis>`, `testKeys(redis, pattern?): Promise<string[]>` (khoá đã bỏ tiền tố, đã sắp xếp), `dropTestRedis(redis): Promise<void>`

- [ ] **Step 1: Viết test env (đỏ)**

`apps/api/src/config/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadDbEnv, loadEnv } from './env';

const REQUIRED = {
  MONGODB_URI: 'mongodb://localhost:27017/gia-lap',
  GOOGLE_CLIENT_ID: 'client-id-gia-lap.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'client-secret-gia-lap',
};

describe('loadEnv', () => {
  it('đủ biến bắt buộc thì các biến còn lại lấy mặc định cho local', () => {
    const env = loadEnv(REQUIRED);
    expect(env).toMatchObject({
      REDIS_URL: 'redis://localhost:6379',
      API_PUBLIC_URL: 'http://localhost:3001',
      ADMIN_URL: 'http://localhost:5174',
      ADMIN_EMAILS: [],
      SESSION_COOKIE_NAME: 'sid',
    });
    expect(env.SESSION_COOKIE_DOMAIN).toBeUndefined();
  });

  it('ADMIN_EMAILS bỏ khoảng trắng, chữ hoa và mục rỗng', () => {
    const env = loadEnv({ ...REQUIRED, ADMIN_EMAILS: ' Quan-Tri-Gia-Lap@Example.com, ,phu-ta-gia-lap@example.com,' });
    expect(env.ADMIN_EMAILS).toEqual(['quan-tri-gia-lap@example.com', 'phu-ta-gia-lap@example.com']);
  });

  it('bỏ dấu / cuối URL; SESSION_COOKIE_DOMAIN rỗng coi như không đặt', () => {
    const env = loadEnv({ ...REQUIRED, API_PUBLIC_URL: 'https://api.ranhduong.vn/', ADMIN_URL: 'https://admin.ranhduong.vn/', SESSION_COOKIE_DOMAIN: ' ' });
    expect(env.API_PUBLIC_URL).toBe('https://api.ranhduong.vn');
    expect(env.ADMIN_URL).toBe('https://admin.ranhduong.vn');
    expect(env.SESSION_COOKIE_DOMAIN).toBeUndefined();
    expect(loadEnv({ ...REQUIRED, SESSION_COOKIE_DOMAIN: '.ranhduong.vn' }).SESSION_COOKIE_DOMAIN).toBe('.ranhduong.vn');
  });

  it('thiếu thông tin Google thì dừng với lỗi nêu đúng tên biến', () => {
    expect(() => loadEnv({ MONGODB_URI: REQUIRED.MONGODB_URI })).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('URL không phải http(s) hoặc tên cookie lạ thì báo lỗi', () => {
    expect(() => loadEnv({ ...REQUIRED, ADMIN_URL: 'javascript:alert(1)' })).toThrow(/ADMIN_URL/);
    expect(() => loadEnv({ ...REQUIRED, SESSION_COOKIE_NAME: 'sid;x' })).toThrow(/SESSION_COOKIE_NAME/);
  });
});

describe('loadDbEnv', () => {
  it('lệnh seed chỉ cần MONGODB_URI, chưa cấu hình Google vẫn chạy được', () => {
    expect(loadDbEnv({ MONGODB_URI: REQUIRED.MONGODB_URI })).toEqual({ MONGODB_URI: REQUIRED.MONGODB_URI });
  });
});
```

- [ ] **Step 2: Chạy test, phải đỏ**

Run: `pnpm --filter @ranhduong/api exec vitest run src/config/env.test.ts`
Expected: FAIL (`loadDbEnv` chưa có, `GOOGLE_CLIENT_ID` chưa bắt buộc).

- [ ] **Step 3: Viết `env.ts`**

`apps/api/src/config/env.ts`:

```ts
import { z } from 'zod';

const csv = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean);
const httpUrl = (fallback: string) =>
  z.url({ protocol: /^https?$/ }).default(fallback).transform((s) => s.replace(/\/+$/, ''));

const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().default(3001),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  /** Các nguồn được gọi API kèm cookie: web khách và admin, cách nhau bằng dấu phẩy. */
  WEB_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5174').transform(csv),
  /** Email được vào admin (S04), cách nhau bằng dấu phẩy, không phân biệt hoa thường. Để trống thì không ai vào được. */
  ADMIN_EMAILS: z.string().default('').transform((s) => csv(s).map((e) => e.toLowerCase())),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  /** URL công khai của API, dùng để tạo redirect_uri cho Google; là https thì cookie có cờ Secure. */
  API_PUBLIC_URL: httpUrl('http://localhost:3001'),
  /** URL app admin: nơi chuyển về sau khi đăng nhập. */
  ADMIN_URL: httpUrl('http://localhost:5174'),
  /** Domain cookie phiên: production `.ranhduong.vn`, staging `.staging.ranhduong.vn`, local để trống. */
  SESSION_COOKIE_DOMAIN: z.string().default('').transform((s) => s.trim() || undefined),
  /** Tên cookie phiên. Staging phải đặt khác production, vì cookie `.ranhduong.vn` cũng được gửi tới api.staging. */
  SESSION_COOKIE_NAME: z.string().regex(/^[a-z_]+$/).default('sid'),
});

export type Env = z.infer<typeof EnvSchema>;

const DbEnvSchema = EnvSchema.pick({ MONGODB_URI: true });
export type DbEnv = z.infer<typeof DbEnvSchema>;

function invalidEnv(error: z.ZodError): never {
  const issues = error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Biến môi trường không hợp lệ:\n${issues}`);
}

/** Đọc và kiểm tra biến môi trường một lần khi khởi động; sai thì dừng ngay với lỗi rõ ràng. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) invalidEnv(parsed.error);
  return parsed.data;
}

/** Chỉ biến cần cho lệnh seed (kết nối MongoDB), để seed chạy được khi chưa cấu hình Google. */
export function loadDbEnv(source: NodeJS.ProcessEnv = process.env): DbEnv {
  const parsed = DbEnvSchema.safeParse(source);
  if (!parsed.success) invalidEnv(parsed.error);
  return parsed.data;
}

export const ENV = Symbol('ENV');
```

- [ ] **Step 4: Chạy test env, phải xanh**

Run: `pnpm --filter @ranhduong/api exec vitest run src/config/env.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Thêm ioredis, viết test helper Redis (đỏ)**

Run: `pnpm --filter @ranhduong/api add ioredis@^5.11.1`

> ioredis 6 mới ra; dùng bản 5 vì API đã ổn định và lockfile đã có sẵn 5.11.1. Nâng lên 6 để ở story khác.

`apps/api/src/testing/redis.test.ts`:

```ts
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestRedis, dropTestRedis, testKeys } from './redis';

describe('helper Redis cho test', () => {
  let a: Redis;
  let b: Redis;
  beforeAll(async () => {
    a = await connectTestRedis();
    b = await connectTestRedis();
  });
  afterAll(async () => {
    await dropTestRedis(a);
    await dropTestRedis(b);
  });

  it('mỗi kết nối có tiền tố riêng nên không thấy khoá của nhau', async () => {
    await a.set('sess:gia-lap', '1');
    expect(await testKeys(a, 'sess:*')).toEqual(['sess:gia-lap']);
    expect(await testKeys(b)).toEqual([]);
    expect(await b.get('sess:gia-lap')).toBeNull();
  });

  it('dropTestRedis xoá mọi khoá của kết nối và đóng kết nối', async () => {
    const c = await connectTestRedis();
    await c.set('oauth:gia-lap', '1');
    const prefix = c.options.keyPrefix ?? '';
    await dropTestRedis(c);
    expect(c.status).toBe('end');
    const raw = new Redis(process.env.REDIS_TEST_URL ?? 'redis://localhost:6379');
    try {
      expect(await raw.exists(`${prefix}oauth:gia-lap`)).toBe(0);
    } finally {
      await raw.quit();
    }
  });
});
```

Run: `pnpm --filter @ranhduong/api exec vitest run src/testing/redis.test.ts`
Expected: FAIL, báo không tìm thấy module `./redis`.

- [ ] **Step 6: Viết helper Redis**

`apps/api/src/testing/redis.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';

// Chỉ dùng trong test, không nằm trong build. Local: `pnpm infra:up`; CI: service container redis.
const TEST_URL = process.env.REDIS_TEST_URL ?? 'redis://localhost:6379';

/** Kết nối Redis với tiền tố khoá ngẫu nhiên, để các file test chạy song song không đụng nhau. */
export async function connectTestRedis(): Promise<Redis> {
  const redis = new Redis(TEST_URL, {
    keyPrefix: `test:${randomUUID().slice(0, 8)}:`,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await redis.connect();
  } catch (err) {
    throw new Error(`Không kết nối được Redis test tại ${TEST_URL}. Chạy \`pnpm infra:up\` trước.`, { cause: err });
  }
  return redis;
}

/** Liệt kê khoá của kết nối theo mẫu (ví dụ 'sess:*'), đã bỏ tiền tố. KEYS chỉ dùng trong test. */
export async function testKeys(redis: Redis, pattern = '*'): Promise<string[]> {
  const prefix = redis.options.keyPrefix ?? '';
  // ioredis không thêm keyPrefix vào mẫu của KEYS và không bỏ tiền tố trong kết quả.
  return (await redis.keys(`${prefix}${pattern}`)).map((k) => k.slice(prefix.length)).sort();
}

/** Xoá mọi khoá của kết nối test rồi đóng kết nối. */
export async function dropTestRedis(redis: Redis): Promise<void> {
  if (redis.status === 'end') return;
  const keys = await testKeys(redis);
  if (keys.length > 0) await redis.del(...keys);
  await redis.quit();
}
```

Run: `pnpm --filter @ranhduong/api exec vitest run src/testing/redis.test.ts`
Expected: PASS (2 test).

- [ ] **Step 7: Module ENV và Redis toàn cục; sửa AppModule và SeedModule**

`apps/api/src/config/config.module.ts`:

```ts
import { type DynamicModule, Module } from '@nestjs/common';
import { ENV, type Env } from './env';

/** Cung cấp ENV (đã kiểm bằng Zod) cho mọi module; test truyền Env giả. */
@Module({})
export class ConfigModule {
  static register(env: Env): DynamicModule {
    return { module: ConfigModule, global: true, providers: [{ provide: ENV, useValue: env }], exports: [ENV] };
  }
}
```

`apps/api/src/shared/redis/redis.module.ts`:

```ts
import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV, type Env } from '../../config/env';

export const REDIS = Symbol('REDIS');

/** Một kết nối Redis dùng chung (phiên, state OAuth; sau này cache, rate limit). */
@Global()
@Module({
  providers: [{ provide: REDIS, inject: [ENV], useFactory: (env: Env) => new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 }) }],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status !== 'end') await this.redis.quit();
  }
}
```

`apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { CitiesModule } from './modules/cities/cities.module';
import { PlacesModule } from './modules/places/places.module';
import { RedisModule } from './shared/redis/redis.module';

const env = loadEnv();

@Module({
  imports: [ConfigModule.register(env), MongooseModule.forRoot(env.MONGODB_URI), RedisModule, CitiesModule, PlacesModule],
  controllers: [HealthController],
})
export class AppModule {}
```

`apps/api/src/seed/seed.module.ts`: đổi `loadEnv` thành `loadDbEnv` (cả dòng import lẫn dòng `const env = loadDbEnv();`), các phần khác giữ nguyên.

- [ ] **Step 8: CI, turbo, `.env.example`, decisions**

`.github/workflows/ci.yml`: trong `services`, thêm `redis` ngay sau `mongo`; trong `env`, thêm `REDIS_TEST_URL`:

```yaml
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      MONGODB_TEST_URI: mongodb://localhost:27017
      REDIS_TEST_URL: redis://localhost:6379
```

`turbo.json`: `"test": { "dependsOn": ["^build"], "passThroughEnv": ["MONGODB_TEST_URI", "REDIS_TEST_URL"] }`.

`.env.example`: thay khối "Đăng nhập admin (S04)" bằng:

```bash
# Đăng nhập admin (S04), xem docs/runbooks/admin-login.md. API không chạy nếu thiếu GOOGLE_CLIENT_ID/SECRET.
ADMIN_EMAILS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
API_PUBLIC_URL=http://localhost:3001
ADMIN_URL=http://localhost:5174
# Production: .ranhduong.vn; staging: .staging.ranhduong.vn; local để trống
SESSION_COOKIE_DOMAIN=
# Staging đặt khác production (ví dụ sid_staging)
SESSION_COOKIE_NAME=sid
```

`docs/decisions.md`: thêm dòng:

```markdown
| 2026-10-07 | Redis qua ioredis 5 (`RedisModule` toàn cục); test dùng Redis thật (`pnpm infra:up`, CI service `redis:7-alpine`), mỗi kết nối test một tiền tố khoá ngẫu nhiên | Phiên và state OAuth cần Redis (ADR 0009); ioredis là client BullMQ dùng về sau; chưa lên ioredis 6 vì vừa ra |
| 2026-10-07 | `GOOGLE_CLIENT_ID`/`SECRET` bắt buộc khi chạy API; lệnh seed đọc riêng `loadDbEnv()` | Thiếu cấu hình đăng nhập thì dừng ngay với lỗi rõ; seed staging không phụ thuộc Google |
```

Cập nhật `apps/api/.env` của bạn theo `.env.example` (thêm các biến mới; giá trị Google tạm thời điền chuỗi bất kỳ cho tới khi có client thật).

- [ ] **Step 9: Kiểm tra**

Run: `pnpm turbo run lint typecheck test build --filter=@ranhduong/api`
Expected: PASS.

Run: `pnpm seed`
Expected: chạy được như trước (seed không cần biến Google).

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/config apps/api/src/shared/redis apps/api/src/testing/redis.ts apps/api/src/testing/redis.test.ts apps/api/src/app.module.ts apps/api/src/seed/seed.module.ts apps/api/package.json pnpm-lock.yaml .github/workflows/ci.yml turbo.json .env.example docs/decisions.md
git commit -m "feat: S04 add redis and auth env config"
```

---

### Task 3: Phiên trong Redis và thuộc tính cookie

**Files:**
- Create: `apps/api/src/shared/crypto/random-token.ts`
- Create: `apps/api/src/shared/redis/parse-stored.ts`
- Create: `apps/api/src/shared/http/cookies.ts`, `cookies.test.ts`
- Create: `apps/api/src/shared/session/admin-emails.ts`, `admin-emails.test.ts`
- Create: `apps/api/src/shared/session/session.store.ts`, `session.store.test.ts`
- Create: `apps/api/src/shared/session/session-cookie.ts`, `session-cookie.test.ts`

**Interfaces:**
- Consumes: `REDIS` (Task 2), `Env` (Task 2), `AdminSession` (Task 1), `connectTestRedis`/`dropTestRedis` (Task 2).
- Produces:
  - `randomToken(): string`: 43 ký tự base64url (32 byte ngẫu nhiên); `RANDOM_TOKEN_PATTERN: RegExp`
  - `parseStored<T>(schema: z.ZodType<T>, raw: string | null): T | null`
  - `readCookie(header: string | undefined, name: string): string | undefined`
  - `isAllowedAdmin(email: string, allowed: readonly string[]): boolean`
  - `SESSION_TTL_S = 2592000`; `SessionData = { email: string; subject: string; createdAt: string }` (Zod + type)
  - `SessionStore`: `create(data: SessionData): Promise<string>` (trả sid), `get(sid: string | undefined): Promise<SessionData | null>` (gia hạn TTL), `destroy(sid: string | undefined): Promise<void>`
  - `cookieSecure(env): boolean`, `sessionCookieOptions(env): CookieOptions`, `clearSessionCookieOptions(env): CookieOptions`, với `env: Pick<Env, 'API_PUBLIC_URL' | 'SESSION_COOKIE_DOMAIN'>`

- [ ] **Step 1: Thêm kiểu Express**

Run: `pnpm --filter @ranhduong/api add -D @types/express@^5.0.6`

- [ ] **Step 2: Viết test (đỏ)**

`apps/api/src/shared/http/cookies.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readCookie } from './cookies';

describe('readCookie', () => {
  it('đọc đúng cookie theo tên, bỏ khoảng trắng', () => {
    expect(readCookie('sid=abc', 'sid')).toBe('abc');
    expect(readCookie('a=1;  sid=abc ; b=2', 'sid')).toBe('abc');
  });
  it('không nhầm với cookie có tên chứa tên cần tìm', () => {
    expect(readCookie('xsid=sai; sid_staging=sai; sid=dung', 'sid')).toBe('dung');
  });
  it('giữ dấu = trong giá trị và decode %XX', () => {
    expect(readCookie('t=a=b=c', 't')).toBe('a=b=c');
    expect(readCookie('t=a%20b', 't')).toBe('a b');
    expect(readCookie('t=%E0%A4%A', 't')).toBe('%E0%A4%A');
  });
  it('không có header hoặc không có cookie thì trả undefined', () => {
    expect(readCookie(undefined, 'sid')).toBeUndefined();
    expect(readCookie('', 'sid')).toBeUndefined();
    expect(readCookie('a=1; sidabc', 'sid')).toBeUndefined();
  });
});
```

`apps/api/src/shared/session/admin-emails.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isAllowedAdmin } from './admin-emails';

const ALLOWED = ['quan-tri-gia-lap@example.com'];

describe('isAllowedAdmin', () => {
  it('email trong danh sách, không phân biệt hoa thường và khoảng trắng hai đầu', () => {
    expect(isAllowedAdmin('quan-tri-gia-lap@example.com', ALLOWED)).toBe(true);
    expect(isAllowedAdmin(' Quan-Tri-Gia-Lap@Example.COM ', ALLOWED)).toBe(true);
  });
  it('email gần giống vẫn bị từ chối (không gộp dấu chấm của Gmail, không so theo đuôi)', () => {
    expect(isAllowedAdmin('quantri-gia-lap@example.com', ALLOWED)).toBe(false);
    expect(isAllowedAdmin('quan-tri-gia-lap@example.com.gia-lap.example', ALLOWED)).toBe(false);
    expect(isAllowedAdmin('x.quan-tri-gia-lap@example.com', ALLOWED)).toBe(false);
  });
  it('danh sách trống hoặc email rỗng thì không ai vào được', () => {
    expect(isAllowedAdmin('quan-tri-gia-lap@example.com', [])).toBe(false);
    expect(isAllowedAdmin('', [''])).toBe(false);
  });
});
```

`apps/api/src/shared/session/session-cookie.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clearSessionCookieOptions, sessionCookieOptions } from './session-cookie';
import { SESSION_TTL_S } from './session.store';

const LOCAL = { API_PUBLIC_URL: 'http://localhost:3001', SESSION_COOKIE_DOMAIN: undefined };
const PROD = { API_PUBLIC_URL: 'https://api.ranhduong.vn', SESSION_COOKIE_DOMAIN: '.ranhduong.vn' };

describe('cookie phiên', () => {
  it('local http: HttpOnly, SameSite=Lax, không Secure, không Domain, sống 30 ngày', () => {
    expect(sessionCookieOptions(LOCAL)).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: SESSION_TTL_S * 1000 });
  });
  it('production https: Secure và Domain=.ranhduong.vn', () => {
    expect(sessionCookieOptions(PROD)).toMatchObject({ secure: true, domain: '.ranhduong.vn' });
  });
  it('xoá cookie dùng cùng path và domain như lúc đặt', () => {
    expect(clearSessionCookieOptions(PROD)).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', domain: '.ranhduong.vn' });
  });
});
```

`apps/api/src/shared/session/session.store.test.ts`:

```ts
import type { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestRedis, dropTestRedis } from '../../testing/redis';
import { SESSION_TTL_S, type SessionData, SessionStore } from './session.store';

const DATA: SessionData = {
  email: 'quan-tri-gia-lap@example.com',
  subject: 'google-sub-gia-lap-1',
  createdAt: '2026-10-07T03:00:00.000Z',
};

describe('SessionStore', () => {
  let redis: Redis;
  let store: SessionStore;
  beforeAll(async () => {
    redis = await connectTestRedis();
    store = new SessionStore(redis);
  });
  afterAll(async () => {
    await dropTestRedis(redis);
  });

  it('tạo phiên với sid ngẫu nhiên 43 ký tự, TTL 30 ngày, đọc lại đúng dữ liệu', async () => {
    const sid = await store.create(DATA);
    expect(sid).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await store.get(sid)).toEqual(DATA);
    expect(await redis.ttl(`sess:${sid}`)).toBeGreaterThan(SESSION_TTL_S - 5);
  });

  it('mỗi lần tạo là một sid khác', async () => {
    expect(await store.create(DATA)).not.toBe(await store.create(DATA));
  });

  it('đọc phiên thì gia hạn lại đủ 30 ngày', async () => {
    const sid = await store.create(DATA);
    await redis.expire(`sess:${sid}`, 60);
    await store.get(sid);
    expect(await redis.ttl(`sess:${sid}`)).toBeGreaterThan(SESSION_TTL_S - 5);
  });

  it('xoá phiên thì không đọc được nữa', async () => {
    const sid = await store.create(DATA);
    await store.destroy(sid);
    expect(await store.get(sid)).toBeNull();
  });

  it('sid thiếu, sai định dạng hoặc không tồn tại thì trả null', async () => {
    expect(await store.get(undefined)).toBeNull();
    expect(await store.get('*')).toBeNull();
    expect(await store.get('a'.repeat(43))).toBeNull();
    await expect(store.destroy('*')).resolves.toBeUndefined();
  });

  it('dữ liệu trong Redis bị hỏng thì coi như không có phiên', async () => {
    const sid = 'b'.repeat(43);
    await redis.set(`sess:${sid}`, '{hỏng');
    expect(await store.get(sid)).toBeNull();
    await redis.set(`sess:${sid}`, JSON.stringify({ email: 'khong-phai-email' }));
    expect(await store.get(sid)).toBeNull();
  });
});
```

- [ ] **Step 3: Chạy test, phải đỏ**

Run: `pnpm --filter @ranhduong/api exec vitest run src/shared`
Expected: FAIL, báo không tìm thấy các module `./cookies`, `./admin-emails`, `./session-cookie`, `./session.store`.

- [ ] **Step 4: Viết code**

`apps/api/src/shared/crypto/random-token.ts`:

```ts
import { randomBytes } from 'node:crypto';

/** Chuỗi ngẫu nhiên 32 byte dạng base64url (43 ký tự): sid, state OAuth, code_verifier PKCE. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export const RANDOM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
```

`apps/api/src/shared/redis/parse-stored.ts`:

```ts
import type { z } from 'zod';

/** Đọc JSON đã lưu trong Redis và kiểm bằng schema; không có, JSON hỏng hoặc sai schema thì trả null. */
export function parseStored<T>(schema: z.ZodType<T>, raw: string | null): T | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
```

`apps/api/src/shared/http/cookies.ts`:

```ts
/** Đọc một cookie từ header `Cookie` (Express không tự đọc cookie khi không có cookie-parser). */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}
```

`apps/api/src/shared/session/admin-emails.ts`:

```ts
/**
 * Lát 1 chưa phân vai trò: admin là email nằm trong ADMIN_EMAILS (loadEnv đã đổi sang chữ thường).
 * So khớp nguyên email, không gộp dấu chấm của Gmail, không so theo đuôi tên miền.
 */
export function isAllowedAdmin(email: string, allowed: readonly string[]): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 && allowed.includes(normalized);
}
```

`apps/api/src/shared/session/session.store.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { AdminSession } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { RANDOM_TOKEN_PATTERN, randomToken } from '../crypto/random-token';
import { parseStored } from '../redis/parse-stored';
import { REDIS } from '../redis/redis.module';

/** Phiên sống 30 ngày, gia hạn mỗi lần dùng (ADR 0009). */
export const SESSION_TTL_S = 30 * 24 * 60 * 60;

/** Dữ liệu phiên trong Redis: phần trả ra ngoài (AdminSession), cộng `sub` Google và thời điểm tạo. */
export const SessionData = AdminSession.extend({ subject: z.string().min(1), createdAt: z.iso.datetime() });
export type SessionData = z.infer<typeof SessionData>;

const key = (sid: string) => `sess:${sid}`;
const isSid = (sid: string | undefined): sid is string => sid !== undefined && RANDOM_TOKEN_PATTERN.test(sid);

/** Phiên phía server trong Redis, khoá `sess:{sid}`. Xoá khoá là thu hồi phiên. */
@Injectable()
export class SessionStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create(data: SessionData): Promise<string> {
    const sid = randomToken();
    await this.redis.set(key(sid), JSON.stringify(SessionData.parse(data)), 'EX', SESSION_TTL_S);
    return sid;
  }

  /** Đọc phiên và gia hạn TTL trong cùng một lệnh (GETEX). */
  async get(sid: string | undefined): Promise<SessionData | null> {
    if (!isSid(sid)) return null;
    return parseStored(SessionData, await this.redis.getex(key(sid), 'EX', SESSION_TTL_S));
  }

  async destroy(sid: string | undefined): Promise<void> {
    if (isSid(sid)) await this.redis.del(key(sid));
  }
}
```

`apps/api/src/shared/session/session-cookie.ts`:

```ts
import type { CookieOptions } from 'express';
import type { Env } from '../../config/env';
import { SESSION_TTL_S } from './session.store';

type CookieEnv = Pick<Env, 'API_PUBLIC_URL' | 'SESSION_COOKIE_DOMAIN'>;

/** Cookie chỉ gửi qua https khi API chạy https; local http thì tắt để trình duyệt vẫn lưu. */
export function cookieSecure(env: Pick<Env, 'API_PUBLIC_URL'>): boolean {
  return env.API_PUBLIC_URL.startsWith('https://');
}

/** Thuộc tính dùng cả khi đặt lẫn khi xoá, để trình duyệt xoá đúng cookie (ADR 0009). */
export function clearSessionCookieOptions(env: CookieEnv): CookieOptions {
  return {
    httpOnly: true,
    secure: cookieSecure(env),
    sameSite: 'lax',
    path: '/',
    ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
  };
}

/** Cookie phiên sống bằng TTL phiên trong Redis. */
export function sessionCookieOptions(env: CookieEnv): CookieOptions {
  return { ...clearSessionCookieOptions(env), maxAge: SESSION_TTL_S * 1000 };
}
```

- [ ] **Step 5: Chạy test, phải xanh**

Run: `pnpm --filter @ranhduong/api exec vitest run src/shared`
Expected: PASS hết.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared apps/api/package.json pnpm-lock.yaml
git commit -m "feat: S04 add redis session store and cookie helpers"
```

---

### Task 4: Client Google OAuth (PKCE và xác minh `id_token`)

**Files:**
- Create: `apps/api/src/modules/auth/pkce.ts`, `pkce.test.ts`
- Create: `apps/api/src/modules/auth/google-oauth.client.ts`, `google-oauth.client.test.ts`
- Modify: `apps/api/package.json` (qua `pnpm add`), `docs/decisions.md`

**Interfaces:**
- Consumes: `randomToken` (Task 3).
- Produces:
  - `codeChallengeS256(verifier: string): string`, `createPkcePair(): { verifier: string; challenge: string }`
  - `GoogleIdentity = { subject: string; email: string; emailVerified: boolean }` (email đã đổi sang chữ thường)
  - `abstract class GoogleOAuth { authorizeUrl(p: { state: string; codeChallenge: string }): string; exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity> }`, dùng làm token DI
  - `GoogleOAuthClient extends GoogleOAuth`, khởi tạo bằng `new GoogleOAuthClient({ clientId, clientSecret, redirectUri, fetch?, jwks? })`
  - `GoogleOAuthError extends Error`

- [ ] **Step 1: Thêm jose**

Run: `pnpm --filter @ranhduong/api add jose@^6.2.12`

`docs/decisions.md`: thêm dòng:

```markdown
| 2026-10-07 | Đăng nhập Google tự viết theo Authorization Code + PKCE, xác minh `id_token` bằng `jose` (JWKS của Google); không dùng passport hay google-auth-library | Luồng ngắn và đọc được hết; `jose` không có phụ thuộc phụ; test ký `id_token` bằng khoá tự sinh, không gọi Google |
```

- [ ] **Step 2: Viết test (đỏ)**

`apps/api/src/modules/auth/pkce.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { codeChallengeS256, createPkcePair } from './pkce';

describe('PKCE', () => {
  it('challenge S256 khớp ví dụ trong RFC 7636 phụ lục B', () => {
    expect(codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('verifier 43 ký tự hợp lệ, mỗi lần một cặp mới', () => {
    const a = createPkcePair();
    const b = createPkcePair();
    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.challenge).toBe(codeChallengeS256(a.verifier));
    expect(a.verifier).not.toBe(b.verifier);
  });
});
```

`apps/api/src/modules/auth/google-oauth.client.test.ts`:

```ts
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWTPayload, SignJWT } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GoogleOAuthClient, GoogleOAuthError } from './google-oauth.client';

const CLIENT_ID = 'client-id-gia-lap.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:3001/v1/auth/google/callback';
type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

let googleKey: KeyPair;
let otherKey: KeyPair;
let jwks: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  googleKey = await generateKeyPair('RS256');
  otherKey = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(googleKey.publicKey)), kid: 'khoa-gia-lap', alg: 'RS256' }] });
});

interface TokenOptions {
  claims?: JWTPayload;
  issuer?: string;
  audience?: string;
  /** Giây so với hiện tại; âm là đã hết hạn. */
  expiresInS?: number;
  key?: KeyPair;
}

/** id_token giả, cấu trúc giống id_token Google. */
async function idToken(o: TokenOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: 'Quan-Tri-Gia-Lap@Example.com', email_verified: true, ...o.claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'khoa-gia-lap' })
    .setSubject('google-sub-gia-lap-1')
    .setIssuer(o.issuer ?? 'https://accounts.google.com')
    .setAudience(o.audience ?? CLIENT_ID)
    .setIssuedAt(now - 60)
    .setExpirationTime(now + (o.expiresInS ?? 300))
    .sign((o.key ?? googleKey).privateKey);
}

function tokenEndpoint(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function client(fetchImpl: typeof fetch) {
  return new GoogleOAuthClient({ clientId: CLIENT_ID, clientSecret: 'client-secret-gia-lap', redirectUri: REDIRECT_URI, fetch: fetchImpl, jwks });
}

describe('GoogleOAuthClient.authorizeUrl', () => {
  it('tạo URL Authorization Code + PKCE S256, chỉ xin openid email, luôn cho chọn tài khoản', () => {
    const url = new URL(client(tokenEndpoint({})).authorizeUrl({ state: 'state-gia-lap', codeChallenge: 'challenge-gia-lap' }));
    expect(`${url.origin}${url.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email',
      state: 'state-gia-lap',
      code_challenge: 'challenge-gia-lap',
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
  });
});

describe('GoogleOAuthClient.exchangeCode', () => {
  it('gửi code, code_verifier, client secret tới token endpoint và trả danh tính đã xác minh', async () => {
    const fetchMock = tokenEndpoint({ id_token: await idToken(), access_token: 'ya29.gia-lap', token_type: 'Bearer', expires_in: 3599 });
    const identity = await client(fetchMock).exchangeCode('code-gia-lap', 'verifier-gia-lap');
    expect(identity).toEqual({ subject: 'google-sub-gia-lap-1', email: 'quan-tri-gia-lap@example.com', emailVerified: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init?.method).toBe('POST');
    expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
      code: 'code-gia-lap',
      code_verifier: 'verifier-gia-lap',
      client_id: CLIENT_ID,
      client_secret: 'client-secret-gia-lap',
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });
  });

  it('email chưa xác minh thì trả emailVerified false để service từ chối', async () => {
    const identity = await client(tokenEndpoint({ id_token: await idToken({ claims: { email_verified: false } }) })).exchangeCode('c', 'v');
    expect(identity.emailVerified).toBe(false);
  });

  // Tuỳ chọn tạo bằng hàm vì otherKey chỉ có giá trị sau beforeAll.
  it.each<[string, () => TokenOptions]>([
    ['ký bằng khoá không phải của Google', () => ({ key: otherKey })],
    ['audience của app khác', () => ({ audience: 'client-khac.apps.googleusercontent.com' })],
    ['issuer lạ', () => ({ issuer: 'https://gia-lap.example' })],
    ['đã hết hạn', () => ({ expiresInS: -60 })],
  ])('từ chối id_token %s', async (_label, options) => {
    const token = await idToken(options());
    await expect(client(tokenEndpoint({ id_token: token })).exchangeCode('c', 'v')).rejects.toThrow();
  });

  it('token endpoint trả lỗi, thiếu id_token hoặc id_token thiếu email thì ném GoogleOAuthError', async () => {
    await expect(client(tokenEndpoint({ error: 'invalid_grant' }, 400)).exchangeCode('c', 'v')).rejects.toBeInstanceOf(GoogleOAuthError);
    await expect(client(tokenEndpoint({ access_token: 'x' })).exchangeCode('c', 'v')).rejects.toBeInstanceOf(GoogleOAuthError);
    const noEmail = await idToken({ claims: { email: undefined } });
    await expect(client(tokenEndpoint({ id_token: noEmail })).exchangeCode('c', 'v')).rejects.toBeInstanceOf(GoogleOAuthError);
  });
});
```

- [ ] **Step 3: Chạy test, phải đỏ**

Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/auth`
Expected: FAIL, báo không tìm thấy module `./pkce`, `./google-oauth.client`.

- [ ] **Step 4: Viết code**

`apps/api/src/modules/auth/pkce.ts`:

```ts
import { createHash } from 'node:crypto';
import { randomToken } from '../../shared/crypto/random-token';

/** PKCE S256 (RFC 7636): challenge = base64url(SHA-256(verifier)). */
export function codeChallengeS256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Verifier 43 ký tự base64url, đúng giới hạn 43–128 ký tự của RFC 7636. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken();
  return { verifier, challenge: codeChallengeS256(verifier) };
}
```

`apps/api/src/modules/auth/google-oauth.client.ts`:

```ts
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { z } from 'zod';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Danh tính lấy từ id_token đã xác minh chữ ký, issuer, audience và hạn dùng. */
export interface GoogleIdentity {
  subject: string;
  /** Đã đổi sang chữ thường. */
  email: string;
  emailVerified: boolean;
}

/** Cổng tới Google OAuth, đồng thời là token DI; test thay bằng bản giả. */
export abstract class GoogleOAuth {
  abstract authorizeUrl(params: { state: string; codeChallenge: string }): string;
  abstract exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity>;
}

export interface GoogleOAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Test truyền fetch giả và bộ khoá cục bộ; mặc định gọi Google thật. */
  fetch?: typeof fetch;
  jwks?: JWTVerifyGetKey;
}

export class GoogleOAuthError extends Error {}

const TokenResponse = z.object({ id_token: z.string().min(1) });
const IdTokenClaims = z.object({ sub: z.string().min(1), email: z.email(), email_verified: z.boolean() });

export class GoogleOAuthClient extends GoogleOAuth {
  private readonly fetchFn: typeof fetch;
  private readonly jwks: JWTVerifyGetKey;

  constructor(private readonly options: GoogleOAuthOptions) {
    super();
    this.fetchFn = options.fetch ?? ((input, init) => fetch(input, init));
    this.jwks = options.jwks ?? createRemoteJWKSet(new URL(JWKS_URL));
  }

  authorizeUrl({ state, codeChallenge }: { state: string; codeChallenge: string }): string {
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity> {
    const res = await this.fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        code_verifier: codeVerifier,
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        redirect_uri: this.options.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new GoogleOAuthError(`Google trả HTTP ${res.status} khi đổi code`);
    const token = TokenResponse.safeParse(await res.json());
    if (!token.success) throw new GoogleOAuthError('Phản hồi token của Google thiếu id_token');

    const { payload } = await jwtVerify(token.data.id_token, this.jwks, {
      issuer: ISSUERS,
      audience: this.options.clientId,
      algorithms: ['RS256'],
    });
    const claims = IdTokenClaims.safeParse(payload);
    if (!claims.success) throw new GoogleOAuthError('id_token thiếu sub, email hoặc email_verified');
    return { subject: claims.data.sub, email: claims.data.email.toLowerCase(), emailVerified: claims.data.email_verified };
  }
}
```

> Nếu bản `jose` cài được không export kiểu `JWTVerifyGetKey`, thay bằng `ReturnType<typeof createLocalJWKSet>`; không dùng `any`.

- [ ] **Step 5: Chạy test, phải xanh**

Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/auth`
Expected: PASS hết.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/pkce.ts apps/api/src/modules/auth/pkce.test.ts apps/api/src/modules/auth/google-oauth.client.ts apps/api/src/modules/auth/google-oauth.client.test.ts apps/api/package.json pnpm-lock.yaml docs/decisions.md
git commit -m "feat: S04 add google oauth client with pkce"
```

---

### Task 5: State OAuth và use case đăng nhập (`AuthService`)

**Files:**
- Create: `apps/api/src/modules/auth/oauth-state.store.ts`, `oauth-state.store.test.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`, `auth.service.test.ts`
- Create: `apps/api/src/testing/env.ts`

**Interfaces:**
- Consumes: `parseReturnTo`, `OAuthCallbackQuery`, `LoginError`, `ReturnToPath` (Task 1); `Env`, `ENV`, `loadEnv` (Task 2); `SessionStore`, `isAllowedAdmin`, `randomToken`, `parseStored` (Task 3); `GoogleOAuth`, `GoogleIdentity`, `createPkcePair`, `codeChallengeS256` (Task 4).
- Produces:
  - `OAUTH_STATE_TTL_S = 600`; `OAuthStateStore`: `save(state: string, pending: { codeVerifier: string; returnTo: string }): Promise<void>`, `take(state: string): Promise<PendingLogin | null>` (lấy và xoá)
  - `AuthService.start(rawReturnTo: unknown): Promise<{ state: string; redirectUrl: string }>`
  - `AuthService.finish(rawQuery: unknown, stateCookie: string | undefined): Promise<LoginFinish>`, với `LoginFinish = { ok: true; sid: string; redirectTo: string } | { ok: false; error: LoginError; redirectTo: string }`
  - `AuthService.logout(sid: string | undefined): Promise<void>`
  - `testEnv(overrides?: Record<string, string>): Env`, mặc định `ADMIN_EMAILS=quan-tri-gia-lap@example.com`, `ADMIN_URL=http://admin.gia-lap.example`

- [ ] **Step 1: Viết helper env giả và test (đỏ)**

`apps/api/src/testing/env.ts`:

```ts
import { type Env, loadEnv } from '../config/env';

/** Env giả cho test, đi qua đúng loadEnv để giống lúc chạy thật. Chỉ dùng trong test. */
export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    MONGODB_URI: 'mongodb://localhost:27017/gia-lap',
    GOOGLE_CLIENT_ID: 'client-id-gia-lap.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'client-secret-gia-lap',
    ADMIN_EMAILS: 'quan-tri-gia-lap@example.com',
    ADMIN_URL: 'http://admin.gia-lap.example',
    ...overrides,
  });
}
```

`apps/api/src/modules/auth/oauth-state.store.test.ts`:

```ts
import type { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestRedis, dropTestRedis } from '../../testing/redis';
import { OAUTH_STATE_TTL_S, OAuthStateStore } from './oauth-state.store';

const PENDING = { codeVerifier: 'v'.repeat(43), returnTo: '/dia-diem' };

describe('OAuthStateStore', () => {
  let redis: Redis;
  let store: OAuthStateStore;
  beforeAll(async () => {
    redis = await connectTestRedis();
    store = new OAuthStateStore(redis);
  });
  afterAll(async () => {
    await dropTestRedis(redis);
  });

  it('lưu 10 phút và lấy lại đúng dữ liệu', async () => {
    await store.save('state-1', PENDING);
    const ttl = await redis.ttl('oauth:state-1');
    expect(ttl).toBeGreaterThan(OAUTH_STATE_TTL_S - 5);
    expect(ttl).toBeLessThanOrEqual(OAUTH_STATE_TTL_S);
    expect(await store.take('state-1')).toEqual(PENDING);
  });

  it('mỗi state chỉ lấy được một lần', async () => {
    await store.save('state-2', PENDING);
    await store.take('state-2');
    expect(await store.take('state-2')).toBeNull();
  });

  it('hai callback cùng state tới cùng lúc thì chỉ một bên lấy được', async () => {
    await store.save('state-3', PENDING);
    const results = await Promise.all([store.take('state-3'), store.take('state-3'), store.take('state-3')]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it('state lạ hoặc dữ liệu hỏng thì trả null', async () => {
    expect(await store.take('khong-ton-tai')).toBeNull();
    await redis.set('oauth:state-4', JSON.stringify({ codeVerifier: 'ngan', returnTo: '//gia-lap.example' }));
    expect(await store.take('state-4')).toBeNull();
  });
});
```

`apps/api/src/modules/auth/auth.service.test.ts`:

```ts
import type { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from '../../shared/session/session.store';
import { testEnv } from '../../testing/env';
import { connectTestRedis, dropTestRedis, testKeys } from '../../testing/redis';
import { AuthService } from './auth.service';
import { GoogleOAuth, type GoogleIdentity } from './google-oauth.client';
import { OAuthStateStore } from './oauth-state.store';
import { codeChallengeS256 } from './pkce';

const ADMIN = 'http://admin.gia-lap.example';

/** Google giả: ghi lại các lần đổi code, trả danh tính đặt sẵn hoặc ném lỗi. */
class FakeGoogle extends GoogleOAuth {
  identity: GoogleIdentity = { subject: 'google-sub-gia-lap-1', email: 'quan-tri-gia-lap@example.com', emailVerified: true };
  failWith: Error | null = null;
  readonly exchanged: { code: string; codeVerifier: string }[] = [];

  authorizeUrl({ state, codeChallenge }: { state: string; codeChallenge: string }): string {
    return `https://google.gia-lap.example/auth?state=${state}&code_challenge=${codeChallenge}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity> {
    this.exchanged.push({ code, codeVerifier });
    if (this.failWith) throw this.failWith;
    return this.identity;
  }
}

describe('AuthService', () => {
  let redis: Redis;
  let states: OAuthStateStore;
  let sessions: SessionStore;
  let google: FakeGoogle;
  const service = (env = testEnv()) => new AuthService(env, google, states, sessions);

  beforeAll(async () => {
    redis = await connectTestRedis();
    states = new OAuthStateStore(redis);
    sessions = new SessionStore(redis);
  });
  afterAll(async () => {
    await dropTestRedis(redis);
  });
  beforeEach(async () => {
    google = new FakeGoogle();
    const keys = await testKeys(redis);
    if (keys.length > 0) await redis.del(...keys);
  });

  describe('start', () => {
    it('lưu code_verifier và returnTo theo state, chuyển sang Google với challenge S256 của đúng verifier đó', async () => {
      const { state, redirectUrl } = await service().start('/dia-diem/abc');
      const url = new URL(redirectUrl);
      expect(url.searchParams.get('state')).toBe(state);
      const pending = await states.take(state);
      expect(pending?.returnTo).toBe('/dia-diem/abc');
      expect(url.searchParams.get('code_challenge')).toBe(codeChallengeS256(pending?.codeVerifier ?? ''));
    });

    it.each([['//gia-lap.example'], ['/\t/gia-lap.example'], ['https://gia-lap.example'], [undefined], [['/a', '/b']]])(
      'returnTo không an toàn (%s) thì lưu "/"',
      async (raw) => {
        const { state } = await service().start(raw);
        expect((await states.take(state))?.returnTo).toBe('/');
      },
    );
  });

  describe('finish', () => {
    it('email trong danh sách: tạo phiên và quay về đúng trang admin đang mở', async () => {
      const svc = service();
      const { state } = await svc.start('/dia-diem/abc');
      const result = await svc.finish({ state, code: 'code-gia-lap' }, state);
      expect(result).toMatchObject({ ok: true, redirectTo: `${ADMIN}/dia-diem/abc` });
      if (!result.ok) throw new Error('phải đăng nhập được');
      expect(await sessions.get(result.sid)).toMatchObject({ email: 'quan-tri-gia-lap@example.com', subject: 'google-sub-gia-lap-1' });
      expect(google.exchanged).toEqual([{ code: 'code-gia-lap', codeVerifier: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) }]);
    });

    it('so email không phân biệt hoa thường, phiên lưu email chữ thường', async () => {
      google.identity = { ...google.identity, email: 'Quan-Tri-Gia-Lap@Example.com' };
      const svc = service();
      const { state } = await svc.start('/');
      const result = await svc.finish({ state, code: 'c' }, state);
      if (!result.ok) throw new Error('phải đăng nhập được');
      expect((await sessions.get(result.sid))?.email).toBe('quan-tri-gia-lap@example.com');
    });

    it('email không có trong danh sách: not_allowed, không tạo phiên nào', async () => {
      google.identity = { ...google.identity, email: 'nguoi-la-gia-lap@example.com' };
      const svc = service();
      const { state } = await svc.start('/dia-diem');
      expect(await svc.finish({ state, code: 'c' }, state)).toEqual({
        ok: false,
        error: 'not_allowed',
        redirectTo: `${ADMIN}/dang-nhap?error=not_allowed`,
      });
      expect(await testKeys(redis, 'sess:*')).toEqual([]);
    });

    it('email chưa xác minh với Google: not_allowed dù có trong danh sách', async () => {
      google.identity = { ...google.identity, emailVerified: false };
      const svc = service();
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'not_allowed' });
      expect(await testKeys(redis, 'sess:*')).toEqual([]);
    });

    it('ADMIN_EMAILS trống: không ai vào được', async () => {
      const svc = service(testEnv({ ADMIN_EMAILS: '' }));
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'not_allowed' });
    });

    it('state lạ hoặc đã quá 10 phút: expired', async () => {
      expect(await service().finish({ state: 'khong-ton-tai', code: 'c' }, 'khong-ton-tai')).toMatchObject({ ok: false, error: 'expired' });
      expect(google.exchanged).toEqual([]);
    });

    it('state chỉ dùng được một lần', async () => {
      const svc = service();
      const { state } = await svc.start('/');
      await svc.finish({ state, code: 'c' }, state);
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'expired' });
      expect(google.exchanged).toHaveLength(1);
    });

    it('cookie state thiếu hoặc không khớp (login CSRF): failed, không đổi code', async () => {
      const svc = service();
      for (const cookie of [undefined, 'state-khac']) {
        const { state } = await svc.start('/');
        expect(await svc.finish({ state, code: 'c' }, cookie)).toMatchObject({ ok: false, error: 'failed' });
      }
      expect(google.exchanged).toEqual([]);
    });

    it('người dùng bấm Huỷ ở Google: failed', async () => {
      const svc = service();
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, error: 'access_denied' }, state)).toMatchObject({ ok: false, error: 'failed' });
      expect(google.exchanged).toEqual([]);
    });

    it('Google lỗi khi đổi code hoặc id_token sai: failed, không tạo phiên', async () => {
      google.failWith = new Error('invalid_grant');
      const svc = service();
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'failed' });
      expect(await testKeys(redis, 'sess:*')).toEqual([]);
    });

    it('query sai dạng (thiếu state, tham số lặp): failed', async () => {
      expect(await service().finish({ code: 'c' }, undefined)).toMatchObject({ ok: false, error: 'failed' });
      expect(await service().finish({ state: ['a', 'b'], code: 'c' }, 'a')).toMatchObject({ ok: false, error: 'failed' });
    });
  });

  describe('logout', () => {
    it('xoá phiên; không có cookie thì không làm gì', async () => {
      const sid = await sessions.create({ email: 'quan-tri-gia-lap@example.com', subject: 's', createdAt: new Date().toISOString() });
      await service().logout(sid);
      expect(await sessions.get(sid)).toBeNull();
      await expect(service().logout(undefined)).resolves.toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Chạy test, phải đỏ**

Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/auth/oauth-state.store.test.ts src/modules/auth/auth.service.test.ts`
Expected: FAIL, báo không tìm thấy module `./oauth-state.store`, `./auth.service`.

- [ ] **Step 3: Viết code**

`apps/api/src/modules/auth/oauth-state.store.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ReturnToPath } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { parseStored } from '../../shared/redis/parse-stored';
import { REDIS } from '../../shared/redis/redis.module';

/** state và code_verifier sống 10 phút (ADR 0009). */
export const OAUTH_STATE_TTL_S = 10 * 60;

const PendingLogin = z.object({ codeVerifier: z.string().min(43), returnTo: ReturnToPath });
export type PendingLogin = z.infer<typeof PendingLogin>;

const key = (state: string) => `oauth:${state}`;

/** Lần đăng nhập đang chờ Google trả về, khoá `oauth:{state}` trong Redis. */
@Injectable()
export class OAuthStateStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async save(state: string, pending: PendingLogin): Promise<void> {
    await this.redis.set(key(state), JSON.stringify(pending), 'EX', OAUTH_STATE_TTL_S);
  }

  /** Lấy và xoá trong một lệnh (GETDEL): mỗi state chỉ dùng được một lần, kể cả khi hai callback tới cùng lúc. */
  async take(state: string): Promise<PendingLogin | null> {
    return parseStored(PendingLogin, await this.redis.getdel(key(state)));
  }
}
```

`apps/api/src/modules/auth/auth.service.ts`:

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type LoginError, OAuthCallbackQuery, parseReturnTo } from '@ranhduong/contracts';
import { ENV, type Env } from '../../config/env';
import { randomToken } from '../../shared/crypto/random-token';
import { isAllowedAdmin } from '../../shared/session/admin-emails';
import { SessionStore } from '../../shared/session/session.store';
import { GoogleOAuth, type GoogleIdentity } from './google-oauth.client';
import { OAuthStateStore } from './oauth-state.store';
import { createPkcePair } from './pkce';

export interface LoginStart {
  state: string;
  redirectUrl: string;
}

export type LoginFinish = { ok: true; sid: string; redirectTo: string } | { ok: false; error: LoginError; redirectTo: string };

/** Đăng nhập admin bằng Google: Authorization Code + PKCE phía server; chỉ email trong ADMIN_EMAILS mới có phiên. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly google: GoogleOAuth,
    private readonly states: OAuthStateStore,
    private readonly sessions: SessionStore,
  ) {}

  async start(rawReturnTo: unknown): Promise<LoginStart> {
    const state = randomToken();
    const { verifier, challenge } = createPkcePair();
    await this.states.save(state, { codeVerifier: verifier, returnTo: parseReturnTo(rawReturnTo) });
    return { state, redirectUrl: this.google.authorizeUrl({ state, codeChallenge: challenge }) };
  }

  /**
   * Xử lý callback theo thứ tự: lấy và xoá state (chỉ dùng một lần) → so với cookie của trình duyệt (chặn login CSRF)
   * → đổi code → kiểm email đã xác minh và nằm trong danh sách. Chỉ bước cuối mới tạo phiên.
   */
  async finish(rawQuery: unknown, stateCookie: string | undefined): Promise<LoginFinish> {
    const query = OAuthCallbackQuery.safeParse(rawQuery);
    if (!query.success) return this.fail('failed');
    const { state, code, error } = query.data;

    const pending = await this.states.take(state);
    if (!pending) return this.fail('expired');
    if (stateCookie !== state) return this.fail('failed');
    if (error || !code) return this.fail('failed');

    let identity: GoogleIdentity;
    try {
      identity = await this.google.exchangeCode(code, pending.codeVerifier);
    } catch (err) {
      this.logger.warn(`Đổi code Google thất bại: ${err instanceof Error ? err.message : String(err)}`);
      return this.fail('failed');
    }

    const email = identity.email.trim().toLowerCase();
    if (!identity.emailVerified || !isAllowedAdmin(email, this.env.ADMIN_EMAILS)) {
      this.logger.warn(`Từ chối đăng nhập admin: ${email}${identity.emailVerified ? '' : ' (email chưa xác minh)'}`);
      return this.fail('not_allowed');
    }

    const sid = await this.sessions.create({ email, subject: identity.subject, createdAt: new Date().toISOString() });
    this.logger.log(`Admin đăng nhập: ${email}`);
    return { ok: true, sid, redirectTo: this.adminUrl(pending.returnTo) };
  }

  async logout(sid: string | undefined): Promise<void> {
    await this.sessions.destroy(sid);
  }

  private fail(error: LoginError): LoginFinish {
    return { ok: false, error, redirectTo: this.adminUrl(`/dang-nhap?error=${error}`) };
  }

  /** Ghép đường dẫn với ADMIN_URL. Lớp chặn cuối: nếu kết quả lệch origin thì về trang chủ admin. */
  private adminUrl(path: string): string {
    const base = new URL(this.env.ADMIN_URL);
    const url = new URL(path, base);
    return url.origin === base.origin ? url.toString() : base.toString();
  }
}
```

- [ ] **Step 4: Chạy test, phải xanh**

Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/auth`
Expected: PASS hết.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/oauth-state.store.ts apps/api/src/modules/auth/oauth-state.store.test.ts apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.service.test.ts apps/api/src/testing/env.ts
git commit -m "feat: S04 add admin login use case with email allowlist"
```

---

### Task 6: Endpoint HTTP, AdminGuard, OriginGuard

**Files:**
- Create: `apps/api/src/shared/http/origin.guard.ts`
- Create: `apps/api/src/shared/session/admin.guard.ts`, `session.module.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`, `auth.module.ts`, `auth.http.test.ts`
- Create: `apps/api/src/setup-app.ts`
- Modify: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/package.json` (qua `pnpm add`), `docs/decisions.md`

**Interfaces:**
- Consumes: mọi thứ từ Task 1–5.
- Produces:
  - `GET /v1/auth/google/start?returnTo=`: trả 302 sang Google, đặt cookie `rd_oauth_state` (host-only, 10 phút)
  - `GET /v1/auth/google/callback?state&code|error`: trả 302 về `ADMIN_URL + returnTo` kèm cookie phiên, hoặc về `ADMIN_URL/dang-nhap?error=<LoginError>`
  - `GET /v1/auth/session`: `200 AdminSession` | `401 { code: 'UNAUTHENTICATED' }` | `403 { code: 'FORBIDDEN' }`
  - `POST /v1/auth/logout`: trả `204`, xoá phiên và cookie
  - `AdminGuard`, `CurrentSession()`: các story sau dùng bằng `@UseGuards(AdminGuard)` cho route `/admin/*`
  - `OriginGuard`: guard toàn cục
  - `setupApp(app: INestApplication, env: Env): void`

- [ ] **Step 1: Thêm `@nestjs/testing`**

Run: `pnpm --filter @ranhduong/api add -D @nestjs/testing@^12.1.2`

`docs/decisions.md`: thêm dòng:

```markdown
| 2026-10-07 | `@nestjs/testing` (dev) cho test HTTP: dựng module thật, thay Redis và Google bằng bản test, gọi bằng `fetch` của Node; không thêm supertest. `@types/express` (dev) cho kiểu Request/Response/CookieOptions | Kiểm được cookie, redirect, guard, CORS đúng như chạy thật |
```

- [ ] **Step 2: Viết test HTTP (đỏ)**

`apps/api/src/modules/auth/auth.http.test.ts`:

```ts
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConfigModule } from '../../config/config.module';
import { setupApp } from '../../setup-app';
import { REDIS, RedisModule } from '../../shared/redis/redis.module';
import { SessionModule } from '../../shared/session/session.module';
import { SESSION_TTL_S, SessionStore } from '../../shared/session/session.store';
import { testEnv } from '../../testing/env';
import { connectTestRedis, dropTestRedis, testKeys } from '../../testing/redis';
import { AuthModule } from './auth.module';
import { GoogleOAuth, type GoogleIdentity } from './google-oauth.client';

const ADMIN = 'http://admin.gia-lap.example';
const STRANGER_ORIGIN = 'http://ke-la.gia-lap.example';
const env = testEnv({ ADMIN_URL: ADMIN, WEB_ORIGINS: `http://web.gia-lap.example,${ADMIN}` });

const IDENTITIES: Record<string, GoogleIdentity> = {
  'code-quan-tri': { subject: 'google-sub-quan-tri', email: 'quan-tri-gia-lap@example.com', emailVerified: true },
  'code-nguoi-la': { subject: 'google-sub-nguoi-la', email: 'nguoi-la-gia-lap@example.com', emailVerified: true },
};

/** Google giả: URL đăng nhập giả, đổi code theo bảng IDENTITIES. */
class FakeGoogle extends GoogleOAuth {
  authorizeUrl({ state, codeChallenge }: { state: string; codeChallenge: string }): string {
    return `https://google.gia-lap.example/auth?state=${state}&code_challenge=${codeChallenge}`;
  }

  async exchangeCode(code: string): Promise<GoogleIdentity> {
    const identity = IDENTITIES[code];
    if (!identity) throw new Error('code giả không hợp lệ');
    return identity;
  }
}

interface CallOptions {
  method?: string;
  cookie?: string;
  headers?: Record<string, string>;
}

describe('Đăng nhập admin qua HTTP', () => {
  let app: INestApplication;
  let redis: Redis;
  let base: string;

  beforeAll(async () => {
    redis = await connectTestRedis();
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.register(env), RedisModule, SessionModule, AuthModule],
    })
      .overrideProvider(REDIS)
      .useValue(redis)
      .overrideProvider(GoogleOAuth)
      .useValue(new FakeGoogle())
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app, env);
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/v1`;
  });
  afterAll(async () => {
    // Đóng Redis trước; RedisModule thấy kết nối đã đóng thì bỏ qua.
    await dropTestRedis(redis);
    await app.close();
  });
  beforeEach(async () => {
    const keys = await testKeys(redis);
    if (keys.length > 0) await redis.del(...keys);
  });

  /** Gọi API, không tự theo redirect để đọc được Location và Set-Cookie. */
  const call = (path: string, { method = 'GET', cookie, headers = {} }: CallOptions = {}) =>
    fetch(`${base}${path}`, { method, redirect: 'manual', headers: cookie ? { ...headers, cookie } : headers });
  /** Dòng Set-Cookie của một cookie, kèm thuộc tính. */
  const setCookie = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  /** Phần `name=value` để gửi lại trong header Cookie. */
  const pair = (line: string | undefined) => line?.split(';')[0] ?? '';

  async function startLogin(returnTo = '/dia-diem/abc') {
    const res = await call(`/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`);
    const state = new URL(res.headers.get('location') ?? '').searchParams.get('state') ?? '';
    return { res, state, stateCookie: pair(setCookie(res, 'rd_oauth_state')) };
  }

  async function login(code: string) {
    const { state, stateCookie } = await startLogin();
    return call(`/auth/google/callback?state=${state}&code=${code}`, { cookie: stateCookie });
  }

  async function adminCookie(): Promise<string> {
    return pair(setCookie(await login('code-quan-tri'), env.SESSION_COOKIE_NAME));
  }

  it('start: chuyển sang Google, gắn state vào cookie host-only 10 phút', async () => {
    const { res, state } = await startLogin();
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^https:\/\/google\.gia-lap\.example\/auth\?state=/);
    const cookie = setCookie(res, 'rd_oauth_state') ?? '';
    expect(cookie.startsWith(`rd_oauth_state=${state};`)).toBe(true);
    expect(cookie).toMatch(/Max-Age=600/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).not.toMatch(/Domain=/);
  });

  it('email trong danh sách: cookie phiên 30 ngày, về đúng trang admin, xem được phiên', async () => {
    const res = await login('code-quan-tri');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${ADMIN}/dia-diem/abc`);
    const sid = setCookie(res, env.SESSION_COOKIE_NAME) ?? '';
    expect(sid).toMatch(new RegExp(`Max-Age=${SESSION_TTL_S}`));
    expect(sid).toMatch(/Path=\//);
    expect(sid).toMatch(/HttpOnly/);
    expect(sid).toMatch(/SameSite=Lax/);
    expect(setCookie(res, 'rd_oauth_state')).toMatch(/Expires=Thu, 01 Jan 1970/);

    const session = await call('/auth/session', { cookie: pair(sid) });
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({ email: 'quan-tri-gia-lap@example.com' });
  });

  it('email ngoài danh sách: về /dang-nhap?error=not_allowed, không cookie phiên, không phiên trong Redis', async () => {
    const res = await login('code-nguoi-la');
    expect(res.headers.get('location')).toBe(`${ADMIN}/dang-nhap?error=not_allowed`);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toBeUndefined();
    expect(await testKeys(redis, 'sess:*')).toEqual([]);
  });

  it('mở link callback mà trình duyệt không có cookie state (login CSRF): failed', async () => {
    const { state } = await startLogin();
    const res = await call(`/auth/google/callback?state=${state}&code=code-quan-tri`);
    expect(res.headers.get('location')).toBe(`${ADMIN}/dang-nhap?error=failed`);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it('dùng lại callback lần hai: expired', async () => {
    const { state, stateCookie } = await startLogin();
    await call(`/auth/google/callback?state=${state}&code=code-quan-tri`, { cookie: stateCookie });
    const again = await call(`/auth/google/callback?state=${state}&code=code-quan-tri`, { cookie: stateCookie });
    expect(again.headers.get('location')).toBe(`${ADMIN}/dang-nhap?error=expired`);
  });

  it('GET /auth/session không có cookie hoặc cookie lạ: 401 UNAUTHENTICATED', async () => {
    const name = env.SESSION_COOKIE_NAME;
    for (const cookie of [undefined, `${name}=${'a'.repeat(43)}`, `${name}=*`]) {
      const res = await call('/auth/session', { cookie });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ code: 'UNAUTHENTICATED', message: expect.any(String) });
    }
  });

  it('phiên của email đã bị bỏ khỏi ADMIN_EMAILS: 403 FORBIDDEN', async () => {
    const sid = await app.get(SessionStore).create({
      email: 'da-bi-go-gia-lap@example.com',
      subject: 'google-sub-da-bi-go',
      createdAt: new Date().toISOString(),
    });
    const res = await call('/auth/session', { cookie: `${env.SESSION_COOKIE_NAME}=${sid}` });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: 'FORBIDDEN', message: expect.any(String) });
  });

  it('qua AdminGuard thì cookie phiên được đặt lại đủ 30 ngày (phiên trượt)', async () => {
    const cookie = await adminCookie();
    const res = await call('/auth/session', { cookie });
    expect(pair(setCookie(res, env.SESSION_COOKIE_NAME))).toBe(cookie);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toMatch(new RegExp(`Max-Age=${SESSION_TTL_S}`));
  });

  it('đăng xuất từ admin: 204, xoá phiên trong Redis và xoá cookie', async () => {
    const cookie = await adminCookie();
    const res = await call('/auth/logout', { method: 'POST', cookie, headers: { origin: ADMIN } });
    expect(res.status).toBe(204);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(await testKeys(redis, 'sess:*')).toEqual([]);
    expect((await call('/auth/session', { cookie })).status).toBe(401);
  });

  it('POST từ nguồn lạ hoặc không có Origin: 403, phiên còn nguyên', async () => {
    const cookie = await adminCookie();
    const variants: Record<string, string>[] = [{ origin: STRANGER_ORIGIN }, {}];
    for (const headers of variants) {
      const res = await call('/auth/logout', { method: 'POST', cookie, headers });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ code: 'FORBIDDEN', message: expect.any(String) });
    }
    expect((await call('/auth/session', { cookie })).status).toBe(200);
  });

  it('CORS: admin được gửi cookie, nguồn lạ thì không', async () => {
    const preflight = (origin: string) =>
      call('/auth/logout', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } });
    const allowed = await preflight(ADMIN);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ADMIN);
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    expect((await preflight(STRANGER_ORIGIN)).headers.get('access-control-allow-origin')).toBeNull();
  });
});
```

- [ ] **Step 3: Chạy test, phải đỏ**

Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/auth/auth.http.test.ts`
Expected: FAIL, báo không tìm thấy module `../../setup-app`, `../../shared/session/session.module`, `./auth.module`.

- [ ] **Step 4: Viết guard và module phiên**

`apps/api/src/shared/http/origin.guard.ts`:

```ts
import { type CanActivate, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { ApiError } from '@ranhduong/contracts';
import type { Request } from 'express';
import type { Env } from '../../config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Chống CSRF cùng với SameSite=Lax (ADR 0009): request ghi dữ liệu phải có Origin nằm trong WEB_ORIGINS.
 * setupApp tự tạo guard này bằng `new`, không đăng ký qua DI.
 */
export class OriginGuard implements CanActivate {
  constructor(private readonly env: Pick<Env, 'WEB_ORIGINS'>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin !== undefined && this.env.WEB_ORIGINS.includes(origin)) return true;
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Nguồn gửi request không được phép.' } satisfies ApiError);
  }
}
```

`apps/api/src/shared/session/admin.guard.ts`:

```ts
import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ApiError } from '@ranhduong/contracts';
import type { Request, Response } from 'express';
import { ENV, type Env } from '../../config/env';
import { readCookie } from '../http/cookies';
import { isAllowedAdmin } from './admin-emails';
import { sessionCookieOptions } from './session-cookie';
import { type SessionData, SessionStore } from './session.store';

const SESSION = Symbol('adminSession');
type RequestWithSession = Request & { [SESSION]?: SessionData };

/**
 * Chặn route quản trị: cần cookie phiên hợp lệ (401), và email vẫn nằm trong ADMIN_EMAILS (403).
 * Danh sách được kiểm lại ở mỗi request: bỏ một email khỏi ADMIN_EMAILS rồi khởi động lại API là thu hồi quyền ngay.
 * Qua guard thì cookie được đặt lại, để cookie trượt 30 ngày cùng TTL trong Redis.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly sessions: SessionStore,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<RequestWithSession>();
    const sid = readCookie(req.headers.cookie, this.env.SESSION_COOKIE_NAME);
    const session = await this.sessions.get(sid);
    if (!sid || !session) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Bạn cần đăng nhập để dùng trang quản trị.' } satisfies ApiError);
    }
    if (!isAllowedAdmin(session.email, this.env.ADMIN_EMAILS)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Email này không có quyền quản trị.' } satisfies ApiError);
    }
    http.getResponse<Response>().cookie(this.env.SESSION_COOKIE_NAME, sid, sessionCookieOptions(this.env));
    req[SESSION] = session;
    return true;
  }
}

/** Phiên admin của request; chỉ dùng trên route có AdminGuard. */
export const CurrentSession = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionData => {
  const session = ctx.switchToHttp().getRequest<RequestWithSession>()[SESSION];
  if (!session) throw new Error('CurrentSession chỉ dùng sau AdminGuard');
  return session;
});
```

`apps/api/src/shared/session/session.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { SessionStore } from './session.store';

/** Phiên và AdminGuard dùng chung: controller quản trị ở mọi module chỉ cần @UseGuards(AdminGuard). */
@Global()
@Module({ providers: [SessionStore, AdminGuard], exports: [SessionStore, AdminGuard] })
export class SessionModule {}
```

- [ ] **Step 5: Viết controller, module auth, `setupApp`**

`apps/api/src/modules/auth/auth.controller.ts`:

```ts
import { Controller, Get, HttpCode, Inject, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminSession } from '@ranhduong/contracts';
import type { CookieOptions, Request, Response } from 'express';
import { ENV, type Env } from '../../config/env';
import { readCookie } from '../../shared/http/cookies';
import { AdminGuard, CurrentSession } from '../../shared/session/admin.guard';
import { clearSessionCookieOptions, cookieSecure, sessionCookieOptions } from '../../shared/session/session-cookie';
import type { SessionData } from '../../shared/session/session.store';
import { AuthService } from './auth.service';
import { OAUTH_STATE_TTL_S } from './oauth-state.store';

/** Cookie gắn state với trình duyệt đã bắt đầu đăng nhập: host-only, sống 10 phút như state trong Redis. */
const OAUTH_STATE_COOKIE = 'rd_oauth_state';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Admin mở URL này bằng điều hướng toàn trang (thẻ <a>), không gọi bằng fetch. */
  @Get('google/start')
  async start(@Query('returnTo') returnTo: unknown, @Res() res: Response): Promise<void> {
    const { state, redirectUrl } = await this.auth.start(returnTo);
    res.cookie(OAUTH_STATE_COOKIE, state, { ...this.stateCookie(), maxAge: OAUTH_STATE_TTL_S * 1000 });
    res.redirect(302, redirectUrl);
  }

  @Get('google/callback')
  async callback(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const result = await this.auth.finish(query, readCookie(req.headers.cookie, OAUTH_STATE_COOKIE));
    res.clearCookie(OAUTH_STATE_COOKIE, this.stateCookie());
    if (result.ok) res.cookie(this.env.SESSION_COOKIE_NAME, result.sid, sessionCookieOptions(this.env));
    res.redirect(302, result.redirectTo);
  }

  @Get('session')
  @UseGuards(AdminGuard)
  session(@CurrentSession() session: SessionData): AdminSession {
    return AdminSession.parse(session);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readCookie(req.headers.cookie, this.env.SESSION_COOKIE_NAME));
    res.clearCookie(this.env.SESSION_COOKIE_NAME, clearSessionCookieOptions(this.env));
  }

  private stateCookie(): CookieOptions {
    return { httpOnly: true, secure: cookieSecure(this.env), sameSite: 'lax', path: '/' };
  }
}
```

`apps/api/src/modules/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuth, GoogleOAuthClient } from './google-oauth.client';
import { OAuthStateStore } from './oauth-state.store';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthStateStore,
    {
      provide: GoogleOAuth,
      inject: [ENV],
      useFactory: (env: Env) =>
        new GoogleOAuthClient({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          // Phải khớp prefix /v1 trong setupApp và redirect URI khai trên Google Auth Platform.
          redirectUri: `${env.API_PUBLIC_URL}/v1/auth/google/callback`,
        }),
    },
  ],
})
export class AuthModule {}
```

`apps/api/src/setup-app.ts`:

```ts
import type { INestApplication } from '@nestjs/common';
import type { Env } from './config/env';
import { OriginGuard } from './shared/http/origin.guard';

/** Cấu hình HTTP dùng chung cho main.ts và test HTTP: prefix /v1, CORS có credentials, kiểm Origin. */
export function setupApp(app: INestApplication, env: Env): void {
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: env.WEB_ORIGINS, credentials: true });
  app.useGlobalGuards(new OriginGuard(env));
}
```

`apps/api/src/main.ts`:

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { setupApp } from './setup-app';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  setupApp(app, env);
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
  console.log(`API chạy tại http://localhost:${env.API_PORT}/v1/health`);
}

void bootstrap();
```

`apps/api/src/app.module.ts`: thêm `SessionModule` và `AuthModule` vào `imports`, sau `RedisModule`:

```ts
  imports: [
    ConfigModule.register(env),
    MongooseModule.forRoot(env.MONGODB_URI),
    RedisModule,
    SessionModule,
    CitiesModule,
    PlacesModule,
    AuthModule,
  ],
```

(thêm import `SessionModule` từ `./shared/session/session.module` và `AuthModule` từ `./modules/auth/auth.module`).

- [ ] **Step 6: Chạy test, phải xanh**

Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/auth/auth.http.test.ts`
Expected: PASS (11 test).

- [ ] **Step 7: Kiểm tra toàn API và thử nhanh bằng curl**

Run: `pnpm turbo run lint typecheck test build --filter=@ranhduong/api`
Expected: PASS.

Chạy `pnpm --filter @ranhduong/api dev` (Mongo, Redis đang bật), rồi:

```bash
curl -si "http://localhost:3001/v1/auth/google/start?returnTo=/dia-diem" | grep -iE "^(HTTP|location|set-cookie)"
# Expected: HTTP/1.1 302, location: https://accounts.google.com/o/oauth2/v2/auth?client_id=…&code_challenge_method=S256…,
#           set-cookie: rd_oauth_state=…; Max-Age=600; Path=/; …; HttpOnly; SameSite=Lax
curl -si http://localhost:3001/v1/auth/session | head -1
# Expected: HTTP/1.1 401
curl -si -X POST http://localhost:3001/v1/auth/logout | head -1
# Expected: HTTP/1.1 403 (không có Origin)
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/shared/http/origin.guard.ts apps/api/src/shared/session/admin.guard.ts apps/api/src/shared/session/session.module.ts apps/api/src/modules/auth/auth.controller.ts apps/api/src/modules/auth/auth.module.ts apps/api/src/modules/auth/auth.http.test.ts apps/api/src/setup-app.ts apps/api/src/main.ts apps/api/src/app.module.ts apps/api/package.json pnpm-lock.yaml docs/decisions.md
git commit -m "feat: S04 add admin auth endpoints, admin guard and origin check"
```

---

### Task 7: Admin: trang đăng nhập, router guard, đăng xuất

Đây là phần giao diện, không bắt buộc TDD (CLAUDE.md, vùng TDD). Kiểm bằng lint, build và thử trên trình duyệt ở 390px trước, rồi desktop.

**Files:**
- Modify: `apps/admin/src/shared/api/client.ts`
- Create: `apps/admin/src/entities/session/index.ts`
- Create: `apps/admin/src/features/auth/index.ts`
- Create: `apps/admin/src/pages/LoginPage.vue`
- Modify: `apps/admin/src/app/router.ts`, `apps/admin/src/app/App.vue`, `apps/admin/src/app/main.ts`

**Interfaces:**
- Consumes: `AdminSession`, `LoginError` (Task 1); `GET /v1/auth/session`, `GET /v1/auth/google/start`, `POST /v1/auth/logout` (Task 6).
- Produces: route `/dang-nhap` (`meta.public`), `loadSession()`, `sessionState`, `googleLoginUrl()`, `logout()`.

- [ ] **Step 1: `client.ts` export `API_BASE`**

```ts
import { ofetch } from 'ofetch';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/v1';

/** Client gọi API dùng chung cho admin: luôn gửi cookie phiên (.ranhduong.vn). */
export const api = ofetch.create({ baseURL: API_BASE, credentials: 'include' });

export interface HealthResponse { status: 'ok'; db: 'up' | 'down'; time: string }
```

- [ ] **Step 2: Entity phiên**

`apps/admin/src/entities/session/index.ts`:

```ts
import { AdminSession } from '@ranhduong/contracts';
import { FetchError } from 'ofetch';
import { ref } from 'vue';
import { api } from '@/shared/api/client';

export type SessionState =
  | { status: 'signed-in'; session: AdminSession }
  | { status: 'signed-out' }
  | { status: 'forbidden' }
  | { status: 'unavailable' };

/** Phiên hiện tại; thanh bên đọc để hiện email. */
export const sessionState = ref<SessionState>({ status: 'signed-out' });

/** Hỏi API phiên hiện tại. 401: chưa đăng nhập; 403: email đã bị bỏ khỏi danh sách; lỗi khác: không kết nối được. */
export async function loadSession(): Promise<SessionState> {
  sessionState.value = await fetchSession();
  return sessionState.value;
}

async function fetchSession(): Promise<SessionState> {
  try {
    return { status: 'signed-in', session: AdminSession.parse(await api('/auth/session')) };
  } catch (err) {
    if (err instanceof FetchError && err.statusCode === 401) return { status: 'signed-out' };
    if (err instanceof FetchError && err.statusCode === 403) return { status: 'forbidden' };
    return { status: 'unavailable' };
  }
}
```

- [ ] **Step 3: Feature đăng nhập, đăng xuất**

`apps/admin/src/features/auth/index.ts`:

```ts
import { sessionState } from '@/entities/session';
import { API_BASE, api } from '@/shared/api/client';

/** URL bắt đầu đăng nhập Google. Mở bằng điều hướng toàn trang để API đặt cookie rồi chuyển sang Google. */
export function googleLoginUrl(returnTo: string): string {
  const url = new URL(`${API_BASE}/auth/google/start`);
  url.searchParams.set('returnTo', returnTo);
  return url.toString();
}

/** Đăng xuất: API xoá phiên trong Redis và xoá cookie. */
export async function logout(): Promise<void> {
  await api('/auth/logout', { method: 'POST' });
  sessionState.value = { status: 'signed-out' };
}
```

- [ ] **Step 4: Trang `/dang-nhap`**

`apps/admin/src/pages/LoginPage.vue`:

```vue
<script setup lang="ts">
import type { LoginError } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { googleLoginUrl } from '@/features/auth';

// 'unavailable' do admin tự đặt khi không gọi được API; các mã còn lại do API gửi về qua ?error=.
const NOTICES: Record<LoginError | 'unavailable', string> = {
  not_allowed: 'Email này chưa có trong danh sách quản trị. Chọn tài khoản Google khác, hoặc nhờ chủ dự án thêm email của bạn.',
  expired: 'Lần đăng nhập vừa rồi đã quá 10 phút. Bấm đăng nhập lại.',
  failed: 'Chưa đăng nhập được. Thử lại; nếu vẫn lỗi thì báo chủ dự án.',
  unavailable: 'Chưa kết nối được máy chủ. Thử lại sau ít phút.',
};

function isNoticeCode(code: unknown): code is keyof typeof NOTICES {
  return typeof code === 'string' && Object.hasOwn(NOTICES, code);
}

const route = useRoute();
const notice = computed(() => {
  const code = route.query.error;
  return isNoticeCode(code) ? NOTICES[code] : null;
});
const loginUrl = computed(() => {
  const returnTo = route.query.returnTo;
  return googleLoginUrl(typeof returnTo === 'string' ? returnTo : '/dia-diem');
});
</script>

<template>
  <main class="login">
    <section class="card" aria-labelledby="login-title">
      <p class="brand">Rành Đường · Quản trị</p>
      <h1 id="login-title">Đăng nhập</h1>
      <p class="hint">Dùng tài khoản Google có trong danh sách quản trị.</p>
      <p v-if="notice" class="notice" role="alert">{{ notice }}</p>
      <a class="google" :href="loginUrl">Đăng nhập bằng Google</a>
    </section>
  </main>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; place-items: center; padding: 0 var(--page-gutter); box-sizing: border-box; }
.card { width: 100%; max-width: 360px; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); padding: 28px 24px; box-sizing: border-box; }
.brand { margin: 0 0 4px; font-size: 13px; color: var(--ink-soft); }
h1 { margin: 0 0 8px; font-family: var(--font-display); font-size: 26px; color: var(--ink); }
.hint { margin: 0 0 20px; font-size: 14px; color: var(--ink-soft); }
.notice { margin: 0 0 20px; padding: 12px 14px; background: var(--note); border: 1.5px solid var(--note-edge); border-radius: var(--radius-note); font-size: 14px; color: var(--ink); }
.google { display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: var(--radius-pill); background: var(--accent); color: var(--ink); font-weight: 700; font-size: 15px; text-decoration: none; }
</style>
```

- [ ] **Step 5: Router guard**

`apps/admin/src/app/router.ts`:

```ts
import { createRouter, createWebHistory } from 'vue-router';
import { loadSession } from '@/entities/session';

declare module 'vue-router' {
  interface RouteMeta {
    /** Trang mở được khi chưa đăng nhập. */
    public?: boolean;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dia-diem' },
    { path: '/dang-nhap', component: () => import('@/pages/LoginPage.vue'), meta: { public: true } },
    { path: '/dia-diem', component: () => import('@/pages/PlacesPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/dia-diem' },
  ],
});

// Mỗi lần chuyển trang đều hỏi API; API (AdminGuard) mới là nơi quyết định, router chỉ chuyển hướng cho dễ dùng.
router.beforeEach(async (to) => {
  if (to.meta.public) return true;
  const state = await loadSession();
  if (state.status === 'signed-in') return true;
  const query: Record<string, string> = { returnTo: to.fullPath };
  if (state.status === 'forbidden') query.error = 'not_allowed';
  if (state.status === 'unavailable') query.error = 'unavailable';
  return { path: '/dang-nhap', query };
});
```

- [ ] **Step 6: Layout: trang công khai không có thanh bên; thêm email và nút Đăng xuất**

`apps/admin/src/app/App.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { sessionState } from '@/entities/session';
import { logout } from '@/features/auth';

const route = useRoute();
const router = useRouter();
const logoutFailed = ref(false);

async function onLogout(): Promise<void> {
  logoutFailed.value = false;
  try {
    await logout();
    await router.replace('/dang-nhap');
  } catch {
    logoutFailed.value = true;
  }
}
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <div v-else class="layout">
    <nav class="side" aria-label="Quản trị">
      <div class="logo">Rành Đường</div>
      <div class="sub">Quản trị · Đà Lạt</div>
      <RouterLink class="nav" to="/dia-diem">Địa điểm</RouterLink>
      <div class="account">
        <span v-if="sessionState.status === 'signed-in'" class="email">{{ sessionState.session.email }}</span>
        <button type="button" class="logout" @click="onLogout">Đăng xuất</button>
        <span v-if="logoutFailed" class="logout-error" role="alert">Chưa đăng xuất được, thử lại.</span>
      </div>
    </nav>
    <main class="main"><RouterView /></main>
  </div>
</template>
```

Giữ nguyên khối `<style>` hiện có, thêm vào cuối:

```css
.account { margin-top: auto; display: flex; flex-direction: column; gap: 6px; padding: 0 10px; }
.email { font-size: 12px; overflow-wrap: anywhere; }
.logout { min-height: 44px; border: 1.5px solid var(--paper-raised); border-radius: var(--radius-chip); background: transparent; color: var(--paper-raised); font: inherit; font-size: 14px; cursor: pointer; }
.logout-error { font-size: 12px; }
```

`apps/admin/src/app/main.ts`: chỉ mount sau khi router xong lần điều hướng đầu tiên, để không thoáng thấy thanh bên trước khi bị chuyển sang `/dang-nhap`:

```ts
import '@ranhduong/ui/tokens.css';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';

const app = createApp(App).use(router);
// Lần điều hướng đầu có thể chuyển sang /dang-nhap; chờ xong rồi mới hiện giao diện.
void router.isReady().then(() => app.mount('#app'));
```

- [ ] **Step 7: Kiểm tra lint, build, thử trên trình duyệt**

Run: `pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin build`
Expected: PASS.

Thử thật ở local (cần Google OAuth client, xem "Việc của chủ dự án" mục 1; trong `apps/api/.env` có email của bạn ở `ADMIN_EMAILS`). Chạy `pnpm dev`, mở DevTools ở chế độ 390px:

1. Mở `http://localhost:5174/dia-diem` → chuyển sang `/dang-nhap?returnTo=/dia-diem`, không có thanh bên, nút "Đăng nhập bằng Google" cao ít nhất 44px, chữ `--ink` trên nền `--accent`.
2. Bấm đăng nhập bằng email trong danh sách → qua Google → về `/dia-diem`. Thanh bên hiện email; nút "Đăng xuất" dùng được bằng bàn phím (Tab, Enter).
3. Bấm "Đăng xuất" → về `/dang-nhap`; mở lại `/dia-diem` thì phải đăng nhập lại.
4. Đăng nhập bằng một tài khoản Google ngoài danh sách → về `/dang-nhap?error=not_allowed` và thấy thông báo; DevTools → Application → Cookies không có cookie `sid`.
5. Đang đăng nhập, bỏ email của bạn khỏi `ADMIN_EMAILS`, khởi động lại API, tải lại trang → về `/dang-nhap` với thông báo "Email này chưa có trong danh sách quản trị…". Thêm email lại sau khi thử xong.
6. Tắt API (Ctrl+C), tải lại `/dia-diem` → thấy "Chưa kết nối được máy chủ…", không phải trang trắng.
7. Lặp lại bước 1–2 ở khổ desktop.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/shared/api/client.ts apps/admin/src/entities/session/index.ts apps/admin/src/features/auth/index.ts apps/admin/src/pages/LoginPage.vue apps/admin/src/app/router.ts apps/admin/src/app/App.vue apps/admin/src/app/main.ts
git commit -m "feat: S04 add admin login page and route guard"
```

---

### Task 8: Runbook, tài liệu, kiểm tra cuối và thử trên staging

**Files:**
- Create: `docs/runbooks/admin-login.md`
- Modify: `README.md`, `docs/decisions.md`, `docs/backlog.md`, `CLAUDE.md`

- [ ] **Step 1: Viết runbook**

`docs/runbooks/admin-login.md`:

````markdown
# Đăng nhập admin: Google OAuth và Cloudflare Access

Một email muốn vào admin phải qua hai lớp (ADR 0004): Cloudflare Access trước `admin.ranhduong.vn`, và `ADMIN_EMAILS` của API. Thêm hay bớt admin thì luôn sửa **cả hai** nơi.

## 1. Google OAuth client cho API

Làm ở Google Cloud Console → Google Auth Platform (tên mục có thể khác chút tuỳ phiên bản console).

1. **Branding:** tên ứng dụng "Rành Đường Quản trị", email hỗ trợ của bạn.
2. **Audience:** External. Publishing status chọn *In production*: API chỉ xin scope `openid email` nên Google không yêu cầu xác minh ứng dụng. Nếu để *Testing* thì phải thêm từng admin vào Test users, thành ra một danh sách thứ ba phải giữ khớp.
3. **Clients → Create client → Web application**, tên `ranhduong-api`. Authorized redirect URIs:
   - `http://localhost:3001/v1/auth/google/callback`
   - `https://api.ranhduong.vn/v1/auth/google/callback`
   - URL callback của API staging (chốt tên miền ở S02), dạng `https://<api staging>/v1/auth/google/callback`
4. Chép Client ID và Client secret vào `apps/api/.env` (local), và vào secrets của VPS/GitHub Actions (staging, production). Không commit.

## 2. Biến môi trường theo môi trường

| Biến | Local | Staging | Production |
| --- | --- | --- | --- |
| `API_PUBLIC_URL` | `http://localhost:3001` | URL API staging (S02) | `https://api.ranhduong.vn` |
| `ADMIN_URL` | `http://localhost:5174` | URL admin staging (S02, S26) | `https://admin.ranhduong.vn` |
| `WEB_ORIGINS` | `http://localhost:3000,http://localhost:5174` | web staging, admin staging | `https://ranhduong.vn,https://admin.ranhduong.vn` |
| `SESSION_COOKIE_DOMAIN` | để trống | `.staging.ranhduong.vn` | `.ranhduong.vn` |
| `SESSION_COOKIE_NAME` | `sid` | `sid_staging` | `sid` |
| `ADMIN_EMAILS` | email của bạn | danh sách admin | danh sách admin |

- Staging phải dùng tên cookie khác production: cookie `sid` của production đặt ở `.ranhduong.vn` nên cũng được gửi tới API staging.
- Admin staging phải chạy trên một subdomain của `ranhduong.vn` (ví dụ `admin.staging.ranhduong.vn`, gắn vào nhánh `main` của dự án Pages), không dùng thẳng `*.pages.dev`. `pages.dev` là site khác `ranhduong.vn`, nên trình duyệt không gửi cookie `SameSite=Lax` tới API.
- Nếu staging bật basic auth (technical-design mục 13), thì API staging và admin staging phải nằm ngoài basic auth; admin staging đã có Access chặn.

## 3. Cloudflare Access (lớp 1)

Đường dẫn trong dashboard lấy theo tài liệu Cloudflare (10/2026): <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/>, <https://developers.cloudflare.com/pages/configuration/preview-deployments/>, <https://developers.cloudflare.com/pages/platform/known-issues/>.

1. **Cách đăng nhập:** Zero Trust → Integrations → Identity providers → Add new identity provider → Google. Dùng một OAuth client Google **riêng** (không dùng chung client của API), với redirect URI `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`. Nếu chưa muốn tạo client thứ hai, có thể tạm dùng One-time PIN (mã gửi qua email).
2. **Policy dùng lại được:** Zero Trust → Access controls → Policies → Add a policy. Tên "Quản trị Rành Đường", Action *Allow*, Include → *Emails*: đúng danh sách `ADMIN_EMAILS` của production. Session duration: 24 giờ.
3. **Ứng dụng cho tên miền riêng:** Access controls → Applications → Create new application → Self-hosted and private → Add public hostname → `admin.ranhduong.vn` (và hostname admin staging). Gắn policy ở bước 2; chọn cách đăng nhập ở bước 1.
4. **Bản preview của Pages:** Workers & Pages → dự án admin → Settings → General → Enable access policy. Bước này chỉ che các URL preview (`<hash>.<project>.pages.dev`), chưa che `<project>.pages.dev`. Gắn policy ở bước 2 vào ứng dụng Access vừa được tạo tự động.
5. **Alias `<project>.pages.dev`:** làm theo mục "Enable Access on your `*.pages.dev` domain" trong trang known issues của Pages (sửa ứng dụng Access tự tạo: bỏ `*` ở ô Subdomain, rồi bảo vệ lại bản preview). Gắn cùng policy.
6. **Kiểm tra** (cửa sổ ẩn danh, mỗi lần một tài khoản):
   - Email ngoài danh sách: `admin.ranhduong.vn`, `<project>.pages.dev` và một URL preview đều bị Access chặn, không tải được trang admin.
   - Email trong danh sách: qua Access, tới trang `/dang-nhap` của admin, đăng nhập Google lần hai (lớp API) rồi vào được `/dia-diem`.
   - Xem Zero Trust → Logs → Access để thấy các lượt bị chặn và được cho qua.

## 4. Thêm hoặc bớt admin

- **Thêm:** thêm email vào policy "Quản trị Rành Đường", rồi thêm vào `ADMIN_EMAILS` và khởi động lại API.
- **Bớt:** xoá email khỏi policy, thu hồi phiên Access của người đó trong Zero Trust (mục Users), rồi xoá khỏi `ADMIN_EMAILS` và khởi động lại API. API kiểm lại danh sách ở mỗi request, nên phiên cũ của người đó nhận 403 ngay sau khi API khởi động lại.
````

- [ ] **Step 2: README, decisions, backlog, CLAUDE.md**

`README.md`: dưới khối lệnh chạy local, thêm một dòng: `API cần GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET để khởi động; cách tạo xem docs/runbooks/admin-login.md.`

`docs/decisions.md`: thêm các dòng:

```markdown
| 2026-10-07 | Lát 1 chưa có collection `users`: phiên admin trong Redis chỉ giữ email, `sub` Google và thời điểm tạo; quyền admin là email nằm trong `ADMIN_EMAILS`, kiểm lại ở mỗi request quản trị | Backlog mục 2: đăng nhập chỉ cho admin, chưa phân vai trò; chưa tính năng nào cần `userId`; không lưu dữ liệu của email bị từ chối. Upsert `User` (technical-design mục 5 bước 4) làm ở lát 3 |
| 2026-10-07 | State OAuth vừa lưu Redis (`oauth:{state}`, GETDEL một lần dùng), vừa gắn với trình duyệt bằng cookie `rd_oauth_state` (host-only, 10 phút) | Chặn login CSRF: link callback mở ở trình duyệt khác không đăng nhập được |
| 2026-10-07 | Tên cookie phiên cấu hình bằng `SESSION_COOKIE_NAME` (production `sid`, staging `sid_staging`); admin staging chạy trên subdomain `ranhduong.vn`, không dùng `*.pages.dev` | Cookie `.ranhduong.vn` của production cũng gửi tới staging; `pages.dev` khác site nên cookie `SameSite=Lax` không được gửi tới API |
| 2026-10-07 | `OriginGuard` toàn cục: POST/PUT/PATCH/DELETE phải có `Origin` thuộc `WEB_ORIGINS`, thiếu `Origin` cũng bị chặn | ADR 0009; script gọi API ghi dữ liệu phải tự đặt header `Origin` |
```

`docs/backlog.md`:
- Hàng S04, cột trạng thái: `Code xong (PR #…); chờ S02, S26 để cấu hình Cloudflare Access và thử staging`.
- Mục 4 hoặc mục 6, phần câu hỏi mở: thêm `- [ ] Rate limit /auth/* 20/giờ mỗi IP (technical-design mục 13): làm sau S02, khi đọc được IP thật qua CF-Connecting-IP`.

`CLAUDE.md`, mục Trạng thái: thêm S04 vào dòng "Xong" kèm ghi chú "chờ cấu hình Cloudflare Access và thử staging"; dòng "Tiếp theo" bỏ S04.

- [ ] **Step 3: Commit tài liệu**

```bash
git add docs/runbooks/admin-login.md README.md docs/decisions.md docs/backlog.md CLAUDE.md
git commit -m "docs: S04 add admin login runbook and decisions"
```

- [ ] **Step 4: Kiểm tra toàn repo**

Run: `pnpm infra:up && pnpm turbo run lint typecheck test build`
Expected: PASS hết. Nếu có test đỏ, dừng lại và sửa (superpowers:systematic-debugging); không commit khi chưa xanh.

- [ ] **Step 5: Mở PR**

```bash
git push -u origin feat/S04-admin-google-login
gh pr create --title "feat: S04 admin login with Google" --body "<tóm tắt: hai lớp chặn, endpoint, cách thử; link runbook; những gì còn chờ S02/S26>"
```

Chờ CI xanh (CI phải có service Redis từ Task 2).

- [ ] **Step 6: Thử trên staging và điện thoại thật (chờ S02 và S26)**

Chưa làm được cho tới khi có tên miền, VPS và dự án Pages. Khi đã có:

1. Đặt biến môi trường staging theo runbook mục 2; thêm redirect URI staging vào Google client.
2. Cấu hình Cloudflare Access theo runbook mục 3 (bước 1–5).
3. Làm runbook mục 3 bước 6 trên điện thoại thật (Android, và iPhone nếu có) và trên desktop.
4. Lặp lại Task 7 Step 7, bước 2–5 trên staging.
5. Sau 24 giờ, kiểm tra Sentry không có lỗi mới.
6. Đổi trạng thái S04 trong `docs/backlog.md` thành xong.

- [ ] **Step 7: Báo chủ dự án**

- `apps/admin` chưa có script `typecheck` (cần thêm `vue-tsc`), nên CI chưa kiểm kiểu file `.vue`. Nên thêm ở S26 hoặc một story nhỏ riêng.
- Rate limit `/auth/*` đã ghi vào câu hỏi mở của backlog.
