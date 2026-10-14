# S28 Nền UX admin dùng chung (giai đoạn 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng lớp component và khung trang dùng chung cho `apps/admin`, rồi sửa 10 lỗi P1 (và các P2 đi kèm) ở danh sách địa điểm, form địa điểm và form lịch trình mẫu.

**Architecture:** Component Vue dùng chung đặt ở `apps/admin/src/shared/ui`, logic thuần ở `apps/admin/src/shared/lib`, một luật ESLint giữ hai thư mục này không phụ thuộc tầng trên để sau này chuyển sang `packages/ui`. CSS dùng chung là class `rd-admin-…` trong `packages/ui/src/admin.css`, chỉ có tác dụng trong `.rd-admin` (khung trang). Hộp thoại, ngăn trượt dùng `<dialog>`; không thêm thư viện.

**Tech Stack:** Vue 3.5 (`<script setup>`, `defineModel`, `useId`, generic component), vue-router 5, Vite 8, Vitest 5, Zod 4, TypeScript strict + `noUncheckedIndexedAccess`.

**Spec:** `docs/superpowers/specs/2026-10-14-admin-ux-foundation-design.md` (đọc kèm; mục và số trong plan trỏ về spec).

## Global Constraints

- Nhánh `feat/S28-admin-ux`, tạo từ commit S25; commit theo Conventional Commits có ID story: `feat: S28 …`, `docs: S28 …`.
- Không đổi API, contract Zod hay route admin; chỉ dùng endpoint đang có.
- Không thêm dependency. Không tự nâng TypeScript lên 7.
- TypeScript strict, `noUncheckedIndexedAccess`; không `any`, không `@ts-ignore`.
- Màu, font, bo góc chỉ dùng biến trong `packages/ui/src/tokens.css`; màu trong suốt dùng `color-mix(in srgb, var(--…) N%, transparent)`, không viết mã màu.
- `--accent` luôn đi với chữ `--ink`. Vùng bấm tối thiểu 44×44px (`--tap-min`), cách nhau ít nhất 8px. Ô nhập giữ chữ 16px.
- Chuyển động chỉ dùng `--dur-micro` 140ms, `--dur-standard` 200ms, `--dur-panel` 250ms, `--ease-out`; chỉ animate `transform`, `opacity` (và `scale`, `translate`). Công tắc `prefers-reduced-motion` trong `tokens.css` giữ nguyên.
- Chữ hiển thị tiếng Việt; code, tên file tiếng Anh; comment tiếng Việt được.
- `shared/ui`, `shared/lib` không import `@/entities`, `@/features`, `@/widgets`, `@/pages`, `@/shared/api`.
- Test chỉ dùng dữ liệu tên "Giả Lập". Test admin chỉ là hàm thuần và composable (Vitest, không DOM).
- Lệnh kiểm từng phần: `pnpm --filter @ranhduong/admin exec vitest run <file>`, `pnpm --filter @ranhduong/admin typecheck`, `pnpm --filter @ranhduong/admin lint`. Trước khi xong: `pnpm turbo run lint typecheck test build`.

## Review Focus

1. **Trình duyệt chặn bộ nhớ (chế độ riêng tư):** `sessionStorage`/`localStorage` ném lỗi thì nhớ bộ lọc phải im lặng bỏ qua, còn rời form địa điểm có thay đổi phải hỏi lại. Test: Task 2 (bộ nhớ bị chặn), Task 8 (ghi máy lỗi thì `shouldConfirmLeave` đúng).
2. **Tạo mới xong URL đổi `/moi` → `/{id}`:** không được hỏi rời trang, không dời focus, không cuộn lên đầu. Test: Task 4 (`routeChangeEffects`), Task 5 (`isSameRecordId`); scrollBehavior kiểm ở Task 13.
3. **Hai lần hỏi lại cùng lúc** (bấm đúp, chặn rời trang khi đang mở hộp "Bỏ thay đổi"): xếp hàng, mỗi lời hỏi nhận đúng một câu trả lời. Test: Task 3.
4. **Bộ lọc đã nhớ bị cũ hoặc hỏng** (JSON hỏng, cách xếp lạ, cụm đã đổi slug): về mặc định, không ra danh sách trống vì bộ lọc cũ. Test: Task 2, Task 7 (`tableToSort(null)`, cách xếp lạ).
5. **Focus bằng bàn phím rơi dưới vùng dính** (tiêu đề bảng, thanh lưu): ô đang focus phải còn thấy. CSS `scroll-margin`/`scroll-padding` ở Task 6, Task 9; kiểm bằng bàn phím ở Task 13.

---

## Cấu trúc file

| File | Trách nhiệm |
| --- | --- |
| `packages/ui/src/admin.css` | Class `rd-admin-…`, token admin trong `.rd-admin`, mật độ nút |
| `apps/admin/eslint.config.mjs` | Luật chặn import cho `shared/ui`, `shared/lib` |
| `apps/admin/src/shared/lib/document-title.ts` | `formatDocumentTitle` |
| `apps/admin/src/shared/lib/list-return.ts` | Nhớ query và vị trí cuộn của danh sách |
| `apps/admin/src/shared/lib/confirm.ts` | Hàng đợi hỏi lại, `useConfirm()` |
| `apps/admin/src/shared/lib/toast.ts` | Thông báo đáy, `useToast()` |
| `apps/admin/src/shared/lib/unsaved-guard.ts` | `shouldConfirmLeave`, `isSameRecordId`, `useUnsavedGuard` |
| `apps/admin/src/shared/lib/table.ts` | Kiểu cột, xếp, class ẩn cột |
| `apps/admin/src/shared/ui/Rd*.vue` | `RdConfirmDialog`, `RdToast`, `RdDrawer`, `RdPageHeader`, `RdDataTable`, `RdFilterBar`, `RdEmptyState`, `RdSkeleton`, `RdStickyActions`, `RdFormSection`, `RdField` |
| `apps/admin/src/widgets/admin-shell/` | `model/nav.ts`, `ui/RdAdminShell.vue`, `ui/RdAdminNav.vue` |
| `apps/admin/src/entities/place/model/missing.ts` | Nhãn điều kiện kích hoạt còn thiếu |
| `apps/admin/src/entities/place/model/summary.ts` | `toPlaceSummary` cho hộp thoại thao tác |
| `apps/admin/src/widgets/place-list/` | Bộ lọc mới, `RdPlaceList` viết lại, `RdPlaceRowActions` |
| `apps/admin/src/widgets/place-editor/` | `checklist.ts`, `remainingErrors`, `usePlaceEditor` mở rộng, `RdPlaceEditor` viết lại, `RdActivationChecklist` |
| `apps/admin/src/widgets/template-editor/` | `summary.ts`, `useTemplateEditor` mở rộng, `RdTemplateEditor` và `RdTemplateTimeline` viết lại |

---

### Task 1: Nền CSS admin và luật import

**Files:**
- Modify: `packages/ui/src/admin.css` (thêm vào cuối file)
- Modify: `apps/admin/eslint.config.mjs`

**Interfaces:**
- Produces: class `.rd-admin` (token `--admin-sidebar-w`, `--admin-content-max`, `--admin-editor-max`, `--z-sticky`, `--z-drawer`, `--z-toast`), `.rd-sr-only`, `.rd-btn--ghost`, `.rd-btn--danger`, `button.rd-tab[aria-pressed]`, biến `--admin-bar-height` (đặt ở Task 9).

- [ ] **Step 1: Kiểm nhánh**

Run: `git branch --show-current && git status --short | wc -l`
Expected: `feat/S28-admin-ux` và `0` (S25 đã commit, cây sạch).

- [ ] **Step 2: Thêm nền CSS vào cuối `packages/ui/src/admin.css`**

```css
/* ===== S28: nền UX admin dùng chung (spec docs/superpowers/specs/2026-10-14-admin-ux-foundation-design.md) ===== */
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--font-body); }
:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
/* Thanh lưu dính đặt --admin-bar-height (RdStickyActions) để ô đang focus không bị che. */
html { scroll-padding-bottom: var(--admin-bar-height, 0px); }
.rd-sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* Khung trang admin: token riêng của admin, không ảnh hưởng web khách. */
.rd-admin {
  --admin-sidebar-w: 232px;
  --admin-content-max: 1280px;
  --admin-editor-max: 1200px;
  --z-sticky: 10;
  --z-drawer: 30;
  --z-toast: 40;
  min-height: 100vh;
  font: 400 14px/1.5 var(--font-body);
  color: var(--ink);
}
/* Mật độ admin (ui-spec §12): mọi nút cao 44px, không dùng nút 52px của web khách. */
.rd-admin .rd-btn { height: auto; min-height: var(--tap-min); padding: 0 var(--space-4); font-size: 14px; }
.rd-btn--ghost { background: transparent; color: var(--ink); border: 0; text-decoration: underline; text-underline-offset: 3px; }
.rd-btn--danger { background: var(--status-bad); color: var(--paper-raised); }
@media (hover: hover) { .rd-btn--ghost:hover { background-color: var(--paper); } }
/* Tab dạng nút (đổi panel trong trang); tab dạng link dùng aria-current như web khách. */
.rd-admin button.rd-tab { background: none; border: 0; border-bottom: 3px solid transparent; padding: 0 var(--space-1); cursor: pointer; }
.rd-admin .rd-tab[aria-pressed='true'] { color: var(--ink); font-weight: 700; border-bottom-color: var(--ink); }
```

- [ ] **Step 3: Thêm luật import vào `apps/admin/eslint.config.mjs`**

Thay toàn bộ file:

```js
import { vue } from '@ranhduong/config/eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  vue,
  {
    // shared/ui, shared/lib phải chuyển được sang packages/ui (spec S28 mục 4.1): chỉ nhận props/slots, không phụ thuộc tầng trên hay API admin.
    files: ['src/shared/ui/**/*.{ts,vue}', 'src/shared/lib/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/entities/**', '@/features/**', '@/widgets/**', '@/pages/**', '@/shared/api/**'],
              message: 'shared/ui và shared/lib không import tầng trên hay API admin (spec S28 mục 4.1).',
            },
          ],
        },
      ],
    },
  },
]);
```

- [ ] **Step 4: Kiểm luật bắt đúng import cấm**

Tạo file thử `apps/admin/src/shared/lib/lint-probe.ts`:

```ts
import { sessionState } from '@/entities/session';
export const probe = sessionState;
```

Run: `pnpm --filter @ranhduong/admin lint`
Expected: FAIL, có dòng `no-restricted-imports` ở `src/shared/lib/lint-probe.ts`.

- [ ] **Step 5: Xoá file thử và chạy lại**

Run: `rm apps/admin/src/shared/lib/lint-probe.ts && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin build`
Expected: PASS cả hai.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/admin.css apps/admin/eslint.config.mjs
git commit -m "feat: S28 add admin CSS base and shared import boundary"
```

---

### Task 2: Tên tab và nhớ bộ lọc danh sách

**Files:**
- Create: `apps/admin/src/shared/lib/document-title.ts`, `apps/admin/src/shared/lib/document-title.test.ts`
- Create: `apps/admin/src/shared/lib/list-return.ts`, `apps/admin/src/shared/lib/list-return.test.ts`

**Interfaces:**
- Produces: `formatDocumentTitle(title: string): string`; `type ListKey = 'places' | 'templates'`; `type ListReturn = { query: Record<string, string>; scrollY: number }`; `type ReturnStorage = Pick<Storage, 'getItem' | 'setItem'>`; `plainQuery(query: Readonly<Record<string, unknown>>): Record<string, string>`; `sameQuery(a, b): boolean`; `saveListReturn(list, entry, storage?)`; `readListReturn(list, storage?): ListReturn | null`; `listReturnLocation(list, storage?): { path: string; query: Record<string, string> }`; `scrollToRestore(entry: ListReturn | null, query): number | null`.

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/shared/lib/document-title.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDocumentTitle } from './document-title';

describe('formatDocumentTitle', () => {
  it('ghép tên trang với tên admin', () => {
    expect(formatDocumentTitle('Quán Giả Lập')).toBe('Quán Giả Lập · Rành Đường Quản trị');
  });
  it('không có tên trang thì dùng tên như index.html', () => {
    expect(formatDocumentTitle('  ')).toBe('Rành Đường · Quản trị');
  });
});
```

`apps/admin/src/shared/lib/list-return.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { listReturnLocation, plainQuery, readListReturn, sameQuery, saveListReturn, scrollToRestore, type ReturnStorage } from './list-return';

function memoryStorage(): ReturnStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('list-return', () => {
  it('lưu rồi đọc lại query và vị trí cuộn', () => {
    const storage = memoryStorage();
    saveListReturn('places', { query: { status: 'draft', q: 'giả lập' }, scrollY: 640 }, storage);
    expect(readListReturn('places', storage)).toEqual({ query: { status: 'draft', q: 'giả lập' }, scrollY: 640 });
    expect(listReturnLocation('places', storage)).toEqual({ path: '/dia-diem', query: { status: 'draft', q: 'giả lập' } });
  });
  it('chưa lưu, JSON hỏng hoặc sai dạng thì coi như không có', () => {
    const storage = memoryStorage();
    expect(listReturnLocation('templates', storage)).toEqual({ path: '/lich-trinh', query: {} });
    storage.data.set('rd-admin:list-return:places', '{hỏng');
    expect(readListReturn('places', storage)).toBeNull();
    storage.data.set('rd-admin:list-return:places', JSON.stringify({ query: { status: 1 }, scrollY: -5 }));
    expect(readListReturn('places', storage)).toBeNull();
  });
  it('trình duyệt chặn bộ nhớ thì không ném lỗi', () => {
    const fail = () => {
      throw new Error('Bộ nhớ bị chặn giả lập');
    };
    const blocked: ReturnStorage = { getItem: fail, setItem: fail };
    expect(() => saveListReturn('places', { query: {}, scrollY: 10 }, blocked)).not.toThrow();
    expect(readListReturn('places', blocked)).toBeNull();
    expect(listReturnLocation('places', null)).toEqual({ path: '/dia-diem', query: {} });
  });
  it('chỉ cuộn lại khi đang xem đúng bộ lọc đã lưu', () => {
    const entry = { query: { status: 'draft' }, scrollY: 640 };
    expect(scrollToRestore(entry, { status: 'draft' })).toBe(640);
    expect(scrollToRestore(entry, { status: 'active' })).toBeNull();
    expect(scrollToRestore({ query: {}, scrollY: 0 }, {})).toBeNull();
    expect(scrollToRestore(null, {})).toBeNull();
  });
  it('plainQuery giữ chuỗi đầu tiên, bỏ null; sameQuery không phụ thuộc thứ tự khoá', () => {
    expect(plainQuery({ status: ['draft', 'active'], q: 'giả', zone: null })).toEqual({ status: 'draft', q: 'giả' });
    expect(sameQuery({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
    expect(sameQuery({ a: '1' }, { a: '1', b: '2' })).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/document-title.test.ts src/shared/lib/list-return.test.ts`
Expected: FAIL, không tìm thấy module `./document-title`, `./list-return`.

- [ ] **Step 3: Viết code**

`apps/admin/src/shared/lib/document-title.ts`:

```ts
/** Tên tab trình duyệt: "{tên trang} · Rành Đường Quản trị"; không có tên trang thì dùng tên trong index.html. */
export function formatDocumentTitle(title: string): string {
  const name = title.trim();
  return name ? `${name} · Rành Đường Quản trị` : 'Rành Đường · Quản trị';
}
```

`apps/admin/src/shared/lib/list-return.ts`:

```ts
import { z } from 'zod';

/** Phần Storage dùng tới; test truyền bản giả. */
export type ReturnStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** Danh sách có link quay lại (breadcrumb, thanh bên). */
export type ListKey = 'places' | 'templates';

const LIST_PATH: Record<ListKey, string> = { places: '/dia-diem', templates: '/lich-trinh' };
const ListReturn = z.object({ query: z.record(z.string(), z.string()), scrollY: z.number().int().min(0) });
export type ListReturn = z.infer<typeof ListReturn>;
const storageKey = (list: ListKey) => `rd-admin:list-return:${list}`;

/** sessionStorage theo từng tab; bị chặn thì null. */
function sessionStore(): ReturnStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Query của vue-router → chỉ giữ chuỗi đầu tiên của mỗi khoá. */
export function plainQuery(query: Readonly<Record<string, unknown>>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    const first: unknown = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string') result[key] = first;
  }
  return result;
}

export function sameQuery(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

export function saveListReturn(list: ListKey, entry: ListReturn, storage: ReturnStorage | null = sessionStore()): void {
  try {
    storage?.setItem(storageKey(list), JSON.stringify(entry));
  } catch {
    // Bị chặn hoặc hết chỗ thì thôi nhớ; quay lại sẽ là danh sách mặc định.
  }
}

/** Đọc bộ lọc đã nhớ; không có, hỏng hoặc sai dạng thì null. */
export function readListReturn(list: ListKey, storage: ReturnStorage | null = sessionStore()): ListReturn | null {
  try {
    const raw = storage?.getItem(storageKey(list));
    if (!raw) return null;
    const parsed = ListReturn.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Link quay lại danh sách với bộ lọc lần trước (breadcrumb, thanh bên). */
export function listReturnLocation(list: ListKey, storage: ReturnStorage | null = sessionStore()): { path: string; query: Record<string, string> } {
  return { path: LIST_PATH[list], query: readListReturn(list, storage)?.query ?? {} };
}

/** Vị trí cuộn cần trả lại: chỉ khi đang xem đúng bộ lọc đã lưu và đã cuộn xuống. */
export function scrollToRestore(entry: ListReturn | null, query: Readonly<Record<string, string>>): number | null {
  if (!entry || entry.scrollY === 0 || !sameQuery(entry.query, query)) return null;
  return entry.scrollY;
}
```

- [ ] **Step 4: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/document-title.test.ts src/shared/lib/list-return.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/shared/lib/document-title.ts apps/admin/src/shared/lib/document-title.test.ts apps/admin/src/shared/lib/list-return.ts apps/admin/src/shared/lib/list-return.test.ts
git commit -m "feat: S28 add document title and list return helpers"
```

---

### Task 3: Hỏi lại, thông báo và ngăn trượt

**Files:**
- Create: `apps/admin/src/shared/lib/confirm.ts`, `apps/admin/src/shared/lib/confirm.test.ts`
- Create: `apps/admin/src/shared/lib/toast.ts`, `apps/admin/src/shared/lib/toast.test.ts`
- Create: `apps/admin/src/shared/ui/RdConfirmDialog.vue`, `apps/admin/src/shared/ui/RdToast.vue`, `apps/admin/src/shared/ui/RdDrawer.vue`
- Modify: `packages/ui/src/admin.css` (thêm vào cuối)

**Interfaces:**
- Produces: `interface ConfirmRequest { title: string; body: string; confirmLabel: string; cancelLabel?: string; tone?: 'default' | 'danger' }`; `createConfirmQueue(): { current: ShallowRef<ConfirmRequest | null>; ask(request): Promise<boolean>; answer(ok: boolean): void }`; `useConfirm(): (request: ConfirmRequest) => Promise<boolean>`; `confirmState`, `answerConfirm` (cho `RdConfirmDialog`).
- Produces: `createToastStore(durationMs?: number)`; `useToast(): { show(message: string): void }`; `toastState`, `toastControls` (cho `RdToast`).
- Produces: `RdDrawer` props `{ id: string; label: string }`, `v-model:open: boolean`, slot mặc định.

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/shared/lib/confirm.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createConfirmQueue } from './confirm';

const REQUEST = { title: 'Bỏ thay đổi Giả Lập?', body: 'Nội dung giả lập.', confirmLabel: 'Bỏ' };

describe('createConfirmQueue', () => {
  it('trả đúng câu trả lời rồi đóng hộp khi hết hàng', async () => {
    const queue = createConfirmQueue();
    const answer = queue.ask(REQUEST);
    expect(queue.current.value?.title).toBe('Bỏ thay đổi Giả Lập?');
    queue.answer(true);
    await expect(answer).resolves.toBe(true);
    expect(queue.current.value).toBeNull();
  });
  it('hỏi thêm khi đang có hộp thì chờ tới lượt, mỗi lời hỏi nhận đúng một câu trả lời', async () => {
    const queue = createConfirmQueue();
    const first = queue.ask({ ...REQUEST, title: 'Thứ nhất' });
    const second = queue.ask({ ...REQUEST, title: 'Thứ hai' });
    expect(queue.current.value?.title).toBe('Thứ nhất');
    queue.answer(false);
    expect(queue.current.value?.title).toBe('Thứ hai');
    queue.answer(true);
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    queue.answer(true);
    expect(queue.current.value).toBeNull();
  });
});
```

`apps/admin/src/shared/lib/toast.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToastStore } from './toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createToastStore', () => {
  it('tự ẩn sau 4 giây', () => {
    const toast = createToastStore();
    toast.show('Đã lưu Giả Lập.');
    vi.advanceTimersByTime(3999);
    expect(toast.current.value?.message).toBe('Đã lưu Giả Lập.');
    vi.advanceTimersByTime(1);
    expect(toast.current.value).toBeNull();
  });
  it('rê chuột hoặc focus thì dừng đếm, rời ra thì đếm lại đủ 4 giây', () => {
    const toast = createToastStore();
    toast.show('Đã lưu Giả Lập.');
    toast.pause();
    vi.advanceTimersByTime(10_000);
    expect(toast.current.value).not.toBeNull();
    toast.resume();
    vi.advanceTimersByTime(3999);
    expect(toast.current.value).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(toast.current.value).toBeNull();
  });
  it('thông báo mới thay thông báo cũ và đếm lại; đóng tay thì ẩn ngay', () => {
    const toast = createToastStore();
    toast.show('Cũ Giả Lập');
    vi.advanceTimersByTime(3000);
    toast.show('Mới Giả Lập');
    vi.advanceTimersByTime(3000);
    expect(toast.current.value?.message).toBe('Mới Giả Lập');
    toast.dismiss();
    expect(toast.current.value).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/confirm.test.ts src/shared/lib/toast.test.ts`
Expected: FAIL, không tìm thấy module.

- [ ] **Step 3: Viết store**

`apps/admin/src/shared/lib/confirm.ts`:

```ts
import { shallowRef, type ShallowRef } from 'vue';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger: nút xác nhận nền đỏ (bỏ thay đổi, rời trang, bỏ ngày). */
  tone?: 'default' | 'danger';
}
interface PendingConfirm extends ConfirmRequest {
  resolve: (ok: boolean) => void;
}

/** Hàng đợi hỏi lại: mỗi lúc một hộp thoại; hỏi thêm khi đang có hộp thì chờ tới lượt. */
export function createConfirmQueue(): { current: ShallowRef<ConfirmRequest | null>; ask(request: ConfirmRequest): Promise<boolean>; answer(ok: boolean): void } {
  const current = shallowRef<PendingConfirm | null>(null);
  const waiting: PendingConfirm[] = [];
  function ask(request: ConfirmRequest): Promise<boolean> {
    return new Promise((resolve) => {
      const pending = { ...request, resolve };
      if (current.value) waiting.push(pending);
      else current.value = pending;
    });
  }
  function answer(ok: boolean): void {
    const pending = current.value;
    if (!pending) return;
    current.value = waiting.shift() ?? null;
    pending.resolve(ok);
  }
  return { current, ask, answer };
}

const queue = createConfirmQueue();
/** Hộp đang hỏi; RdConfirmDialog (đặt trong khung trang) hiển thị. */
export const confirmState = queue.current;
export const answerConfirm = queue.answer;

/** Hỏi lại bằng hộp thoại của admin thay cho window.confirm. */
export function useConfirm(): (request: ConfirmRequest) => Promise<boolean> {
  return queue.ask;
}
```

`apps/admin/src/shared/lib/toast.ts`:

```ts
import { shallowRef } from 'vue';

export interface Toast {
  id: number;
  message: string;
}

/** Thông báo thành công ở đáy màn hình: mỗi lúc một cái, tự ẩn, dừng đếm khi rê chuột hoặc focus. */
export function createToastStore(durationMs = 4000) {
  const current = shallowRef<Toast | null>(null);
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let paused = false;
  function schedule(): void {
    clearTimeout(timer);
    if (!paused && current.value) {
      timer = setTimeout(() => {
        current.value = null;
      }, durationMs);
    }
  }
  return {
    current,
    show(message: string): void {
      current.value = { id: ++seq, message };
      schedule();
    },
    pause(): void {
      paused = true;
      clearTimeout(timer);
    },
    resume(): void {
      paused = false;
      schedule();
    },
    dismiss(): void {
      clearTimeout(timer);
      current.value = null;
    },
  };
}

const store = createToastStore();
export const toastState = store.current;
export const toastControls = { pause: store.pause, resume: store.resume, dismiss: store.dismiss };

export function useToast(): { show(message: string): void } {
  return { show: store.show };
}
```

- [ ] **Step 4: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/confirm.test.ts src/shared/lib/toast.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Viết ba component**

`apps/admin/src/shared/ui/RdConfirmDialog.vue`:

```vue
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { answerConfirm, confirmState } from '../lib/confirm';

const dialog = ref<HTMLDialogElement | null>(null);
const request = confirmState;

// Có lời hỏi thì mở; hết hàng thì đóng. Còn lời hỏi kế tiếp thì giữ hộp mở, đổi nội dung.
watch(confirmState, async (value) => {
  await nextTick();
  const el = dialog.value;
  if (!el) return;
  if (value && !el.open) el.showModal();
  if (!value && el.open) el.close();
});

/** Esc hoặc đóng theo cách khác khi còn lời hỏi: coi như Huỷ. */
function onClose(): void {
  if (confirmState.value) answerConfirm(false);
}
</script>

<template>
  <dialog ref="dialog" class="rd-admin-dialog" aria-labelledby="rd-confirm-title" aria-describedby="rd-confirm-body" @close="onClose">
    <template v-if="request">
      <h2 id="rd-confirm-title">{{ request.title }}</h2>
      <p id="rd-confirm-body">{{ request.body }}</p>
      <div class="rd-admin-dialog__actions">
        <button type="button" class="rd-btn rd-btn--outline" autofocus @click="answerConfirm(false)">{{ request.cancelLabel ?? 'Huỷ' }}</button>
        <button type="button" :class="['rd-btn', request.tone === 'danger' ? 'rd-btn--danger' : 'rd-btn--primary']" @click="answerConfirm(true)">
          {{ request.confirmLabel }}
        </button>
      </div>
    </template>
  </dialog>
</template>
```

`apps/admin/src/shared/ui/RdToast.vue`:

```vue
<script setup lang="ts">
import { toastControls, toastState } from '../lib/toast';
</script>

<template>
  <div class="rd-admin-toast-region" role="status" aria-live="polite">
    <Transition name="rd-admin-toast">
      <div
        v-if="toastState"
        :key="toastState.id"
        class="rd-admin-toast"
        @mouseenter="toastControls.pause"
        @mouseleave="toastControls.resume"
        @focusin="toastControls.pause"
        @focusout="toastControls.resume"
      >
        <p>{{ toastState.message }}</p>
        <button type="button" class="rd-icon-btn" aria-label="Đóng thông báo" @click="toastControls.dismiss">×</button>
      </div>
    </Transition>
  </div>
</template>
```

`apps/admin/src/shared/ui/RdDrawer.vue`:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';

defineProps<{ id: string; label: string }>();
const open = defineModel<boolean>('open', { required: true });
const dialog = ref<HTMLDialogElement | null>(null);

watch(open, (value) => {
  const el = dialog.value;
  if (!el) return;
  if (value && !el.open) el.showModal();
  if (!value && el.open) el.close();
});

function close(): void {
  dialog.value?.close();
}
/** Bấm vào nền mờ (chính phần tử dialog, ngoài panel) thì đóng. */
function onClick(event: MouseEvent): void {
  if (event.target === dialog.value) close();
}
</script>

<template>
  <dialog :id="id" ref="dialog" class="rd-admin-drawer" :aria-label="label" @close="open = false" @click="onClick">
    <div class="rd-admin-drawer__panel">
      <button type="button" class="rd-icon-btn rd-admin-drawer__close" aria-label="Đóng menu" @click="close">×</button>
      <slot />
    </div>
  </dialog>
</template>
```

- [ ] **Step 6: Thêm CSS vào cuối `packages/ui/src/admin.css`**

```css
/* Hộp thoại hỏi lại (RdConfirmDialog): hiện dần và phóng nhẹ, đóng nhanh hơn. */
.rd-admin-dialog { box-sizing: border-box; width: min(440px, calc(100vw - 2 * var(--page-gutter))); padding: var(--space-5); border: var(--border); border-radius: var(--radius-card); background: var(--paper-raised); color: var(--ink); opacity: 0; scale: 0.98; transition: opacity var(--dur-micro) var(--ease-out), scale var(--dur-micro) var(--ease-out), overlay var(--dur-micro) allow-discrete, display var(--dur-micro) allow-discrete; }
.rd-admin-dialog[open] { opacity: 1; scale: 1; transition-duration: var(--dur-standard); }
@starting-style { .rd-admin-dialog[open] { opacity: 0; scale: 0.98; } }
.rd-admin-dialog::backdrop { background: color-mix(in srgb, var(--ink) 45%, transparent); }
.rd-admin-dialog h2 { margin: 0 0 var(--space-2); font: 700 20px/1.3 var(--font-display); overflow-wrap: anywhere; }
.rd-admin-dialog p { margin: 0 0 var(--space-5); overflow-wrap: anywhere; }
.rd-admin-dialog__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); }

/* Ngăn trượt menu (RdDrawer): trượt từ trái 250ms, nền mờ 200ms. */
.rd-admin-drawer { box-sizing: border-box; margin: 0; width: min(300px, 86vw); max-width: none; height: 100dvh; max-height: none; padding: 0; border: 0; background: var(--ink); color: var(--paper-raised); transform: translateX(-100%); transition: transform var(--dur-panel) var(--ease-out), overlay var(--dur-panel) allow-discrete, display var(--dur-panel) allow-discrete; }
.rd-admin-drawer[open] { transform: none; }
@starting-style { .rd-admin-drawer[open] { transform: translateX(-100%); } }
.rd-admin-drawer::backdrop { background: color-mix(in srgb, var(--ink) 45%, transparent); opacity: 0; transition: opacity var(--dur-standard) var(--ease-out), overlay var(--dur-standard) allow-discrete, display var(--dur-standard) allow-discrete; }
.rd-admin-drawer[open]::backdrop { opacity: 1; }
@starting-style { .rd-admin-drawer[open]::backdrop { opacity: 0; } }
.rd-admin-drawer__panel { position: relative; min-height: 100%; display: flex; }
.rd-admin-drawer__close { position: absolute; top: var(--space-3); right: var(--space-3); background: transparent; color: var(--paper-raised); border-color: color-mix(in srgb, var(--paper-raised) 40%, transparent); }
.rd-admin-drawer :focus-visible { outline-color: var(--paper-raised); }

/* Thông báo đáy (RdToast): nằm trên thanh lưu nếu có. */
.rd-admin-toast-region { position: fixed; left: 50%; bottom: calc(var(--admin-bar-height, 0px) + var(--space-4) + env(safe-area-inset-bottom, 0px)); z-index: var(--z-toast); width: min(440px, calc(100vw - 2 * var(--page-gutter))); translate: -50% 0; pointer-events: none; }
.rd-admin-toast { pointer-events: auto; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-1) var(--space-1) var(--space-1) var(--space-4); background: var(--ink); color: var(--paper-raised); border-radius: var(--radius-chip); box-shadow: var(--shadow-float); }
.rd-admin-toast p { margin: 0; flex: 1; overflow-wrap: anywhere; }
.rd-admin-toast .rd-icon-btn { background: transparent; color: var(--paper-raised); border-color: transparent; }
.rd-admin-toast :focus-visible { outline-color: var(--paper-raised); }
.rd-admin-toast-enter-active, .rd-admin-toast-leave-active { transition: opacity var(--dur-standard) var(--ease-out), transform var(--dur-standard) var(--ease-out); }
.rd-admin-toast-enter-from, .rd-admin-toast-leave-to { opacity: 0; transform: translateY(8px); }
```

- [ ] **Step 7: Typecheck, lint**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/shared/lib/confirm.ts apps/admin/src/shared/lib/confirm.test.ts apps/admin/src/shared/lib/toast.ts apps/admin/src/shared/lib/toast.test.ts apps/admin/src/shared/ui/RdConfirmDialog.vue apps/admin/src/shared/ui/RdToast.vue apps/admin/src/shared/ui/RdDrawer.vue packages/ui/src/admin.css
git commit -m "feat: S28 add confirm dialog, toast and drawer"
```

---

### Task 4: Khung trang admin

**Files:**
- Create: `apps/admin/src/widgets/admin-shell/model/nav.ts`, `apps/admin/src/widgets/admin-shell/model/nav.test.ts`
- Create: `apps/admin/src/widgets/admin-shell/ui/RdAdminNav.vue`, `apps/admin/src/widgets/admin-shell/ui/RdAdminShell.vue`
- Modify: `apps/admin/src/app/App.vue` (thay toàn bộ), `apps/admin/src/app/router.ts` (thay toàn bộ)
- Modify: `packages/ui/src/admin.css` (thêm vào cuối)

**Interfaces:**
- Consumes: `listReturnLocation`, `type ListKey` (Task 2); `formatDocumentTitle` (Task 2); `RdConfirmDialog`, `RdToast`, `RdDrawer` (Task 3).
- Produces: `NAV_GROUPS`, `activeSection(path: string): string | null`, `routeChangeEffects(to: RouteLike, from: RouteLike): { resetTitle: boolean; moveFocus: boolean }`; `RouteMeta.title?: string`; phần tử có `data-rd-page-title` nhận focus khi đổi trang (Task 6 đặt trên H1 của `RdPageHeader`).

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/widgets/admin-shell/model/nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { activeSection, routeChangeEffects } from './nav';

const placesRecord = {};
const editorRecord = {};
const at = (path: string, record: object, params: Record<string, string> = {}) => ({ path, params, matched: [record] });

describe('activeSection', () => {
  it('trang con vẫn đánh dấu mục cha; đường dẫn chỉ trùng phần đầu thì không', () => {
    expect(activeSection('/dia-diem')).toBe('/dia-diem');
    expect(activeSection('/dia-diem/0123456789abcdef01234567')).toBe('/dia-diem');
    expect(activeSection('/lich-trinh/moi')).toBe('/lich-trinh');
    expect(activeSection('/dia-diem-gia-lap')).toBeNull();
    expect(activeSection('/dang-nhap')).toBeNull();
  });
});

describe('routeChangeEffects', () => {
  it('lần vào đầu tiên: đặt tên tab, không dời focus', () => {
    expect(routeChangeEffects(at('/dia-diem', placesRecord), { path: '/', params: {}, matched: [] })).toEqual({ resetTitle: true, moveFocus: false });
  });
  it('sang trang khác: đặt tên tab và dời focus về tiêu đề', () => {
    expect(routeChangeEffects(at('/dia-diem/a', editorRecord, { id: 'a' }), at('/dia-diem', placesRecord))).toEqual({ resetTitle: true, moveFocus: true });
  });
  it('chỉ đổi query (bộ lọc): không làm gì', () => {
    expect(routeChangeEffects(at('/dia-diem', placesRecord), at('/dia-diem', placesRecord))).toEqual({ resetTitle: false, moveFocus: false });
  });
  it('vừa tạo xong (/moi thành /{id}): không đặt lại tên, không dời focus', () => {
    expect(routeChangeEffects(at('/dia-diem/b', editorRecord, { id: 'b' }), at('/dia-diem/moi', editorRecord, { id: 'moi' }))).toEqual({ resetTitle: false, moveFocus: false });
  });
  it('mở địa điểm khác cùng form: dời focus, tên tab do đầu trang đặt', () => {
    expect(routeChangeEffects(at('/dia-diem/b', editorRecord, { id: 'b' }), at('/dia-diem/a', editorRecord, { id: 'a' }))).toEqual({ resetTitle: false, moveFocus: true });
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/widgets/admin-shell/model/nav.test.ts`
Expected: FAIL, không tìm thấy module `./nav`.

- [ ] **Step 3: Viết `nav.ts`**

```ts
import type { RouteLocationRaw } from 'vue-router';
import type { ListKey } from '@/shared/lib/list-return';

export interface NavItem {
  label: string;
  path: string;
  /** Có thì link mở lại bộ lọc lần trước của danh sách đó. */
  list?: ListKey;
}
export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}
export interface NavLinkView extends NavItem {
  to: RouteLocationRaw;
}
export interface NavGroupView {
  label: string;
  items: NavLinkView[];
}

/** Menu theo tần suất dùng (spec S28 mục 5.1); Import CSV (S21) thêm vào "Nội dung" khi làm xong. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Nội dung',
    items: [
      { label: 'Địa điểm', path: '/dia-diem', list: 'places' },
      { label: 'Lịch trình mẫu', path: '/lich-trinh', list: 'templates' },
      { label: 'Danh sách gợi ý', path: '/danh-sach' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { label: 'Báo cáo', path: '/bao-cao' },
      { label: 'Mùa & giao diện', path: '/mua' },
    ],
  },
];

/** Mục menu đang mở: trang con (/dia-diem/:id) vẫn thuộc mục cha. */
export function activeSection(path: string): string | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) if (path === item.path || path.startsWith(`${item.path}/`)) return item.path;
  }
  return null;
}

export interface RouteLike {
  path: string;
  params: Readonly<Record<string, string | string[]>>;
  matched: readonly object[];
}

/**
 * Việc khung trang làm sau mỗi lần chuyển route: đặt tên tab theo meta khi sang trang khác (cùng một form thì đầu
 * trang tự đặt), dời focus về tiêu đề khi đổi đường dẫn, trừ lần vào đầu và lúc vừa tạo xong (/moi thành /{id}).
 */
export function routeChangeEffects(to: RouteLike, from: RouteLike): { resetTitle: boolean; moveFocus: boolean } {
  if (from.matched.length === 0) return { resetTitle: true, moveFocus: false };
  const sameRecord = to.matched.at(-1) === from.matched.at(-1);
  const justCreated = sameRecord && from.params.id === 'moi';
  return { resetTitle: !sameRecord, moveFocus: to.path !== from.path && !justCreated };
}
```

- [ ] **Step 4: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/widgets/admin-shell/model/nav.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Viết `RdAdminNav.vue`**

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { NavGroupView } from '../model/nav';

defineProps<{ groups: readonly NavGroupView[]; active: string | null; email: string | null; logoutFailed: boolean }>();
const emit = defineEmits<{ logout: [] }>();
</script>

<template>
  <div class="rd-admin-nav">
    <div class="rd-admin-nav__logo">Rành Đường</div>
    <div class="rd-admin-nav__sub">Quản trị · Đà Lạt</div>
    <template v-for="group in groups" :key="group.label">
      <p class="rd-admin-nav__group">{{ group.label }}</p>
      <RouterLink v-for="item in group.items" :key="item.path" v-slot="{ href, navigate }" :to="item.to" custom>
        <a :href="href" class="rd-admin-nav__link" :aria-current="active === item.path ? 'page' : undefined" @click="navigate">{{ item.label }}</a>
      </RouterLink>
    </template>
    <div class="rd-admin-nav__account">
      <span v-if="email" class="rd-admin-nav__email">{{ email }}</span>
      <button type="button" class="rd-admin-nav__logout" @click="emit('logout')">Đăng xuất</button>
      <span v-if="logoutFailed" class="rd-admin-nav__email" role="alert">Chưa đăng xuất được, thử lại.</span>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Viết `RdAdminShell.vue`**

```vue
<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { sessionState } from '@/entities/session';
import { logout } from '@/features/auth';
import { formatDocumentTitle } from '@/shared/lib/document-title';
import { listReturnLocation } from '@/shared/lib/list-return';
import RdConfirmDialog from '@/shared/ui/RdConfirmDialog.vue';
import RdDrawer from '@/shared/ui/RdDrawer.vue';
import RdToast from '@/shared/ui/RdToast.vue';
import { activeSection, NAV_GROUPS, routeChangeEffects, type NavGroupView } from '../model/nav';
import RdAdminNav from './RdAdminNav.vue';

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const logoutFailed = ref(false);
const active = computed(() => activeSection(route.path));
const email = computed(() => (sessionState.value.status === 'signed-in' ? sessionState.value.session.email : null));

/** Mục có danh sách mở lại bộ lọc lần trước; đọc lại mỗi lần đổi trang (sessionStorage không reactive). */
const groups = shallowRef<NavGroupView[]>([]);
watch(
  () => route.fullPath,
  () => {
    groups.value = NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({ ...item, to: item.list ? listReturnLocation(item.list) : item.path })),
    }));
  },
  { immediate: true },
);

document.title = formatDocumentTitle(route.meta.title ?? '');

/** Đưa focus về tiêu đề trang mới để trình đọc màn hình bắt đầu từ đó. */
function focusPageTitle(): void {
  const target =
    document.querySelector<HTMLElement>('[data-rd-page-title]') ??
    document.querySelector<HTMLElement>('.rd-admin-main h1') ??
    document.querySelector<HTMLElement>('.rd-admin-main');
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

const stopAfterEach = router.afterEach(async (to, from, failure) => {
  if (failure) return;
  menuOpen.value = false;
  const effects = routeChangeEffects(to, from);
  if (effects.resetTitle) document.title = formatDocumentTitle(to.meta.title ?? '');
  if (!effects.moveFocus) return;
  await nextTick();
  focusPageTitle();
});
onUnmounted(stopAfterEach);

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
  <div class="rd-admin">
    <header class="rd-admin-topbar">
      <button type="button" class="rd-icon-btn" aria-label="Mở menu" :aria-expanded="menuOpen" aria-controls="rd-admin-menu" @click="menuOpen = true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <span class="rd-admin-topbar__brand">Rành Đường · Quản trị</span>
    </header>
    <nav class="rd-admin-side" aria-label="Quản trị">
      <RdAdminNav :groups="groups" :active="active" :email="email" :logout-failed="logoutFailed" @logout="onLogout" />
    </nav>
    <RdDrawer id="rd-admin-menu" v-model:open="menuOpen" label="Menu quản trị">
      <nav class="rd-admin-drawer__nav" aria-label="Quản trị">
        <RdAdminNav :groups="groups" :active="active" :email="email" :logout-failed="logoutFailed" @logout="onLogout" />
      </nav>
    </RdDrawer>
    <main class="rd-admin-main" tabindex="-1"><slot /></main>
    <RdConfirmDialog />
    <RdToast />
  </div>
</template>
```

- [ ] **Step 7: Thay `apps/admin/src/app/App.vue`**

```vue
<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import RdAdminShell from '@/widgets/admin-shell/ui/RdAdminShell.vue';

const route = useRoute();
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <RdAdminShell v-else><RouterView /></RdAdminShell>
</template>
```

- [ ] **Step 8: Thay `apps/admin/src/app/router.ts`**

```ts
import { createRouter, createWebHistory } from 'vue-router';
import { loadSession } from '@/entities/session';

declare module 'vue-router' {
  interface RouteMeta {
    /** Trang mở được khi chưa đăng nhập. */
    public?: boolean;
    /** Tên trên tab trình duyệt; trang có RdPageHeader tự đặt tên cụ thể hơn (tên địa điểm, lịch trình). */
    title?: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  // Back/Forward trả lại chỗ cũ. Cùng một trang (đổi bộ lọc, /moi thành /{id} sau khi tạo) giữ nguyên chỗ đang cuộn.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.matched.at(-1) === from.matched.at(-1)) return false;
    return { top: 0 };
  },
  routes: [
    { path: '/', redirect: '/dia-diem' },
    { path: '/dang-nhap', component: () => import('@/pages/LoginPage.vue'), meta: { public: true, title: 'Đăng nhập' } },
    { path: '/dia-diem', component: () => import('@/pages/PlacesPage.vue'), meta: { title: 'Địa điểm' } },
    { path: '/dia-diem/:id', component: () => import('@/pages/PlaceEditPage.vue'), meta: { title: 'Địa điểm' } },
    { path: '/danh-sach', component: () => import('@/pages/CuratedListsPage.vue'), meta: { title: 'Danh sách gợi ý' } },
    { path: '/danh-sach/:id', component: () => import('@/pages/CuratedListEditPage.vue'), meta: { title: 'Danh sách gợi ý' } },
    { path: '/lich-trinh', component: () => import('@/pages/TemplatesPage.vue'), meta: { title: 'Lịch trình mẫu' } },
    { path: '/lich-trinh/:id', component: () => import('@/pages/TemplateEditPage.vue'), meta: { title: 'Lịch trình mẫu' } },
    { path: '/bao-cao', component: () => import('@/pages/MetricsPage.vue'), meta: { title: 'Báo cáo' } },
    { path: '/mua', component: () => import('@/pages/SeasonsPage.vue'), meta: { title: 'Mùa & giao diện' } },
    { path: '/:pathMatch(.*)*', redirect: '/dia-diem' },
  ],
});

// Mỗi lần chuyển trang đều hỏi API; API (AdminGuard) mới là nơi quyết định, router chỉ chuyển hướng cho dễ dùng.
// Chỉ đổi query trên cùng trang (bộ lọc danh sách) thì không hỏi lại; lần vào đầu tiên `from.matched` rỗng nên vẫn hỏi.
router.beforeEach(async (to, from) => {
  if (to.meta.public) return true;
  if (from.matched.length > 0 && to.path === from.path) return true;
  const state = await loadSession();
  if (state.status === 'signed-in') return true;
  const query: Record<string, string> = { returnTo: to.fullPath };
  if (state.status === 'forbidden') query.error = 'not_allowed';
  if (state.status === 'unavailable') query.error = 'unavailable';
  return { path: '/dang-nhap', query };
});
```

- [ ] **Step 9: Thêm CSS khung trang vào cuối `packages/ui/src/admin.css`**

```css
/* Khung trang: dưới 1280px thanh trên 56px (không dính) và ngăn trượt; từ 1280px thanh bên 232px dính. */
.rd-admin-topbar { display: flex; align-items: center; gap: var(--space-3); min-height: 56px; padding: 0 var(--page-gutter); background: var(--ink); color: var(--paper-raised); }
.rd-admin-topbar__brand { font: 700 17px/1.3 var(--font-display); }
.rd-admin-topbar .rd-icon-btn { background: transparent; color: var(--paper-raised); border-color: color-mix(in srgb, var(--paper-raised) 40%, transparent); }
.rd-admin-topbar :focus-visible { outline-color: var(--paper-raised); }
.rd-admin-side { display: none; }
.rd-admin-main { box-sizing: border-box; min-width: 0; padding: var(--space-4) var(--page-gutter) var(--space-7); }
.rd-admin-main:focus { outline: none; }
@media (min-width: 768px) { .rd-admin-main { padding: var(--space-6) var(--space-6) var(--space-7); } }
@media (min-width: 1280px) {
  .rd-admin { display: grid; grid-template-columns: var(--admin-sidebar-w) minmax(0, 1fr); align-items: start; }
  .rd-admin-topbar { display: none; }
  .rd-admin-side { display: flex; position: sticky; top: 0; height: 100vh; overflow-y: auto; background: var(--ink); }
  .rd-admin-main { padding: var(--space-7) 32px; }
}
.rd-admin-drawer__nav { display: flex; flex: 1; }

/* Menu: nhóm, mục đang mở có nền sáng 14% và vạch --accent 3px. */
.rd-admin-nav { box-sizing: border-box; display: flex; flex-direction: column; gap: var(--space-1); width: 100%; padding: var(--space-5) 14px; background: var(--ink); color: var(--paper-raised); }
.rd-admin-nav__logo { padding: 0 10px; font: 700 22px/1.2 var(--font-display); }
.rd-admin-nav__sub { padding: 0 10px var(--space-2); font-size: 12px; opacity: 0.85; }
.rd-admin-nav__group { margin: var(--space-4) 0 var(--space-1); padding: 0 10px; font: 700 11px/1.4 var(--font-body); letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.85; }
.rd-admin-nav__link { position: relative; display: flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--space-3); border-radius: 10px; color: var(--paper-raised); font-size: 14px; text-decoration: none; transition: background-color var(--dur-micro) var(--ease-out); }
.rd-admin-nav__link[aria-current='page'] { background: color-mix(in srgb, var(--paper-raised) 14%, transparent); font-weight: 700; }
.rd-admin-nav__link[aria-current='page']::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: var(--radius-pill); background: var(--accent); }
@media (hover: hover) { .rd-admin-nav__link:not([aria-current='page']):hover { background: color-mix(in srgb, var(--paper-raised) 8%, transparent); } }
.rd-admin-nav :focus-visible { outline-color: var(--paper-raised); }
.rd-admin-nav__account { margin-top: auto; padding: var(--space-4) 10px 0; display: flex; flex-direction: column; gap: 6px; }
.rd-admin-nav__email { font-size: 12px; overflow-wrap: anywhere; }
.rd-admin-nav__logout { min-height: var(--tap-min); border: var(--border-hair) solid var(--paper-raised); border-radius: var(--radius-chip); background: transparent; color: var(--paper-raised); font: inherit; font-size: 14px; cursor: pointer; }
```

- [ ] **Step 10: Typecheck, lint, test, build**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin build`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/admin/src/widgets/admin-shell apps/admin/src/app/App.vue apps/admin/src/app/router.ts packages/ui/src/admin.css
git commit -m "feat: S28 add grouped admin shell with mobile drawer"
```

---

### Task 5: Chặn rời trang dùng chung

**Files:**
- Create: `apps/admin/src/shared/lib/unsaved-guard.ts`, `apps/admin/src/shared/lib/unsaved-guard.test.ts`
- Modify: `apps/admin/src/pages/SeasonsPage.vue` (thay toàn bộ)

**Interfaces:**
- Consumes: `useConfirm`, `type ConfirmRequest` (Task 3); `RdConfirmDialog` đã đặt trong khung trang (Task 4).
- Produces: `shouldConfirmLeave(dirty: boolean, kept: boolean): boolean`; `isSameRecordId(to: { params: Readonly<Record<string, string | string[]>> }, currentId: string | null): boolean`; `LEAVE_CONFIRM: ConfirmRequest`; `useUnsavedGuard(options: { dirty: () => boolean; kept: () => boolean; flush?: () => void; skip?: (to: RouteLocationNormalized) => boolean }): void`.

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/shared/lib/unsaved-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isSameRecordId, LEAVE_CONFIRM, shouldConfirmLeave } from './unsaved-guard';

describe('shouldConfirmLeave', () => {
  it('chỉ hỏi khi có thay đổi mà không giữ được trên máy', () => {
    expect(shouldConfirmLeave(true, false)).toBe(true);
    expect(shouldConfirmLeave(true, true)).toBe(false);
    expect(shouldConfirmLeave(false, false)).toBe(false);
  });
  it('câu hỏi rời trang là thao tác nguy hiểm', () => {
    expect(LEAVE_CONFIRM.tone).toBe('danger');
  });
});

describe('isSameRecordId', () => {
  it('vừa tạo xong, URL đổi sang đúng id mới thì không hỏi', () => {
    expect(isSameRecordId({ params: { id: '0123456789abcdef01234567' } }, '0123456789abcdef01234567')).toBe(true);
  });
  it('sang bản ghi khác, rời form hay chưa tạo thì vẫn kiểm', () => {
    expect(isSameRecordId({ params: { id: 'khac' } }, '0123456789abcdef01234567')).toBe(false);
    expect(isSameRecordId({ params: {} }, '0123456789abcdef01234567')).toBe(false);
    expect(isSameRecordId({ params: { id: 'moi' } }, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/unsaved-guard.test.ts`
Expected: FAIL, không tìm thấy module.

- [ ] **Step 3: Viết `unsaved-guard.ts`**

```ts
import { onBeforeUnmount, onMounted } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, type RouteLocationNormalized } from 'vue-router';
import { useConfirm, type ConfirmRequest } from './confirm';

/** Chỉ hỏi khi có thay đổi chưa lưu mà máy này không giữ được (form địa điểm, lịch trình, mùa dùng chung quy tắc này). */
export function shouldConfirmLeave(dirty: boolean, kept: boolean): boolean {
  return dirty && !kept;
}

/** URL vừa đổi sang đúng bản ghi đang mở (tạo xong, /moi thành /{id}): không phải rời trang. */
export function isSameRecordId(to: { params: Readonly<Record<string, string | string[]>> }, currentId: string | null): boolean {
  return currentId !== null && to.params.id === currentId;
}

export const LEAVE_CONFIRM: ConfirmRequest = {
  title: 'Rời trang khi chưa lưu?',
  body: 'Máy này chưa giữ được bản đang sửa. Rời trang bây giờ sẽ mất các thay đổi chưa lưu.',
  confirmLabel: 'Vẫn rời trang',
  cancelLabel: 'Ở lại trang',
  tone: 'danger',
};

export interface UnsavedGuardOptions {
  dirty: () => boolean;
  kept: () => boolean;
  /** Ghi ngay bản đang sửa vào máy trước khi quyết định (bỏ qua thời gian chờ tự lưu). */
  flush?: () => void;
  skip?: (to: RouteLocationNormalized) => boolean;
}

/** Hỏi lại trước khi rời trang (trong app: RdConfirmDialog; đóng tab: hộp của trình duyệt). */
export function useUnsavedGuard(options: UnsavedGuardOptions): void {
  const confirm = useConfirm();
  function needsConfirm(): boolean {
    options.flush?.();
    return shouldConfirmLeave(options.dirty(), options.kept());
  }
  async function guard(to: RouteLocationNormalized): Promise<boolean> {
    if (options.skip?.(to) || !needsConfirm()) return true;
    return confirm(LEAVE_CONFIRM);
  }
  onBeforeRouteLeave((to) => guard(to));
  onBeforeRouteUpdate((to, from) => (to.path === from.path ? true : guard(to)));
  function beforeUnload(event: BeforeUnloadEvent): void {
    if (!needsConfirm()) return;
    event.preventDefault();
    event.returnValue = '';
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
}
```

- [ ] **Step 4: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/unsaved-guard.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Đổi `SeasonsPage.vue` sang guard dùng chung**

```vue
<script setup lang="ts">
import { CITY_SLUG } from '@/shared/config';
import { useUnsavedGuard } from '@/shared/lib/unsaved-guard';
import { useSeasonEditor } from '@/widgets/season-editor/model/use-season-editor';
import RdSeasonEditor from '@/widgets/season-editor/ui/RdSeasonEditor.vue';

const editor = useSeasonEditor(CITY_SLUG);
// Cùng quy tắc canLeave cũ: chỉ hỏi khi có thay đổi mà không giữ được trên máy.
useUnsavedGuard({ dirty: () => editor.dirty.value, kept: () => editor.localKept.value });
</script>

<template><RdSeasonEditor :editor="editor" /></template>
```

- [ ] **Step 6: Typecheck, lint, test**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/shared/lib/unsaved-guard.ts apps/admin/src/shared/lib/unsaved-guard.test.ts apps/admin/src/pages/SeasonsPage.vue
git commit -m "feat: S28 add shared unsaved-changes guard"
```

---

### Task 6: Đầu trang, bảng, bộ lọc, trạng thái rỗng

**Files:**
- Create: `apps/admin/src/shared/lib/table.ts`, `apps/admin/src/shared/lib/table.test.ts`
- Create: `apps/admin/src/shared/ui/RdPageHeader.vue`, `RdDataTable.vue`, `RdFilterBar.vue`, `RdEmptyState.vue`, `RdSkeleton.vue` (trong `apps/admin/src/shared/ui/`)
- Modify: `packages/ui/src/admin.css` (thêm vào cuối)

**Interfaces:**
- Consumes: `formatDocumentTitle` (Task 2).
- Produces: `type SortDir = 'asc' | 'desc'`; `interface TableSort { key: string; dir: SortDir }`; `interface TableColumn { key: string; label: string; sortable?: boolean; firstDir?: SortDir; width?: string; hideBelow?: 1024 }`; `toggleSort(current: TableSort | null, column: Pick<TableColumn, 'key' | 'firstDir'>): TableSort`; `ariaSort(current, key): 'ascending' | 'descending' | 'none'`; `columnClass(column): string | undefined`; `SORT_MARK`.
- Produces: `RdPageHeader` props `{ title: string; crumbs?: { label: string; to: RouteLocationRaw }[] }`, slots `status`, `meta`, `actions`; H1 có `data-rd-page-title`.
- Produces: `RdDataTable<T>` props `{ columns; rows: readonly T[]; rowKey: (row: T) => string; caption: string; loading?: boolean }`, `v-model:sort: TableSort | null`, slots `cell({ row, column })`, `card({ row })`, `empty()`.
- Produces: `RdFilterBar` props `{ label: string; active: boolean }`, emit `clear`; `RdEmptyState` props `{ kind: 'empty' | 'no-match' | 'error'; title: string; body?: string }`; `RdSkeleton` props `{ rows: number; variant: 'table' | 'card' }`.
- Produces CSS: `.rd-admin-page`, `.rd-admin-stack`, `.rd-admin-truncate`, `.rd-admin-row-title`, `.rd-admin-row-actions`, `.rd-admin-only-narrow`, `.rd-admin-only-wide`.

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/shared/lib/table.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ariaSort, columnClass, toggleSort } from './table';

describe('toggleSort', () => {
  it('cột mới bắt đầu bằng chiều đầu của cột, bấm lại thì đảo chiều', () => {
    expect(toggleSort(null, { key: 'name' })).toEqual({ key: 'name', dir: 'asc' });
    expect(toggleSort({ key: 'name', dir: 'asc' }, { key: 'name' })).toEqual({ key: 'name', dir: 'desc' });
    expect(toggleSort({ key: 'name', dir: 'desc' }, { key: 'updated', firstDir: 'desc' })).toEqual({ key: 'updated', dir: 'desc' });
    expect(toggleSort({ key: 'updated', dir: 'desc' }, { key: 'updated', firstDir: 'desc' })).toEqual({ key: 'updated', dir: 'asc' });
  });
});

describe('ariaSort, columnClass', () => {
  it('chỉ cột đang xếp có chiều', () => {
    expect(ariaSort({ key: 'name', dir: 'asc' }, 'name')).toBe('ascending');
    expect(ariaSort({ key: 'name', dir: 'desc' }, 'name')).toBe('descending');
    expect(ariaSort({ key: 'name', dir: 'asc' }, 'verified')).toBe('none');
    expect(ariaSort(null, 'name')).toBe('none');
  });
  it('cột ẩn dưới 1024px có class riêng', () => {
    expect(columnClass({ hideBelow: 1024 })).toBe('rd-admin-col--from-1024');
    expect(columnClass({})).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/table.test.ts`
Expected: FAIL, không tìm thấy module.

- [ ] **Step 3: Viết `table.ts`**

```ts
export type SortDir = 'asc' | 'desc';
export interface TableSort {
  key: string;
  dir: SortDir;
}
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  /** Chiều khi bấm cột lần đầu (cột "Cập nhật" xếp mới nhất trước). */
  firstDir?: SortDir;
  /** Độ rộng cố định (table-layout: fixed); cột không có thì chia phần còn lại. */
  width?: string;
  hideBelow?: 1024;
}
export type AriaSort = 'ascending' | 'descending' | 'none';
export const SORT_MARK: Record<AriaSort, string> = { ascending: '↑', descending: '↓', none: '' };

export function toggleSort(current: TableSort | null, column: Pick<TableColumn, 'key' | 'firstDir'>): TableSort {
  if (current && current.key === column.key) return { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key: column.key, dir: column.firstDir ?? 'asc' };
}

export function ariaSort(current: TableSort | null, key: string): AriaSort {
  if (!current || current.key !== key) return 'none';
  return current.dir === 'asc' ? 'ascending' : 'descending';
}

export function columnClass(column: Pick<TableColumn, 'hideBelow'>): string | undefined {
  return column.hideBelow ? `rd-admin-col--from-${column.hideBelow}` : undefined;
}
```

- [ ] **Step 4: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/shared/lib/table.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Viết năm component**

`apps/admin/src/shared/ui/RdPageHeader.vue`:

```vue
<script setup lang="ts">
import { watch } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import { formatDocumentTitle } from '../lib/document-title';

const props = defineProps<{ title: string; crumbs?: { label: string; to: RouteLocationRaw }[] }>();
// Tên tab theo tên trang cụ thể (tên địa điểm, lịch trình); khung trang chỉ đặt tên chung theo route.
watch(
  () => props.title,
  (title) => {
    document.title = formatDocumentTitle(title);
  },
  { immediate: true },
);
</script>

<template>
  <header class="rd-admin-header">
    <nav v-if="crumbs?.length" class="rd-admin-crumbs" aria-label="Đường dẫn">
      <ol>
        <li v-for="crumb in crumbs" :key="crumb.label"><RouterLink :to="crumb.to">{{ crumb.label }}</RouterLink></li>
        <li aria-current="page">{{ title }}</li>
      </ol>
    </nav>
    <div class="rd-admin-header__row">
      <div class="rd-admin-header__title">
        <h1 data-rd-page-title tabindex="-1">{{ title }}</h1>
        <slot name="status" />
      </div>
      <div v-if="$slots.actions" class="rd-admin-header__actions"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.meta" class="rd-admin-header__meta"><slot name="meta" /></div>
  </header>
</template>
```

`apps/admin/src/shared/ui/RdSkeleton.vue`:

```vue
<script setup lang="ts">
defineProps<{ rows: number; variant: 'table' | 'card' }>();
</script>

<template>
  <div :class="['rd-admin-skeleton', `rd-admin-skeleton--${variant}`]" aria-busy="true">
    <span class="rd-sr-only">Đang tải…</span>
    <span v-for="index in rows" :key="index" class="rd-skeleton rd-admin-skeleton__row" aria-hidden="true"></span>
  </div>
</template>
```

`apps/admin/src/shared/ui/RdEmptyState.vue`:

```vue
<script setup lang="ts">
defineProps<{ kind: 'empty' | 'no-match' | 'error'; title: string; body?: string }>();
</script>

<template>
  <div :class="['rd-admin-empty', `rd-admin-empty--${kind}`]" :role="kind === 'error' ? 'alert' : undefined">
    <p class="rd-admin-empty__title">{{ title }}</p>
    <p v-if="body" class="rd-admin-empty__body">{{ body }}</p>
    <div v-if="$slots.default" class="rd-admin-empty__actions"><slot /></div>
  </div>
</template>
```

`apps/admin/src/shared/ui/RdFilterBar.vue`:

```vue
<script setup lang="ts">
defineProps<{ label: string; active: boolean }>();
const emit = defineEmits<{ clear: [] }>();
</script>

<template>
  <div class="rd-admin-filters" role="search" :aria-label="label">
    <div class="rd-admin-filters__fields"><slot /></div>
    <button v-if="active" type="button" class="rd-btn rd-btn--ghost" @click="emit('clear')">Xoá bộ lọc</button>
  </div>
</template>
```

`apps/admin/src/shared/ui/RdDataTable.vue`:

```vue
<script setup lang="ts" generic="T">
import { ariaSort, columnClass, SORT_MARK, toggleSort, type TableColumn, type TableSort } from '../lib/table';
import RdSkeleton from './RdSkeleton.vue';

defineProps<{ columns: readonly TableColumn[]; rows: readonly T[]; rowKey: (row: T) => string; caption: string; loading?: boolean }>();
const sort = defineModel<TableSort | null>('sort', { default: null });
defineSlots<{
  cell(props: { row: T; column: TableColumn }): unknown;
  card(props: { row: T }): unknown;
  empty(): unknown;
}>();
</script>

<template>
  <div class="rd-admin-table-wrap">
    <template v-if="loading">
      <RdSkeleton class="rd-admin-only-table" :rows="6" variant="table" />
      <RdSkeleton class="rd-admin-only-cards" :rows="4" variant="card" />
    </template>
    <slot v-else-if="rows.length === 0" name="empty" />
    <template v-else>
      <table class="rd-admin-table">
        <caption class="rd-sr-only">{{ caption }}</caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="columnClass(column)"
              :style="column.width ? { width: column.width } : undefined"
              :aria-sort="column.sortable ? ariaSort(sort, column.key) : undefined"
            >
              <button v-if="column.sortable" type="button" class="rd-admin-table__sort" @click="sort = toggleSort(sort, column)">
                {{ column.label }} <span aria-hidden="true">{{ SORT_MARK[ariaSort(sort, column.key)] }}</span>
              </button>
              <template v-else>{{ column.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="rowKey(row)">
            <td v-for="column in columns" :key="column.key" :class="columnClass(column)"><slot name="cell" :row="row" :column="column" /></td>
          </tr>
        </tbody>
      </table>
      <ul class="rd-admin-cards">
        <li v-for="row in rows" :key="rowKey(row)" class="rd-admin-card"><slot name="card" :row="row" /></li>
      </ul>
    </template>
  </div>
</template>
```

- [ ] **Step 6: Thêm CSS vào cuối `packages/ui/src/admin.css`**

```css
/* Trang và đầu trang (RdPageHeader). */
.rd-admin-page { display: flex; flex-direction: column; gap: var(--space-4); max-width: var(--admin-content-max); }
.rd-admin-header { display: flex; flex-direction: column; gap: var(--space-1); }
.rd-admin-crumbs ol { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); margin: 0; padding: 0; list-style: none; font-size: 13px; color: var(--ink-soft); }
.rd-admin-crumbs li + li::before { content: '/'; margin-right: var(--space-1); }
.rd-admin-crumbs a { display: inline-flex; align-items: center; min-height: var(--tap-min); color: var(--ink); font-weight: 600; }
.rd-admin-crumbs [aria-current='page'] { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40ch; }
.rd-admin-header__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.rd-admin-header__title { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); min-width: 0; }
.rd-admin-header h1 { margin: 0; font: 700 22px/1.3 var(--font-display); overflow-wrap: anywhere; }
.rd-admin-header h1:focus { outline: none; }
.rd-admin-header__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-admin-header__meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); font-size: 13px; color: var(--ink-soft); overflow-wrap: anywhere; }
@media (min-width: 768px) { .rd-admin-header h1 { font-size: 26px; } }

/* Thanh lọc (RdFilterBar): lưới 2 cột dưới 1024px, một hàng từ 1024px. */
.rd-admin-filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.rd-admin-filters__fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); flex: 1 1 100%; }
.rd-admin-filters__search { grid-column: 1 / -1; }
@media (min-width: 1024px) {
  .rd-admin-filters { flex-wrap: nowrap; }
  .rd-admin-filters__fields { display: flex; flex: 1 1 auto; }
  .rd-admin-filters__fields > * { flex: 1 1 150px; min-width: 0; }
  .rd-admin-filters__fields > .rd-admin-filters__search { flex: 2 1 240px; }
}

/* Bảng (RdDataTable): tiêu đề dính theo trang nên khung bảng không cuộn ngang. */
.rd-admin-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); font-size: 14px; }
.rd-admin-table th { position: sticky; top: 0; z-index: var(--z-sticky); padding: 0 12px; background: var(--paper-raised); border-bottom: var(--border); text-align: left; font-size: 13px; font-weight: 600; color: var(--ink-soft); }
.rd-admin-table th:first-child { border-top-left-radius: var(--radius-card); }
.rd-admin-table th:last-child { border-top-right-radius: var(--radius-card); }
.rd-admin-table td { padding: var(--space-2) 12px; border-bottom: var(--border-hair) solid var(--mist); vertical-align: middle; overflow-wrap: anywhere; }
.rd-admin-table tbody tr:last-child td { border-bottom: 0; }
.rd-admin-table tbody tr { transition: background-color var(--dur-micro) var(--ease-out); }
@media (hover: hover) { .rd-admin-table tbody tr:hover { background: var(--paper); } }
/* Tab ngược lên không để link nằm dưới tiêu đề bảng đang dính. */
.rd-admin-table :is(a, button) { scroll-margin-top: 56px; }
.rd-admin-table__sort { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--tap-min); padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
.rd-admin-col--from-1024 { display: none; }
@media (min-width: 1024px) { .rd-admin-col--from-1024 { display: table-cell; } }
.rd-admin-cards { display: none; margin: 0; padding: 0; list-style: none; gap: var(--space-3); }
.rd-admin-card { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-3) var(--space-4); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
.rd-admin-card p { margin: 0; }
@media (max-width: 767.98px) { .rd-admin-table { display: none; } .rd-admin-cards { display: grid; } }

/* Ô và dòng trong bảng, thẻ. */
.rd-admin-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rd-admin-truncate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-admin-row-title { display: block; padding: 12px 0; line-height: 20px; color: var(--ink); font-weight: 700; }
.rd-admin-row-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-2); }
.rd-admin-card .rd-admin-row-actions { justify-content: space-between; }

/* Trạng thái rỗng, lỗi (RdEmptyState) và khung xương (RdSkeleton). */
.rd-admin-empty { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-6) var(--space-5); text-align: center; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-admin-empty--error { background: var(--status-bad-bg); color: var(--status-bad); border-color: transparent; }
.rd-admin-empty__title { margin: 0; font-weight: 700; }
.rd-admin-empty__body { margin: 0; color: var(--ink-soft); }
.rd-admin-empty--error .rd-admin-empty__body { color: inherit; }
.rd-admin-empty__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2); }
.rd-admin-skeleton { display: flex; flex-direction: column; gap: var(--space-2); }
.rd-admin-skeleton--table .rd-admin-skeleton__row { height: 56px; }
.rd-admin-skeleton--card .rd-admin-skeleton__row { height: 132px; border-radius: var(--radius-card); }

/* Hiện theo độ rộng (đặt sau các khối trên để thắng display của chúng). */
.rd-admin-skeleton.rd-admin-only-cards { display: none; }
@media (max-width: 767.98px) { .rd-admin-skeleton.rd-admin-only-table { display: none; } .rd-admin-skeleton.rd-admin-only-cards { display: flex; } }
@media (min-width: 1024px) { .rd-admin-only-narrow { display: none; } }
@media (max-width: 1023.98px) { .rd-admin-only-wide { display: none; } }
```

- [ ] **Step 7: Typecheck, lint**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/shared/lib/table.ts apps/admin/src/shared/lib/table.test.ts apps/admin/src/shared/ui/RdPageHeader.vue apps/admin/src/shared/ui/RdDataTable.vue apps/admin/src/shared/ui/RdFilterBar.vue apps/admin/src/shared/ui/RdEmptyState.vue apps/admin/src/shared/ui/RdSkeleton.vue packages/ui/src/admin.css
git commit -m "feat: S28 add page header, data table and empty states"
```

---

### Task 7: Danh sách địa điểm

**Files:**
- Create: `apps/admin/src/entities/place/model/missing.ts`, `apps/admin/src/entities/place/model/missing.test.ts`
- Modify: `apps/admin/src/widgets/place-list/model/filters.ts`, `apps/admin/src/widgets/place-list/model/filters.test.ts`
- Modify: `apps/admin/src/shared/lib/time.ts`, `apps/admin/src/shared/lib/time.test.ts`
- Create: `apps/admin/src/widgets/place-list/ui/RdPlaceRowActions.vue`
- Modify: `apps/admin/src/widgets/place-list/ui/RdPlaceList.vue` (thay toàn bộ), `apps/admin/src/pages/PlacesPage.vue` (thay toàn bộ)

**Interfaces:**
- Consumes: Task 2 (`plainQuery`, `readListReturn`, `saveListReturn`, `sameQuery`, `scrollToRestore`), Task 3 (`useToast`), Task 6 (`RdPageHeader`, `RdDataTable`, `RdFilterBar`, `RdEmptyState`, `TableColumn`, `TableSort`).
- Produces: `ACTIVATION_LABEL: Record<ActivationIssueCode, string>`, `missingLabels(codes): string[]`; `ListSort` thêm `'-updated'`; `SORT_OPTIONS`, `hasActiveFilters(filters)`, `clearFilters(filters)`, `sortToTable(sort): TableSort`, `tableToSort(table: TableSort | null): ListSort`; `formatLocalDate(iso): string`, `updatedAgoText(iso, now): string`.

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/entities/place/model/missing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { missingLabels } from './missing';

describe('missingLabels', () => {
  it('đổi mã thành nhãn, mỗi mã một lần, theo thứ tự vị trí, giờ, nguồn xác nhận, ảnh', () => {
    expect(missingLabels(['photo_source_missing', 'location_missing', 'photo_source_missing'])).toEqual(['Vị trí', 'Nguồn ảnh']);
    expect(missingLabels(['verify_source_missing', 'hours_invalid'])).toEqual(['Giờ mở cửa', 'Nguồn xác nhận']);
    expect(missingLabels([])).toEqual([]);
  });
});
```

Thêm vào cuối `apps/admin/src/widgets/place-list/model/filters.test.ts` (giữ nguyên phần cũ; thêm `clearFilters, hasActiveFilters, SORT_OPTIONS, sortToTable, tableToSort` vào import từ `./filters`):

```ts
describe('S28 xếp, xoá bộ lọc', () => {
  it('"Lâu chưa sửa" xếp sửa cũ nhất trước', () => {
    const old = row({ name: 'Cũ Giả Lập', updatedAt: '2026-09-01T03:00:00.000Z' });
    const recent = row({ name: 'Mới Giả Lập', updatedAt: '2026-10-07T03:00:00.000Z' });
    expect(names(sortRows([recent, old], '-updated'))).toEqual(['Cũ Giả Lập', 'Mới Giả Lập']);
    expect(filtersFromQuery({ sort: '-updated' }).sort).toBe('-updated');
  });
  it('ô Xếp và tiêu đề cột luôn khớp nhau, có đủ sáu cách xếp', () => {
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual(['updated', '-updated', 'name', '-name', 'verified', '-verified']);
    for (const option of SORT_OPTIONS) expect(tableToSort(sortToTable(option.value))).toBe(option.value);
    expect(sortToTable('updated')).toEqual({ key: 'updated', dir: 'desc' });
    expect(tableToSort(null)).toBe('updated');
    expect(tableToSort({ key: 'la', dir: 'asc' })).toBe('updated');
  });
  it('đang lọc khi có từ khoá, cụm, danh mục hay nguồn; xoá thì giữ tab và cách xếp', () => {
    expect(hasActiveFilters(filters())).toBe(false);
    expect(hasActiveFilters(filters({ tab: 'draft', sort: 'name' }))).toBe(false);
    expect(hasActiveFilters(filters({ q: '  ' }))).toBe(false);
    expect(hasActiveFilters(filters({ zone: NO_ZONE }))).toBe(true);
    const active = filters({ tab: 'draft', sort: 'name', q: 'giả', zone: NO_ZONE, category: 'cafe', verify: 'owner' });
    expect(clearFilters(active)).toEqual(filters({ tab: 'draft', sort: 'name' }));
  });
});
```

Thêm vào cuối `apps/admin/src/shared/lib/time.test.ts` (thêm `formatLocalDate, updatedAgoText` vào import):

```ts
describe('S28 formatLocalDate, updatedAgoText', () => {
  it('ngày theo giờ Việt Nam, đủ năm', () => {
    expect(formatLocalDate('2026-10-07T18:30:00Z')).toBe('08/10/2026');
  });
  it('sửa hôm nay thì ghi giờ; hôm trước thì như cột xác minh', () => {
    const now = new Date('2026-10-08T10:00:00Z');
    expect(updatedAgoText('2026-10-08T03:05:00Z', now)).toBe('Hôm nay 10:05');
    expect(updatedAgoText('2026-10-07T03:00:00Z', now)).toBe('Hôm qua');
    expect(updatedAgoText('2026-10-01T03:00:00Z', now)).toBe('7 ngày trước');
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/entities/place/model/missing.test.ts src/widgets/place-list/model/filters.test.ts src/shared/lib/time.test.ts`
Expected: FAIL (module `./missing` chưa có; `SORT_OPTIONS`, `formatLocalDate` chưa có).

- [ ] **Step 3: Viết `missing.ts`**

```ts
import { ActivationIssueCode } from '@ranhduong/contracts';

/** Nhãn ngắn của điều kiện kích hoạt (cột "Còn thiếu", danh sách điều kiện của form). */
export const ACTIVATION_LABEL: Record<ActivationIssueCode, string> = {
  location_missing: 'Vị trí',
  hours_invalid: 'Giờ mở cửa',
  verify_source_missing: 'Nguồn xác nhận',
  photo_source_missing: 'Nguồn ảnh',
};

/** Nhãn các điều kiện còn thiếu, mỗi mã một lần, theo thứ tự trong contract. */
export function missingLabels(codes: readonly ActivationIssueCode[]): string[] {
  return ActivationIssueCode.options.filter((code) => codes.includes(code)).map((code) => ACTIVATION_LABEL[code]);
}
```

- [ ] **Step 4: Sửa `filters.ts`**

Thêm import ở đầu file:

```ts
import type { TableSort } from '@/shared/lib/table';
```

Thay hai dòng khai báo `ListSort` (cả comment phía trên):

```ts
/** updated: sửa gần nhất trước; -updated: sửa lâu nhất trước; name: A→Z; verified: chưa xác minh và lâu nhất trước; dấu trừ là chiều ngược lại. */
export const ListSort = z.enum(['updated', '-updated', 'name', '-name', 'verified', '-verified']);
```

Trong `COMPARE`, thêm ngay dưới dòng `updated: …`:

```ts
  '-updated': (a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt) || byName(a, b),
```

Thêm vào cuối file:

```ts
/** Ô "Xếp" (spec S28 mục 6.2); nhãn hiện sau chữ "Xếp: ". */
export const SORT_OPTIONS: readonly { value: ListSort; label: string }[] = [
  { value: 'updated', label: 'Mới sửa' },
  { value: '-updated', label: 'Lâu chưa sửa' },
  { value: 'name', label: 'Tên A→Z' },
  { value: '-name', label: 'Tên Z→A' },
  { value: 'verified', label: 'Lâu chưa xác minh' },
  { value: '-verified', label: 'Mới xác minh' },
];

/** Cách xếp ↔ cột bảng; chiều là chiều thật của giá trị trong cột (mới sửa trước là giảm dần theo thời gian). */
const SORT_TABLE: Record<ListSort, TableSort> = {
  updated: { key: 'updated', dir: 'desc' },
  '-updated': { key: 'updated', dir: 'asc' },
  name: { key: 'name', dir: 'asc' },
  '-name': { key: 'name', dir: 'desc' },
  verified: { key: 'verified', dir: 'asc' },
  '-verified': { key: 'verified', dir: 'desc' },
};

export function sortToTable(sort: ListSort): TableSort {
  return SORT_TABLE[sort];
}

/** Cột không xếp được hoặc lạ thì về mặc định "Mới sửa". */
export function tableToSort(table: TableSort | null): ListSort {
  if (!table) return DEFAULT_FILTERS.sort;
  return ListSort.options.find((sort) => SORT_TABLE[sort].key === table.key && SORT_TABLE[sort].dir === table.dir) ?? DEFAULT_FILTERS.sort;
}

/** Có lọc gì ngoài tab và cách xếp không (hiện nút "Xoá bộ lọc"). */
export function hasActiveFilters(filters: ListFilters): boolean {
  return filters.q.trim() !== '' || filters.zone !== '' || filters.category !== '' || filters.verify !== '';
}

/** "Xoá bộ lọc": bỏ từ khoá, cụm, danh mục, nguồn; giữ tab và cách xếp. */
export function clearFilters(filters: ListFilters): ListFilters {
  return { ...filters, q: '', zone: '', category: '', verify: '' };
}
```

- [ ] **Step 5: Sửa `time.ts`**

Thêm vào cuối file:

```ts
/** Ngày theo giờ Việt Nam, ví dụ "08/10/2026" (khung Xác minh của form). */
export function formatLocalDate(iso: string): string {
  const parts = DAY_PARTS.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')}`;
}

/** Cột "Cập nhật": sửa trong hôm nay thì ghi giờ ("Hôm nay 10:05"), còn lại như cột xác minh. */
export function updatedAgoText(iso: string, now: Date): string {
  if (vnDayIndex(now) - vnDayIndex(new Date(iso)) <= 0) return `Hôm nay ${formatLocalTime(iso).split(' ')[0] ?? ''}`;
  return daysAgoText(iso, now);
}
```

- [ ] **Step 6: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/entities/place/model/missing.test.ts src/widgets/place-list/model/filters.test.ts src/shared/lib/time.test.ts`
Expected: PASS.

- [ ] **Step 7: Viết `RdPlaceRowActions.vue`**

```vue
<script setup lang="ts">
import type { AdminPlaceSummary } from '@ranhduong/contracts';
import { RouterLink } from 'vue-router';
import type { PlaceAction } from '@/features/place-status/model/actions';

defineProps<{ place: AdminPlaceSummary; primary: PlaceAction }>();
const emit = defineEmits<{ primary: [action: PlaceAction]; menu: [] }>();
</script>

<template>
  <div class="rd-admin-row-actions">
    <RouterLink v-if="primary.kind === 'edit'" class="rd-btn rd-btn--outline" :to="`/dia-diem/${place.id}`">{{ primary.label }}</RouterLink>
    <button v-else type="button" class="rd-btn rd-btn--outline" @click="emit('primary', primary)">{{ primary.label }}</button>
    <button type="button" class="rd-icon-btn" :aria-label="`Thao tác khác: ${place.name}`" @click="emit('menu')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </svg>
    </button>
  </div>
</template>
```

- [ ] **Step 8: Thay `RdPlaceList.vue`**

```vue
<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, type AdminPlaceSummary } from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router';
import { missingLabels } from '@/entities/place/model/missing';
import { statusChip, verifySourceLabel } from '@/entities/place/model/status';
import { primaryAction, stepFor, type DialogStep, type PlaceAction } from '@/features/place-status/model/actions';
import RdPlaceActionsDialog from '@/features/place-status/ui/RdPlaceActionsDialog.vue';
import { plainQuery, readListReturn, sameQuery, saveListReturn, scrollToRestore } from '@/shared/lib/list-return';
import type { TableColumn, TableSort } from '@/shared/lib/table';
import { daysAgoText, updatedAgoText } from '@/shared/lib/time';
import { useToast } from '@/shared/lib/toast';
import RdDataTable from '@/shared/ui/RdDataTable.vue';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import RdFilterBar from '@/shared/ui/RdFilterBar.vue';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import {
  clearFilters,
  filtersFromQuery,
  filtersToQuery,
  hasActiveFilters,
  LIST_TABS,
  NO_ZONE,
  SORT_OPTIONS,
  sortToTable,
  tableToSort,
  tabCounts,
  VERIFY_FILTERS,
  visibleRows,
  withKnownZone,
  type ListFilters,
} from '../model/filters';
import { usePlaceList } from '../model/use-place-list';
import RdPlaceRowActions from './RdPlaceRowActions.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { load, rows, zones, reload } = usePlaceList();

/** Cột theo spec S28 mục 6.3; ở 768–1023px chỉ còn Địa điểm, Trạng thái, Còn thiếu, Thao tác. */
const COLUMNS: readonly TableColumn[] = [
  { key: 'name', label: 'Địa điểm', sortable: true },
  { key: 'status', label: 'Trạng thái', width: '128px' },
  { key: 'missing', label: 'Còn thiếu', width: '150px' },
  { key: 'verified', label: 'Xác minh', sortable: true, width: '136px', hideBelow: 1024 },
  { key: 'photos', label: 'Ảnh', width: '56px', hideBelow: 1024 },
  { key: 'updated', label: 'Cập nhật', sortable: true, firstDir: 'desc', width: '120px', hideBelow: 1024 },
  { key: 'actions', label: 'Thao tác', width: '172px' },
];

/** Bộ lọc ghi vào query URL; đổi từ ngoài (tab, thanh bên, Back) thì đọc lại từ URL. */
const filters = ref<ListFilters>(filtersFromQuery(route.query));
watch(filters, (value) => void router.replace({ query: filtersToQuery(value) }), { deep: true });
watch(
  () => route.query,
  (query) => {
    const next = filtersFromQuery(query);
    if (!sameQuery(filtersToQuery(next), filtersToQuery(filters.value))) filters.value = next;
  },
);
// Đã tải xong các cụm: cụm cũ trong URL không còn thì về "Mọi cụm".
watch(zones, (list) => {
  filters.value = withKnownZone(filters.value, list.map((zone) => zone.slug));
});

/** Mốc cho "Cần xác minh lại" và thời gian tương đối; lấy lại mỗi lần tải danh sách. */
const now = ref(new Date());
watch(rows, () => {
  now.value = new Date();
});

const counts = computed(() => tabCounts(rows.value, filters.value, now.value));
const zoneNames = computed(() => new Map(zones.value.map((zone) => [zone.slug, zone.name])));
const items = computed(() =>
  visibleRows(rows.value, filters.value, now.value).map((row) => ({
    row,
    chip: statusChip(row, now.value),
    primary: primaryAction(row, now.value),
    categories: [row.category, ...row.alsoCategories].map((c) => CATEGORY_LABEL[c]).join(', '),
    zone: row.zone ? (zoneNames.value.get(row.zone) ?? row.zone) : 'Chưa chọn cụm',
    missing: missingLabels(row.activationIssues),
    verify: verifySourceLabel(row.category, row.verifySource),
    verified: row.lastVerifiedAt ? daysAgoText(row.lastVerifiedAt, now.value) : 'Chưa xác minh',
    updated: updatedAgoText(row.updatedAt, now.value),
    fullName: [row.name, ...row.aliases].join(' · '),
  })),
);
type Item = (typeof items.value)[number];
const rowKey = (item: Item) => item.row.id;

const tableSort = computed<TableSort | null>({
  get: () => sortToTable(filters.value.sort),
  set: (value) => {
    filters.value.sort = tableToSort(value);
  },
});
const filtering = computed(() => hasActiveFilters(filters.value));
function clear(): void {
  filters.value = clearFilters(filters.value);
}
function tabLink(tab: ListFilters['tab']) {
  return { query: filtersToQuery({ ...filters.value, tab }) };
}

const dialog = ref<{ place: AdminPlaceSummary; start: DialogStep } | null>(null);
function openDialog(place: AdminPlaceSummary, start: DialogStep): void {
  dialog.value = { place, start };
}
function onPrimary(place: AdminPlaceSummary, action: PlaceAction): void {
  const step = stepFor(action);
  if (step) openDialog(place, step);
}
/** Đóng hộp thoại (xong hay huỷ) thì tải lại để số đếm, trạng thái luôn mới; các dòng đang hiện giữ nguyên trong lúc tải. */
function onDialogClose(): void {
  dialog.value = null;
  void reload();
}

// Nhớ bộ lọc và vị trí cuộn khi rời danh sách; quay lại đúng bộ lọc đó thì cuộn về chỗ cũ khi dữ liệu đã tải.
onBeforeRouteLeave(() => {
  saveListReturn('places', { query: plainQuery(route.query), scrollY: Math.round(window.scrollY) });
});
let restored = false;
watch(
  () => load.value.kind,
  async (kind) => {
    if (kind !== 'ready' || restored) return;
    restored = true;
    const top = scrollToRestore(readListReturn('places'), plainQuery(route.query));
    if (top === null) return;
    await nextTick();
    window.scrollTo({ top });
  },
);
</script>

<template>
  <div class="rd-admin-page">
    <RdPageHeader title="Địa điểm">
      <template #actions><RouterLink class="rd-btn rd-btn--primary" to="/dia-diem/moi">Thêm địa điểm</RouterLink></template>
      <template v-if="load.kind === 'ready'" #meta>{{ rows.length }} địa điểm</template>
    </RdPageHeader>

    <nav class="rd-tabs" aria-label="Lọc theo trạng thái">
      <ul class="rd-tabs__list">
        <li v-for="tab in LIST_TABS" :key="tab.value">
          <RouterLink v-slot="{ href, navigate }" :to="tabLink(tab.value)" replace custom>
            <a :href="href" class="rd-tab" :aria-current="filters.tab === tab.value ? 'page' : undefined" @click="navigate">
              {{ tab.label }} <span class="rd-chip__count">{{ counts[tab.value] }}</span>
            </a>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <RdFilterBar label="Lọc địa điểm" :active="filtering" @clear="clear">
      <div class="rd-admin-filters__search">
        <label class="rd-sr-only" for="place-list-q">Tìm theo tên</label>
        <input id="place-list-q" v-model="filters.q" class="rd-input" type="search" autocomplete="off" placeholder="Tên hoặc tên khác, gõ không dấu được" />
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-zone">Cụm</label>
        <select id="place-list-zone" v-model="filters.zone" class="rd-input">
          <option value="">Mọi cụm</option>
          <option v-for="zone in zones" :key="zone.slug" :value="zone.slug">{{ zone.name }}</option>
          <option :value="NO_ZONE">Chưa chọn cụm</option>
        </select>
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-category">Danh mục</label>
        <select id="place-list-category" v-model="filters.category" class="rd-input">
          <option value="">Mọi danh mục</option>
          <option v-for="category in PlaceCategory.options" :key="category" :value="category">{{ CATEGORY_LABEL[category] }}</option>
        </select>
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-verify">Nguồn xác nhận</label>
        <select id="place-list-verify" v-model="filters.verify" class="rd-input">
          <option value="">Mọi nguồn xác nhận</option>
          <option v-for="option in VERIFY_FILTERS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
      <div>
        <label class="rd-sr-only" for="place-list-sort">Xếp</label>
        <select id="place-list-sort" v-model="filters.sort" class="rd-input">
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">Xếp: {{ option.label }}</option>
        </select>
      </div>
    </RdFilterBar>

    <p v-if="load.kind === 'ready' && rows.length > 0" class="rd-quiet" aria-live="polite">Đang hiện {{ items.length }} trong {{ rows.length }} địa điểm</p>

    <RdEmptyState v-if="load.kind === 'error'" kind="error" :title="load.message">
      <RouterLink v-if="load.login" class="rd-btn rd-btn--outline" :to="{ path: '/dang-nhap', query: { returnTo: route.fullPath } }">Đăng nhập lại</RouterLink>
      <button v-else type="button" class="rd-btn rd-btn--outline" @click="reload">Thử lại</button>
    </RdEmptyState>
    <RdDataTable
      v-else
      v-model:sort="tableSort"
      :columns="COLUMNS"
      :rows="items"
      :row-key="rowKey"
      :loading="load.kind === 'loading'"
      caption="Danh sách địa điểm"
    >
      <template #cell="{ row: item, column }">
        <div v-if="column.key === 'name'" class="rd-admin-stack">
          <RouterLink class="rd-admin-row-title rd-admin-truncate" :to="`/dia-diem/${item.row.id}`" :title="item.fullName">{{ item.row.name }}</RouterLink>
          <span class="rd-quiet rd-admin-truncate">{{ item.categories }} · {{ item.zone }}</span>
        </div>
        <span v-else-if="column.key === 'status'" :class="['rd-status', item.chip.className]">{{ item.chip.label }}</span>
        <template v-else-if="column.key === 'missing'">
          <span v-if="item.missing.length === 0" class="rd-status rd-status--ok">Đủ</span>
          <span v-else>{{ item.missing.join(', ') }}</span>
        </template>
        <div v-else-if="column.key === 'verified'" class="rd-admin-stack">
          <span>{{ item.verify }}</span>
          <span class="rd-quiet">{{ item.verified }}</span>
        </div>
        <template v-else-if="column.key === 'photos'">{{ item.row.photoCount }}</template>
        <span v-else-if="column.key === 'updated'" class="rd-quiet">{{ item.updated }}</span>
        <RdPlaceRowActions v-else :place="item.row" :primary="item.primary" @primary="onPrimary(item.row, $event)" @menu="openDialog(item.row, { kind: 'menu' })" />
      </template>
      <template #card="{ row: item }">
        <div class="rd-admin-row-actions">
          <RouterLink class="rd-admin-row-title" :to="`/dia-diem/${item.row.id}`">{{ item.row.name }}</RouterLink>
          <span :class="['rd-status', item.chip.className]">{{ item.chip.label }}</span>
        </div>
        <p class="rd-quiet">{{ item.categories }} · {{ item.zone }}</p>
        <p>{{ item.missing.length > 0 ? `Còn thiếu: ${item.missing.join(', ')}` : 'Đủ điều kiện kích hoạt' }}</p>
        <p class="rd-quiet">{{ item.verified }} · {{ item.row.photoCount }} ảnh</p>
        <RdPlaceRowActions :place="item.row" :primary="item.primary" @primary="onPrimary(item.row, $event)" @menu="openDialog(item.row, { kind: 'menu' })" />
      </template>
      <template #empty>
        <RdEmptyState v-if="rows.length === 0" kind="empty" title="Chưa có địa điểm nào." body="Bấm “Thêm địa điểm” để nhập chỗ đầu tiên.">
          <RouterLink class="rd-btn rd-btn--primary" to="/dia-diem/moi">Thêm địa điểm</RouterLink>
        </RdEmptyState>
        <RdEmptyState v-else-if="filtering" kind="no-match" title="Không có địa điểm khớp bộ lọc.">
          <button type="button" class="rd-btn rd-btn--outline" @click="clear">Xoá bộ lọc</button>
        </RdEmptyState>
        <RdEmptyState v-else kind="no-match" title="Không có địa điểm nào ở mục này." />
      </template>
    </RdDataTable>

    <RdPlaceActionsDialog
      v-if="dialog"
      :key="dialog.place.id"
      :place="dialog.place"
      :start="dialog.start"
      :now="now"
      @done="toast.show"
      @close="onDialogClose"
    />
  </div>
</template>
```

- [ ] **Step 9: Thay `PlacesPage.vue`**

```vue
<script setup lang="ts">
import RdPlaceList from '@/widgets/place-list/ui/RdPlaceList.vue';
</script>

<template><RdPlaceList /></template>
```

- [ ] **Step 10: Typecheck, lint, test, build**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin build`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/admin/src/entities/place/model/missing.ts apps/admin/src/entities/place/model/missing.test.ts apps/admin/src/widgets/place-list apps/admin/src/shared/lib/time.ts apps/admin/src/shared/lib/time.test.ts apps/admin/src/pages/PlacesPage.vue
git commit -m "feat: S28 rebuild place list with missing column, sort and cards"
```

---

### Task 8: Model form địa điểm

**Files:**
- Create: `apps/admin/src/entities/place/model/summary.ts`, `apps/admin/src/entities/place/model/summary.test.ts`
- Create: `apps/admin/src/widgets/place-editor/model/checklist.ts`, `apps/admin/src/widgets/place-editor/model/checklist.test.ts`
- Modify: `apps/admin/src/widgets/place-editor/model/form.ts`, `form.test.ts`
- Modify: `apps/admin/src/widgets/place-editor/model/use-place-editor.ts`, `use-place-editor.test.ts`
- Modify: `apps/admin/src/features/place-status/model/actions.ts`, `actions.test.ts`
- Modify: `apps/admin/src/shared/config/index.ts`, `apps/admin/src/env.d.ts`, `apps/admin/.env.example`

**Interfaces:**
- Consumes: `ACTIVATION_LABEL` (Task 7); `shouldConfirmLeave` (Task 5).
- Produces: `toPlaceSummary(place: AdminPlace): AdminPlaceSummary`; `interface ChecklistItem { code: ActivationIssueCode; label: string; target: string; ok: boolean; messages: string[] }`, `activationChecklist(issues: readonly ActivationIssue[]): ChecklistItem[]` (target là `sec-location`, `sec-hours`, `sec-verify`, `sec-photos`); `remainingErrors(form: PlaceFormState, errors: FieldErrors): FieldErrors`; `interface EditorActions { verify: PlaceAction | null; status: PlaceAction[]; locked: boolean }`, `editorActions(row, dirty): EditorActions`; `usePlaceEditor` trả thêm `flushLocal(): boolean`, `discardChanges(): void`, `refresh(): Promise<void>`; `WEB_BASE: string`.

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/entities/place/model/summary.test.ts`:

```ts
import { AdminPlace, AdminPlaceSummary } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { toPlaceSummary } from './summary';

// Dữ liệu giả, tên rõ là giả.
const base = AdminPlace.parse({
  id: '0123456789abcdef01234567',
  status: 'draft',
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  aliases: ['Gia Lap Cafe'],
  category: 'cafe',
  tags: [],
  openingHours: [],
  bestTime: [],
  transport: [],
  contact: {},
  ids: {},
  photos: [],
  updatedAt: '2026-10-08T03:00:00.000Z',
});

describe('toPlaceSummary', () => {
  it('đủ trường cho hộp thoại thao tác, tính lại điều kiện còn thiếu mỗi mã một lần', () => {
    const summary = toPlaceSummary(base);
    expect(AdminPlaceSummary.safeParse(summary).success).toBe(true);
    expect(summary).toMatchObject({ id: base.id, name: 'Quán Giả Lập', photoCount: 0 });
    expect(summary.activationIssues).toEqual(['location_missing', 'hours_invalid', 'verify_source_missing']);
  });
  it('đủ điều kiện thì không còn mã nào', () => {
    const complete = {
      ...base,
      location: { type: 'Point' as const, coordinates: [108.44, 11.94] as [number, number] },
      openingHours: Array.from({ length: 7 }, (_, day) => ({ day, open: '07:00', close: '22:00' })),
      verifySource: 'owner' as const,
    };
    expect(toPlaceSummary(complete).activationIssues).toEqual([]);
  });
});
```

`apps/admin/src/widgets/place-editor/model/checklist.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { activationChecklist } from './checklist';

describe('activationChecklist', () => {
  it('đủ 4 dòng theo thứ tự, mỗi dòng trỏ tới đúng mục và giữ câu chi tiết', () => {
    const items = activationChecklist([
      { code: 'hours_invalid', message: 'Thứ Hai: giờ đóng trước giờ mở' },
      { code: 'photo_source_missing', message: 'Ảnh 2 chưa ghi đủ nguồn, người giữ bản quyền và giấy phép' },
    ]);
    expect(items.map((item) => [item.label, item.target, item.ok])).toEqual([
      ['Vị trí', 'sec-location', true],
      ['Giờ mở cửa', 'sec-hours', false],
      ['Nguồn xác nhận', 'sec-verify', true],
      ['Nguồn ảnh', 'sec-photos', false],
    ]);
    expect(items[1]?.messages).toEqual(['Thứ Hai: giờ đóng trước giờ mở']);
  });
});
```

Thêm vào cuối `apps/admin/src/widgets/place-editor/model/form.test.ts` (thêm `emptyForm, remainingErrors` vào import từ `./form` nếu chưa có):

```ts
describe('S28 remainingErrors', () => {
  const valid = { ...emptyForm(), name: 'Quán Giả Lập', category: 'cafe' as const };
  it('chỉ giữ lỗi của ô đang báo lỗi mà vẫn còn sai', () => {
    const form = { ...valid, phone: 'không phải số', website: 'không phải link' };
    expect(Object.keys(remainingErrors(form, { phone: 'cũ', name: 'cũ' }))).toEqual(['phone']);
  });
  it('sửa đúng hết thì không còn lỗi', () => {
    expect(remainingErrors(valid, { name: 'cũ' })).toEqual({});
  });
});
```

Thêm vào cuối `apps/admin/src/features/place-status/model/actions.test.ts` (thêm `editorActions, STATUS_ACTION_LABEL` vào import từ `./actions`; thêm `statusActionsFor` vào import từ `@ranhduong/contracts`):

```ts
describe('S28 editorActions', () => {
  it('nháp chỉ thiếu nguồn xác nhận: có Xác minh, đủ thao tác trạng thái và Xoá nháp', () => {
    const actions = editorActions({ status: 'draft', activationIssues: ['verify_source_missing'] }, false);
    expect(actions.verify?.kind).toBe('verify');
    expect(actions.status.map((a) => a.label)).toEqual([...statusActionsFor('draft').map((a) => STATUS_ACTION_LABEL[a]), 'Xoá nháp']);
    expect(actions.locked).toBe(false);
  });
  it('còn thiếu điều kiện khác thì chưa xác minh được; có thay đổi chưa lưu thì khoá hết', () => {
    const actions = editorActions({ status: 'active', activationIssues: ['location_missing'] }, true);
    expect(actions.verify).toBeNull();
    expect(actions.status.some((a) => a.kind === 'delete')).toBe(false);
    expect(actions.locked).toBe(true);
  });
});
```

Thêm vào cuối `apps/admin/src/widgets/place-editor/model/use-place-editor.test.ts` (thêm `shouldConfirmLeave` từ `@/shared/lib/unsaved-guard` vào import):

```ts
describe('usePlaceEditor: S28', () => {
  it('"Bỏ thay đổi": form về bản đã lưu, xoá bản trên máy và lời hỏi khôi phục', async () => {
    const storage = memoryStorage();
    storage.data.set(KEY, oldDraft('Bản Cũ Giả Lập'));
    const { editor } = await open(storage);
    editor.form.value.name = 'Bản Mới Giả Lập';
    await vi.advanceTimersByTimeAsync(800);
    expect(storedName(storage)).toBe('Bản Mới Giả Lập');
    editor.discardChanges();
    await vi.advanceTimersByTimeAsync(800);
    expect(editor.form.value.name).toBe('Quán Giả Lập');
    expect(editor.dirty.value).toBe(false);
    expect(editor.restorable.value).toBeNull();
    expect(storedName(storage)).toBeNull();
  });
  it('ô đã báo lỗi được kiểm lại khi sửa', async () => {
    const { editor } = await open(memoryStorage());
    editor.form.value.name = '';
    await editor.save();
    expect(editor.errors.value.name).toBeDefined();
    editor.form.value.name = 'Quán Sửa Giả Lập';
    await vi.advanceTimersByTimeAsync(0);
    expect(editor.errors.value.name).toBeUndefined();
  });
  it('tải lại sau thao tác trạng thái; còn thay đổi chưa lưu thì không gọi API, không ghi đè form', async () => {
    const { editor } = await open(memoryStorage());
    vi.mocked(fetchPlace).mockResolvedValue({ ...PLACE, status: 'active', lastVerifiedAt: '2026-10-09T03:00:00.000Z' });
    await editor.refresh();
    expect(editor.place.value?.status).toBe('active');
    editor.form.value.name = 'Đang Sửa Giả Lập';
    vi.mocked(fetchPlace).mockClear();
    await editor.refresh();
    expect(fetchPlace).not.toHaveBeenCalled();
    expect(editor.form.value.name).toBe('Đang Sửa Giả Lập');
  });
  it('máy không cho lưu bản đang sửa: rời trang phải hỏi lại', async () => {
    const { editor } = await open(memoryStorage(true));
    editor.form.value.name = 'Bản Mới Giả Lập';
    expect(shouldConfirmLeave(editor.dirty.value, editor.flushLocal())).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/entities/place/model/summary.test.ts src/widgets/place-editor src/features/place-status`
Expected: FAIL (`./summary`, `./checklist` chưa có; `remainingErrors`, `editorActions`, `discardChanges`, `refresh`, `flushLocal` chưa có).

- [ ] **Step 3: Viết `summary.ts`**

```ts
import { activationIssues, ActivationIssueCode, type AdminPlace, type AdminPlaceSummary } from '@ranhduong/contracts';

/** Địa điểm đầy đủ (form) → dạng dòng danh sách, để form dùng lại hộp thoại thao tác của danh sách. */
export function toPlaceSummary(place: AdminPlace): AdminPlaceSummary {
  const codes = new Set(
    activationIssues({ location: place.location, openingHours: place.openingHours, verifySource: place.verifySource, photos: place.photos }).map((issue) => issue.code),
  );
  return {
    id: place.id,
    status: place.status,
    slug: place.slug,
    name: place.name,
    aliases: place.aliases,
    category: place.category,
    alsoCategories: place.alsoCategories,
    zone: place.zone,
    verifySource: place.verifySource,
    lastVerifiedAt: place.lastVerifiedAt,
    photoCount: place.photos.length,
    activationIssues: ActivationIssueCode.options.filter((code) => codes.has(code)),
    updatedAt: place.updatedAt,
  };
}
```

- [ ] **Step 4: Viết `checklist.ts`**

```ts
import type { ActivationIssue, ActivationIssueCode } from '@ranhduong/contracts';
import { ACTIVATION_LABEL } from '@/entities/place/model/missing';

export interface ChecklistItem {
  code: ActivationIssueCode;
  label: string;
  /** id của mục form để nhảy tới. */
  target: string;
  ok: boolean;
  messages: string[];
}

const TARGET: Record<ActivationIssueCode, string> = {
  location_missing: 'sec-location',
  hours_invalid: 'sec-hours',
  verify_source_missing: 'sec-verify',
  photo_source_missing: 'sec-photos',
};
const ORDER: readonly ActivationIssueCode[] = ['location_missing', 'hours_invalid', 'verify_source_missing', 'photo_source_missing'];

/** Bốn điều kiện kích hoạt (ui-spec §12), mỗi điều kiện kèm câu chi tiết còn thiếu. */
export function activationChecklist(issues: readonly ActivationIssue[]): ChecklistItem[] {
  return ORDER.map((code) => {
    const messages = issues.filter((issue) => issue.code === code).map((issue) => issue.message);
    return { code, label: ACTIVATION_LABEL[code], target: TARGET[code], ok: messages.length === 0, messages };
  });
}
```

- [ ] **Step 5: Thêm `remainingErrors` vào cuối `form.ts`**

```ts
/** Kiểm lại các ô đang báo lỗi: chỉ giữ lỗi của ô vẫn còn sai (sửa đúng thì lỗi mất ngay, không phải bấm lưu). */
export function remainingErrors(form: PlaceFormState, errors: FieldErrors): FieldErrors {
  const result = formToInput(form);
  if (result.ok) return {};
  const next: FieldErrors = {};
  for (const field of Object.keys(errors) as FormField[]) {
    const message = result.errors[field];
    if (message !== undefined) next[field] = message;
  }
  return next;
}
```

- [ ] **Step 6: Thêm `editorActions` vào cuối `features/place-status/model/actions.ts`**

```ts
export interface EditorActions {
  verify: PlaceAction | null;
  status: PlaceAction[];
  /** Form còn thay đổi chưa lưu: API xác minh, đổi trạng thái ghi đè verifySource và status nên khoá hết. */
  locked: boolean;
}

/** Thao tác ở cột phụ của form địa điểm (spec S28 mục 7.5). */
export function editorActions(row: Pick<AdminPlaceSummary, 'status' | 'activationIssues'>, dirty: boolean): EditorActions {
  return {
    verify: readyToVerify(row) ? VERIFY : null,
    status: [...statusActionsFor(row.status).map(statusAction), ...(row.status === 'draft' ? [DELETE] : [])],
    locked: dirty,
  };
}
```

- [ ] **Step 7: Sửa `use-place-editor.ts`**

Đổi dòng import từ `./form` thành:

```ts
import { emptyForm, formActivationIssues, formFromPlace, formToInput, PlaceFormState, remainingErrors, sameForm, type FieldErrors } from './form';
```

Ngay sau khối `watch(form, () => { … localTimer = setTimeout(flushLocal, LOCAL_SAVE_MS); }, { deep: true });`, thêm:

```ts
  // Ô đã báo lỗi được kiểm lại mỗi lần sửa: sửa đúng thì lỗi mất ngay, không phải bấm lưu lại.
  watch(
    form,
    () => {
      if (Object.keys(errors.value).length > 0) errors.value = remainingErrors(form.value, errors.value);
    },
    { deep: true },
  );
```

Ngay trước dòng `  // Rời form (đổi trang, đóng component) khi chưa tới lượt tự lưu thì ghi ngay vào máy.`, thêm:

```ts
  /** "Bỏ thay đổi": form về bản đã lưu (hoặc trống khi chưa lưu lần nào), xoá bản giữ trên máy và lời hỏi khôi phục. */
  function discardChanges(): void {
    clearTimeout(localTimer);
    localTimer = undefined;
    form.value = clone(saved.value);
    errors.value = {};
    notice.value = null;
    restorable.value = null;
    removeLocalDraft(placeDraftKey(placeId.value));
    localKept.value = false;
  }

  /** Tải lại bản trên máy chủ sau khi xác minh, đổi trạng thái; chỉ chạy khi form không còn thay đổi chưa lưu. */
  async function refresh(): Promise<void> {
    const id = placeId.value;
    if (!id || dirty.value) return;
    try {
      const updated = await fetchPlace(id);
      if (dirty.value) return;
      place.value = updated;
      saved.value = formFromPlace(updated);
      form.value = clone(saved.value);
    } catch (err) {
      const failure = toApiFailure(err);
      notice.value = { kind: 'bad', messages: [loadErrorMessage(failure)], login: failure.status === 401 };
    }
  }

```

Trong object `return`, thay ba dòng cuối `    acceptZone,\n    applyPhotos,\n    retry: init,` bằng:

```ts
    acceptZone,
    applyPhotos,
    flushLocal,
    discardChanges,
    refresh,
    retry: init,
```

- [ ] **Step 8: Thêm `WEB_BASE`**

Cuối `apps/admin/src/shared/config/index.ts`:

```ts
/** Web khách, cho link "Xem trên web" của địa điểm đang hiển thị. */
export const WEB_BASE = (import.meta.env.VITE_WEB_BASE ?? 'http://localhost:3100').replace(/\/+$/, '');
```

Trong `interface ImportMetaEnv` của `apps/admin/src/env.d.ts`, thêm dòng:

```ts
  /** Web khách (link "Xem trên web"); mặc định http://localhost:3100. */
  readonly VITE_WEB_BASE?: string;
```

Cuối `apps/admin/.env.example`:

```
VITE_WEB_BASE=http://localhost:3100
```

- [ ] **Step 9: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/entities/place/model/summary.test.ts src/widgets/place-editor src/features/place-status`
Expected: PASS.

- [ ] **Step 10: Typecheck, lint, test toàn admin**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/admin/src/entities/place/model/summary.ts apps/admin/src/entities/place/model/summary.test.ts apps/admin/src/widgets/place-editor/model apps/admin/src/features/place-status/model apps/admin/src/shared/config/index.ts apps/admin/src/env.d.ts apps/admin/.env.example
git commit -m "feat: S28 add place editor discard, refresh and checklist model"
```

---

### Task 9: Giao diện form địa điểm

**Files:**
- Create: `apps/admin/src/shared/ui/RdStickyActions.vue`, `RdFormSection.vue`, `RdField.vue` (trong `apps/admin/src/shared/ui/`)
- Create: `apps/admin/src/widgets/place-editor/ui/RdActivationChecklist.vue`
- Modify: `apps/admin/src/widgets/place-editor/ui/RdPlaceEditor.vue` (thay toàn bộ)
- Modify: `apps/admin/src/features/opening-hours-editor/ui/RdOpeningHoursEditor.vue`
- Modify: `packages/ui/src/admin.css` (thêm vào cuối)

**Interfaces:**
- Consumes: Task 3 (`useConfirm`, `useToast`), Task 5 (`useUnsavedGuard`, `isSameRecordId`), Task 6 (`RdPageHeader`, `RdEmptyState`, `RdSkeleton`), Task 7 (`formatLocalDate`), Task 8 (toàn bộ).
- Produces: `RdStickyActions` props `{ state?: string }`, đặt `--admin-bar-height` trên `<html>`; `RdFormSection` props `{ id; title; badge?: 'ok' | 'missing'; hint?; collapsible? }`, `v-model:open`, slots mặc định và `summary`, H2 có `data-section-title`; `RdField` props `{ label; hint?; error?; required?; count?: { value: number; max: number }; group? }`, slot mặc định nhận `{ id, describedBy, invalid }`.

- [ ] **Step 1: Viết ba component dùng chung**

`apps/admin/src/shared/ui/RdStickyActions.vue`:

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineProps<{ state?: string }>();
const bar = ref<HTMLElement | null>(null);
let observer: ResizeObserver | undefined;

// Đặt chiều cao thanh lên <html> để scroll-padding chừa đúng chỗ (ô đang focus không bị che) và toast nằm trên thanh.
onMounted(() => {
  const root = document.documentElement;
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
    root.style.setProperty('--admin-bar-height', `${Math.ceil(height)}px`);
  });
  if (bar.value) observer.observe(bar.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  document.documentElement.style.removeProperty('--admin-bar-height');
});
</script>

<template>
  <div ref="bar" class="rd-admin-bar">
    <p class="rd-admin-bar__state" role="status">{{ state }}</p>
    <div class="rd-admin-bar__actions"><slot /></div>
  </div>
</template>
```

`apps/admin/src/shared/ui/RdFormSection.vue`:

```vue
<script setup lang="ts">
defineProps<{ id: string; title: string; badge?: 'ok' | 'missing'; hint?: string; collapsible?: boolean }>();
const open = defineModel<boolean>('open', { default: true });
</script>

<template>
  <section :id="id" class="rd-admin-section rd-admin-form-section" :aria-labelledby="`${id}-title`">
    <div class="rd-admin-form-section__head">
      <h2 :id="`${id}-title`" class="rd-admin-section__title" tabindex="-1" data-section-title>
        <button v-if="collapsible" type="button" class="rd-admin-form-section__toggle" :aria-expanded="open" :aria-controls="`${id}-body`" @click="open = !open">
          {{ title }}
        </button>
        <template v-else>{{ title }}</template>
      </h2>
      <span v-if="hint" class="rd-quiet">{{ hint }}</span>
      <span v-if="badge" :class="['rd-status', badge === 'ok' ? 'rd-status--ok' : 'rd-status--warn']">{{ badge === 'ok' ? 'Đủ' : 'Còn thiếu' }}</span>
    </div>
    <p v-if="collapsible && !open && $slots.summary" class="rd-admin-form-section__summary"><slot name="summary" /></p>
    <div v-show="!collapsible || open" :id="`${id}-body`" class="rd-admin-form-section__body"><slot /></div>
  </section>
</template>
```

`apps/admin/src/shared/ui/RdField.vue`:

```vue
<script setup lang="ts">
import { computed, useId } from 'vue';

const props = defineProps<{ label: string; hint?: string; error?: string; required?: boolean; count?: { value: number; max: number }; group?: boolean }>();
defineSlots<{ default(props: { id: string; describedBy: string | undefined; invalid: boolean }): unknown }>();

const id = useId();
const hintId = `${id}-hint`;
const errorId = `${id}-error`;
/** Gợi ý và lỗi gắn với ô qua aria-describedby (spec S28 mục 7.3). */
const describedBy = computed(() => [props.hint || props.count ? hintId : null, props.error ? errorId : null].filter((part) => part !== null).join(' ') || undefined);
const slotProps = computed(() => ({ id, describedBy: describedBy.value, invalid: Boolean(props.error) }));
</script>

<template>
  <component :is="group ? 'fieldset' : 'div'" class="rd-field" :aria-describedby="group ? describedBy : undefined">
    <legend v-if="group" class="rd-field__label">{{ label }}<span v-if="required" aria-hidden="true"> *</span></legend>
    <label v-else :for="id" class="rd-field__label">{{ label }}<span v-if="required" aria-hidden="true"> *</span></label>
    <slot v-bind="slotProps" />
    <p v-if="hint || count" :id="hintId" class="rd-field__hint">
      {{ hint }}<span v-if="count" class="rd-admin-count">{{ count.value }}/{{ count.max }}</span>
    </p>
    <p v-if="error" :id="errorId" class="rd-field__error">{{ error }}</p>
  </component>
</template>
```

- [ ] **Step 2: Viết `RdActivationChecklist.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { ChecklistItem } from '../model/checklist';

const props = defineProps<{ items: readonly ChecklistItem[]; draft: boolean; headingId: string; listId?: string }>();
const emit = defineEmits<{ go: [target: string] }>();
const missing = computed(() => props.items.filter((item) => !item.ok).length);
const title = computed(() => {
  if (missing.value === 0) return props.draft ? 'Đủ điều kiện kích hoạt' : 'Đủ điều kiện hiển thị';
  return props.draft ? `Còn thiếu ${missing.value} điều kiện để kích hoạt` : `Còn thiếu ${missing.value} điều kiện để giữ hiển thị`;
});
</script>

<template>
  <section class="rd-admin-section" :aria-labelledby="headingId">
    <h2 :id="headingId" class="rd-admin-card-title">{{ title }}</h2>
    <ul :id="listId" class="rd-admin-checklist">
      <li v-for="item in items" :key="item.code">
        <a :href="`#${item.target}`" @click.prevent="emit('go', item.target)">
          <span :class="['rd-admin-checklist__mark', item.ok ? 'is-ok' : 'is-missing']" aria-hidden="true">{{ item.ok ? '✓' : '✗' }}</span>
          <span>{{ item.label }}<span class="rd-sr-only">{{ item.ok ? ': đủ' : ': còn thiếu' }}</span></span>
        </a>
        <ul v-if="item.messages.length > 0" class="rd-admin-checklist__details">
          <li v-for="message in item.messages" :key="message">{{ message }}</li>
        </ul>
      </li>
    </ul>
  </section>
</template>
```

- [ ] **Step 3: Thêm câu "chưa nhập giờ" vào `RdOpeningHoursEditor.vue`**

Ngay trước dòng `    <fieldset v-for="{ day, label } in WEEK_DAYS" :key="day" class="day">`, thêm:

```html
    <p v-if="slots.length === 0" class="rd-callout rd-callout--warn">Chưa nhập giờ mở cửa: các ngày đang để Đóng.</p>
```

- [ ] **Step 4: Thay `RdPlaceEditor.vue`**

```vue
<script setup lang="ts">
import {
  BEST_TIME_LABEL,
  BestTime,
  CATEGORY_LABEL,
  canVerify,
  PLACE_STATUS_LABEL,
  PLACE_TRANSPORT_LABEL,
  PlacePhoto,
  PUBLIC_CATEGORIES,
  TAG_LABEL,
  tagLabel,
  Transport,
  type ActivationIssueCode,
  type AdminPlacePhoto,
  type PlaceCategory,
  photoVariantKey,
} from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { PLACE_STATUS_CLASS } from '@/entities/place/model/status';
import { toPlaceSummary } from '@/entities/place/model/summary';
import { verifySourceOptions } from '@/entities/place/model/verify-options';
import RdDuplicateWarning from '@/features/duplicate-warning/ui/RdDuplicateWarning.vue';
import RdLocationPicker from '@/features/location-picker/ui/RdLocationPicker.vue';
import RdOpeningHoursEditor from '@/features/opening-hours-editor/ui/RdOpeningHoursEditor.vue';
import RdPhotoUpload from '@/features/photo-upload/ui/RdPhotoUpload.vue';
import { editorActions, stepFor, type DialogStep, type PlaceAction } from '@/features/place-status/model/actions';
import RdPlaceActionsDialog from '@/features/place-status/ui/RdPlaceActionsDialog.vue';
import { CITY_SLUG, MEDIA_BASE, WEB_BASE } from '@/shared/config';
import { useConfirm } from '@/shared/lib/confirm';
import { listReturnLocation } from '@/shared/lib/list-return';
import { daysAgoText, formatLocalDate, formatLocalTime } from '@/shared/lib/time';
import { useToast } from '@/shared/lib/toast';
import { isSameRecordId, useUnsavedGuard } from '@/shared/lib/unsaved-guard';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import RdField from '@/shared/ui/RdField.vue';
import RdFormSection from '@/shared/ui/RdFormSection.vue';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import RdSkeleton from '@/shared/ui/RdSkeleton.vue';
import RdStickyActions from '@/shared/ui/RdStickyActions.vue';
import { alsoCategoryChoices } from '../model/also-categories';
import { activationChecklist } from '../model/checklist';
import { usePlaceEditor } from '../model/use-place-editor';
import RdActivationChecklist from './RdActivationChecklist.vue';

const props = defineProps<{ placeId: string | null }>();
const emit = defineEmits<{ created: [id: string] }>();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const editor = usePlaceEditor(props.placeId, (id) => emit('created', id));
const { load, city, place, form, errors, notice, busy, restorable, localKept, duplicates, duplicateFailed, zoneSuggestion, status, dirty, issues } = editor;

useUnsavedGuard({
  dirty: () => dirty.value,
  kept: () => localKept.value,
  flush: editor.flushLocal,
  skip: (to) => isSameRecordId(to, editor.placeId.value),
});

const editorEl = ref<HTMLElement | null>(null);
const noticeEl = ref<HTMLElement | null>(null);
const photoBusy = ref(false);
// Lưu xong báo bằng thông báo đáy; lỗi thì đưa ô sai đầu tiên (hoặc khung báo) vào tầm nhìn.
watch(notice, async (value) => {
  if (value?.kind === 'ok') {
    toast.show(value.messages.join(' '));
    return;
  }
  if (value?.kind !== 'bad') return;
  await nextTick();
  const invalid = editorEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]');
  const target = invalid ?? noticeEl.value;
  target?.scrollIntoView({ block: 'center' });
  target?.focus({ preventScroll: true });
});

const PRICE_OPTIONS = [
  { value: '', label: 'Chưa rõ' },
  { value: '1', label: '1 · rẻ nhất' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4 · đắt nhất' },
] as const;
const COVER_OPTIONS = [
  { value: '', label: 'Chưa rõ' },
  { value: 'full', label: 'Trong nhà hoặc có mái che hết' },
  { value: 'partial', label: 'Có cả chỗ che mưa và chỗ ngoài trời' },
  { value: 'none', label: 'Ngoài trời, không chỗ che mưa' },
] as const;

const categoryOptions = computed(() => {
  const list: PlaceCategory[] = [...PUBLIC_CATEGORIES];
  const current = form.value.category;
  if (current !== '' && !list.includes(current)) list.push(current);
  return list.map((value) => ({ value, label: CATEGORY_LABEL[value] }));
});
const alsoOptions = computed(() => alsoCategoryChoices(form.value.category, form.value.alsoCategories));
const tagOptions = computed(() => [...new Set([...Object.keys(TAG_LABEL), ...form.value.tags])].map((slug) => ({ slug, label: tagLabel(slug) })));
const verifyOptions = computed(() => verifySourceOptions(form.value.category));
const boundaryNames = computed(() => (zoneSuggestion.value.kind === 'boundary' ? zoneSuggestion.value.zones.map((z) => z.name).join(' và ') : ''));
const differsZone = computed(() => (zoneSuggestion.value.kind === 'differs' ? zoneSuggestion.value.zone : null));
const loginReturnTo = computed(() => `/dia-diem/${editor.placeId.value ?? 'moi'}`);
const photoComplete = (photo: AdminPlacePhoto) => PlacePhoto.safeParse(photo).success;
const photoCredit = (photo: AdminPlacePhoto) => [photo.credit, photo.license].filter(Boolean).join(' · ') || 'chưa ghi nguồn';

const placesLink = listReturnLocation('places');
const crumbs = [{ label: 'Địa điểm', to: placesLink }];
const headerTitle = computed(() => {
  if (load.value.kind === 'loading') return 'Đang tải địa điểm…';
  if (place.value) return place.value.name;
  return load.value.kind === 'ready' ? 'Thêm địa điểm' : 'Địa điểm';
});
const checklist = computed(() => activationChecklist(issues.value));
function badge(code: ActivationIssueCode): 'ok' | 'missing' {
  return checklist.value.find((item) => item.code === code)?.ok ? 'ok' : 'missing';
}
const summary = computed(() => (place.value ? toPlaceSummary(place.value) : null));
const actions = computed(() => (summary.value ? editorActions(summary.value, dirty.value) : null));
const now = ref(new Date());
const publicUrl = computed(() => (place.value && status.value === 'active' ? `${WEB_BASE}/${CITY_SLUG}/dia-diem/${place.value.slug}` : null));
const lastVerified = computed(() => {
  const iso = place.value?.lastVerifiedAt;
  return iso ? `${formatLocalDate(iso)} (${daysAgoText(iso, now.value).toLowerCase()})` : 'Chưa xác minh';
});
const saveState = computed(() => {
  if (busy.value) return busy.value === 'activate' ? 'Đang kích hoạt…' : 'Đang lưu…';
  if (dirty.value) return localKept.value ? 'Có thay đổi chưa lưu (đã giữ trên máy này).' : 'Có thay đổi chưa lưu.';
  return place.value ? `Đã lưu lúc ${formatLocalTime(place.value.updatedAt)}.` : '';
});

/** Link trong danh sách điều kiện: cuộn tới mục và đưa focus vào tiêu đề mục. */
function goTo(target: string): void {
  const section = document.getElementById(target);
  section?.scrollIntoView({ block: 'start' });
  section?.querySelector<HTMLElement>('[data-section-title]')?.focus({ preventScroll: true });
}

async function onDiscard(): Promise<void> {
  const saved = place.value;
  const ok = await confirm({
    title: 'Bỏ các thay đổi chưa lưu?',
    body: saved ? `Form trở về bản đã lưu lúc ${formatLocalTime(saved.updatedAt)}.` : 'Form trở về trống như lúc mới mở.',
    confirmLabel: 'Bỏ thay đổi',
    cancelLabel: 'Giữ lại',
    tone: 'danger',
  });
  if (ok) editor.discardChanges();
}

const dialog = ref<{ start: DialogStep } | null>(null);
let completed: DialogStep['kind'] | null = null;
function openAction(action: PlaceAction): void {
  const step = stepFor(action);
  if (!step) return;
  now.value = new Date();
  dialog.value = { start: step };
}
// Trong hàm xử lý sự kiện, TypeScript không giữ phép thu hẹp của v-if nên đọc lại ở đây.
function openVerify(): void {
  const verify = actions.value?.verify;
  if (verify) openAction(verify);
}
function onActionDone(message: string): void {
  completed = dialog.value?.start.kind ?? null;
  toast.show(message);
}
/** Xoá nháp xong thì về danh sách (đúng bộ lọc lần trước); thao tác khác xong thì tải lại địa điểm. */
function onActionClose(): void {
  const done = completed;
  completed = null;
  dialog.value = null;
  if (done === 'delete') void router.push(placesLink);
  else if (done) void editor.refresh();
}
</script>

<template>
  <div class="rd-admin-editor">
    <RdPageHeader :title="headerTitle" :crumbs="crumbs">
      <template v-if="load.kind === 'ready'" #status>
        <span :class="['rd-status', PLACE_STATUS_CLASS[status]]">{{ PLACE_STATUS_LABEL[status] }}</span>
      </template>
      <template v-if="place" #meta>
        <span>Đường dẫn: ranhduong.vn/{{ CITY_SLUG }}/dia-diem/{{ place.slug }}{{ status === 'draft' ? ' (đổi theo tên cho tới khi kích hoạt)' : '' }}</span>
      </template>
    </RdPageHeader>

    <RdSkeleton v-if="load.kind === 'loading'" :rows="4" variant="card" />
    <RdEmptyState v-else-if="load.kind === 'not-found'" kind="empty" title="Không tìm thấy địa điểm này.">
      <RouterLink class="rd-btn rd-btn--outline" :to="placesLink">Về danh sách địa điểm</RouterLink>
    </RdEmptyState>
    <RdEmptyState v-else-if="load.kind === 'error'" kind="error" :title="load.message">
      <button type="button" class="rd-btn rd-btn--outline" @click="editor.retry">Thử lại</button>
    </RdEmptyState>
    <template v-else>
      <div v-if="restorable" class="rd-callout rd-callout--warn rd-admin-banner" role="status">
        <p class="rd-admin-line">
          Có bản đang sửa dở trên máy này, lưu lúc {{ formatLocalTime(restorable.savedAt) }}.
          <template v-if="restorable.stale">Bản trên máy chủ đã đổi sau đó; khôi phục rồi lưu sẽ ghi đè.</template>
        </p>
        <div class="rd-admin-banner__actions">
          <button type="button" class="rd-btn rd-btn--primary" @click="editor.restoreLocal">Khôi phục</button>
          <button type="button" class="rd-btn rd-btn--outline" @click="editor.discardLocal">Bỏ bản trên máy</button>
        </div>
      </div>

      <div v-if="notice?.kind === 'bad'" ref="noticeEl" tabindex="-1" class="rd-callout rd-callout--bad" role="alert">
        <p v-for="(message, i) in notice.messages" :key="i" class="rd-admin-line">{{ message }}</p>
        <RouterLink v-if="notice.login" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại</RouterLink>
      </div>

      <div class="rd-admin-editor__grid">
        <div ref="editorEl" class="rd-admin-editor__main">
          <p class="rd-quiet rd-admin-line">Ô có dấu * bắt buộc để lưu. Mục ghi “cần để kích hoạt” phải đủ trước khi hiện trên web.</p>
          <RdActivationChecklist class="rd-admin-only-narrow" heading-id="checklist-top-title" :items="checklist" :draft="status === 'draft'" @go="goTo" />

          <RdFormSection id="sec-basic" title="Thông tin cơ bản">
            <RdField v-slot="{ id, describedBy, invalid }" label="Tên" required :error="errors.name">
              <input :id="id" v-model="form.name" class="rd-input" type="text" autocomplete="off" aria-required="true" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdDuplicateWarning :matches="duplicates" :failed="duplicateFailed" />
            <RdField v-slot="{ id, describedBy, invalid }" label="Tên khác" hint="Tên tiếng Anh, tên cũ; cách nhau dấu ;" :error="errors.aliasesText">
              <input :id="id" v-model="form.aliasesText" class="rd-input" type="text" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField label="Danh mục" required group :error="errors.category">
              <div class="rd-choices">
                <label v-for="option in categoryOptions" :key="option.value" class="rd-choice">
                  <input v-model="form.category" type="radio" name="category" :value="option.value" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField
              label="Cũng phục vụ"
              group
              hint="Quán phục vụ thêm loại khác, ví dụ cà phê có cơm trưa; tối đa 2. Hai cơ sở riêng (giờ, menu khác) thì nhập thành hai địa điểm."
              :error="errors.alsoCategories"
            >
              <div class="rd-choices">
                <label v-for="option in alsoOptions" :key="option.value" class="rd-choice">
                  <input v-model="form.alsoCategories" type="checkbox" :value="option.value" :disabled="option.disabled" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Địa chỉ" :error="errors.address">
              <input :id="id" v-model="form.address" class="rd-input" type="text" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-location" title="Vị trí" hint="cần để kích hoạt" :badge="badge('location_missing')">
            <RdLocationPicker v-if="city" v-model="form.location" :city-center="city.center.coordinates" :city-bounds="city.mapBounds" />
            <RdField label="Cụm" group :error="errors.zone">
              <div class="rd-choices">
                <label class="rd-choice"><input v-model="form.zone" type="radio" name="zone" value="" />Chưa chọn</label>
                <label v-for="zone in city?.zones ?? []" :key="zone.slug" class="rd-choice">
                  <input v-model="form.zone" type="radio" name="zone" :value="zone.slug" />{{ zone.name }}
                </label>
              </div>
              <p v-if="boundaryNames" class="rd-callout rd-callout--warn">Ghim nằm trên ranh giới {{ boundaryNames }}, chọn một cụm.</p>
              <div v-else-if="differsZone" class="rd-callout rd-callout--warn zone-differs">
                <span>Ghim nằm trong cụm {{ differsZone.name }}.</span>
                <!-- Trong hàm xử lý sự kiện, TypeScript không giữ phép thu hẹp của v-else-if nên kiểm lại differsZone. -->
                <button type="button" class="rd-btn rd-btn--outline" @click="differsZone && editor.acceptZone(differsZone.slug)">Đổi sang {{ differsZone.name }}</button>
              </div>
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-hours" title="Giờ mở cửa" hint="cần để kích hoạt" :badge="badge('hours_invalid')">
            <RdOpeningHoursEditor v-model="form.hours" :error="errors.hours" />
          </RdFormSection>

          <RdFormSection id="sec-traits" title="Đặc điểm">
            <RdField label="Thẻ" group>
              <div class="rd-choices">
                <label v-for="tag in tagOptions" :key="tag.slug" class="rd-choice"><input v-model="form.tags" type="checkbox" :value="tag.slug" />{{ tag.label }}</label>
              </div>
            </RdField>
            <RdField label="Mức giá" group hint="Theo giá đồ uống hoặc món chính.">
              <div class="rd-choices">
                <label v-for="option in PRICE_OPTIONS" :key="option.value" class="rd-choice">
                  <input v-model="form.priceLevel" type="radio" name="price" :value="option.value" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField label="Mái che" group hint="Khu che mưa nhỏ (mưa là hết chỗ) thì ghi thêm vào ghi chú thực tế.">
              <div class="options">
                <label v-for="option in COVER_OPTIONS" :key="option.value" class="rd-choice rd-choice--block">
                  <input v-model="form.cover" type="radio" name="cover" :value="option.value" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Thời gian tham quan (phút)" :error="errors.visitDurationText">
              <input :id="id" v-model="form.visitDurationText" class="rd-input short" type="text" inputmode="numeric" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField label="Thời điểm đẹp" group>
              <div class="rd-choices">
                <label v-for="time in BestTime.options" :key="time" class="rd-choice"><input v-model="form.bestTime" type="checkbox" :value="time" />{{ BEST_TIME_LABEL[time] }}</label>
              </div>
            </RdField>
            <RdField label="Đi được bằng" group>
              <div class="rd-choices">
                <label v-for="mode in Transport.options" :key="mode" class="rd-choice">
                  <input v-model="form.transport" type="checkbox" :value="mode" />{{ PLACE_TRANSPORT_LABEL[mode] }}
                </label>
              </div>
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-notes" title="Ghi chú thực tế">
            <RdField
              v-slot="{ id, describedBy, invalid }"
              label="Ghi chú"
              hint="Viết bằng lời của bạn, mỗi câu một điều có ích: giờ nào đẹp, ngồi chỗ nào, đường đi, chỗ gửi xe. Không chép review của người khác."
              :count="{ value: form.practicalNotes.length, max: 1000 }"
              :error="errors.practicalNotes"
            >
              <textarea :id="id" v-model="form.practicalNotes" class="rd-input" rows="5" :aria-invalid="invalid" :aria-describedby="describedBy"></textarea>
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-contact" title="Liên hệ">
            <RdField v-slot="{ id, describedBy, invalid }" label="Số điện thoại" :error="errors.phone">
              <input :id="id" v-model="form.phone" class="rd-input" type="tel" inputmode="tel" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Fanpage" :error="errors.fanpage">
              <input :id="id" v-model="form.fanpage" class="rd-input" type="url" inputmode="url" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Website" :error="errors.website">
              <input :id="id" v-model="form.website" class="rd-input" type="url" inputmode="url" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-photos" title="Ảnh" hint="cần để kích hoạt" :badge="badge('photo_source_missing')">
            <p v-if="!place || place.photos.length === 0" class="rd-field__hint">Chưa có ảnh; trang địa điểm sẽ hiện "Ảnh đang cập nhật".</p>
            <ul v-else class="photos">
              <li v-for="(photo, i) in place.photos" :key="photo.key">
                <img :src="`${MEDIA_BASE}/${photoVariantKey(photo.key, 400)}`" :alt="`Ảnh ${i + 1} của ${place.name}`" width="96" height="96" loading="lazy" />
                <span>Ảnh {{ i + 1 }}: {{ photoCredit(photo) }}</span>
                <a v-if="photo.sourceUrl" :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer">Ảnh gốc</a>
                <span :class="['rd-status', photoComplete(photo) ? 'rd-status--ok' : 'rd-status--bad']">{{ photoComplete(photo) ? 'Có nguồn' : 'Thiếu nguồn' }}</span>
              </li>
            </ul>
            <RdPhotoUpload :place-id="editor.placeId.value" :disabled="busy !== null" @attached="editor.applyPhotos" @busy="photoBusy = $event" />
          </RdFormSection>
        </div>

        <aside class="rd-admin-editor__side" aria-label="Kích hoạt, xác minh và trạng thái">
          <RdActivationChecklist class="rd-admin-only-wide" heading-id="checklist-side-title" list-id="activation-issues" :items="checklist" :draft="status === 'draft'" @go="goTo" />

          <RdFormSection id="sec-verify" title="Xác minh" hint="cần để kích hoạt" :badge="badge('verify_source_missing')">
            <RdField label="Thông tin này đã được ai xác nhận?" group :error="errors.verifySource">
              <div class="options">
                <label v-for="option in verifyOptions" :key="option.value" class="rd-choice rd-choice--block">
                  <input v-model="form.verifySource" type="radio" name="verify" :value="option.value" />
                  <span class="option-text">{{ option.label }}<span class="rd-field__hint">{{ option.hint }}</span></span>
                </label>
              </div>
            </RdField>
            <p class="rd-field__hint">Xác minh lần cuối: {{ lastVerified }}</p>
            <template v-if="actions">
              <p v-if="actions.locked" class="rd-field__hint">Lưu thay đổi trước khi xác minh hay đổi trạng thái.</p>
              <button v-if="actions.verify" type="button" class="rd-btn rd-btn--outline" :disabled="actions.locked || busy !== null" @click="openVerify">Đánh dấu đã xác minh</button>
              <p v-else-if="canVerify(status)" class="rd-field__hint">Đủ các điều kiện khác rồi mới đánh dấu đã xác minh được.</p>
            </template>
          </RdFormSection>

          <RdFormSection id="sec-web" title="Trên web">
            <p class="rd-admin-line"><span :class="['rd-status', PLACE_STATUS_CLASS[status]]">{{ PLACE_STATUS_LABEL[status] }}</span></p>
            <template v-if="actions">
              <p v-if="actions.locked" class="rd-field__hint">Lưu thay đổi trước khi xác minh hay đổi trạng thái.</p>
              <div class="rd-admin-side-actions">
                <button v-for="action in actions.status" :key="action.label" type="button" class="rd-btn rd-btn--outline" :disabled="actions.locked || busy !== null" @click="openAction(action)">
                  {{ action.label }}
                </button>
              </div>
            </template>
            <p v-else class="rd-field__hint">Lưu nháp lần đầu rồi mới đổi trạng thái được.</p>
          </RdFormSection>

          <RdFormSection id="sec-info" title="Thông tin">
            <p class="rd-field__hint">{{ place ? `Cập nhật lúc ${formatLocalTime(place.updatedAt)}` : 'Chưa lưu lần nào.' }}</p>
            <a v-if="publicUrl" class="rd-admin-link" :href="publicUrl" target="_blank" rel="noopener noreferrer">Xem trên web ↗<span class="rd-sr-only"> (mở tab mới)</span></a>
          </RdFormSection>
        </aside>
      </div>

      <RdStickyActions :state="saveState">
        <button v-if="dirty" type="button" class="rd-btn rd-btn--ghost" :disabled="busy !== null" @click="onDiscard">Bỏ thay đổi</button>
        <template v-if="status === 'draft'">
          <button type="button" class="rd-btn rd-btn--outline" :disabled="busy !== null || photoBusy" @click="editor.save">{{ busy === 'save' ? 'Đang lưu…' : 'Lưu nháp' }}</button>
          <button type="button" class="rd-btn rd-btn--accent" :disabled="busy !== null || photoBusy || issues.length > 0" aria-describedby="activation-issues" @click="editor.activate">
            {{ busy === 'activate' ? 'Đang kích hoạt…' : 'Kích hoạt' }}
          </button>
        </template>
        <button v-else type="button" class="rd-btn rd-btn--primary" :disabled="busy !== null || photoBusy || !dirty || issues.length > 0" @click="editor.save">
          {{ busy === 'save' ? 'Đang lưu…' : 'Lưu thay đổi' }}
        </button>
      </RdStickyActions>
    </template>

    <RdPlaceActionsDialog v-if="dialog && summary" :key="dialog.start.kind" :place="summary" :start="dialog.start" :now="now" @done="onActionDone" @close="onActionClose" />
  </div>
</template>

<style scoped>
.short { max-width: 140px; }
.zone-differs { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.options { display: flex; flex-direction: column; gap: var(--space-2); }
.option-text { display: flex; flex-direction: column; gap: 2px; }
.photos { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }
.photos li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: 14px; }
.photos img { object-fit: cover; border-radius: var(--radius-thumb); background: var(--mist); }
</style>
```

- [ ] **Step 5: Thêm CSS vào cuối `packages/ui/src/admin.css`**

```css
/* Thanh lưu dính (RdStickyActions): điện thoại khoảng 94px, tràn hết lề; từ 768px là khung bo góc. */
.rd-admin-bar { position: sticky; bottom: 0; z-index: var(--z-sticky); display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); margin: 0 calc(-1 * var(--page-gutter)); padding: var(--space-3) var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px)); background: var(--paper-raised); border-top: var(--border-hair) solid var(--line); }
.rd-admin-bar__state { flex: 1 1 100%; min-height: 18px; margin: 0; font-size: 13px; color: var(--ink-soft); }
.rd-admin-bar__actions { display: flex; flex: 1 1 100%; gap: var(--space-2); }
.rd-admin-bar__actions .rd-btn { flex: 1 1 0; }
@media (min-width: 768px) {
  .rd-admin-bar { margin: 0; padding: var(--space-3) var(--space-4); border: var(--border); border-radius: var(--radius-card); }
  .rd-admin-bar__state { flex: 1 1 auto; }
  .rd-admin-bar__actions { flex: 0 0 auto; }
  .rd-admin-bar__actions .rd-btn { flex: 0 0 auto; }
}

/* Mục form (RdFormSection) và ô (RdField). */
.rd-admin-form-section { scroll-margin-top: var(--space-4); }
.rd-admin-form-section__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.rd-admin-form-section__head h2:focus { outline: none; }
.rd-admin-form-section__toggle { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--tap-min); padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
.rd-admin-form-section__toggle::after { content: '▾'; transition: rotate var(--dur-standard) var(--ease-out); }
.rd-admin-form-section__toggle[aria-expanded='false']::after { rotate: -90deg; }
.rd-admin-form-section__body { display: flex; flex-direction: column; gap: var(--space-4); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-admin-form-section__summary { margin: 0; font-size: 13px; color: var(--ink-soft); overflow-wrap: anywhere; }
.rd-admin .rd-field__error { animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-admin-count { margin-left: var(--space-2); font-variant-numeric: tabular-nums; }

/* Trình soạn: hai cột từ 1024px, cột phụ dính. */
.rd-admin-editor { display: flex; flex-direction: column; gap: var(--space-4); max-width: var(--admin-editor-max); }
.rd-admin-editor__grid { display: grid; gap: var(--space-4); align-items: start; }
.rd-admin-editor__main, .rd-admin-editor__side { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
@media (min-width: 1024px) {
  .rd-admin-editor__grid { grid-template-columns: minmax(0, 720px) 300px; }
  .rd-admin-editor__side { position: sticky; top: var(--space-6); max-height: calc(100vh - 2 * var(--space-6) - var(--admin-bar-height, 0px)); overflow-y: auto; }
}
.rd-admin-card-title { margin: 0; font: 700 15px/1.3 var(--font-body); }
.rd-admin-line { margin: 0; }
.rd-admin-banner { display: flex; flex-direction: column; gap: var(--space-3); }
.rd-admin-banner__actions, .rd-admin-side-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-admin-link { display: inline-flex; align-items: center; min-height: var(--tap-min); color: var(--ink); font-weight: 600; }
.rd-admin-checklist { display: flex; flex-direction: column; gap: var(--space-1); margin: 0; padding: 0; list-style: none; }
.rd-admin-checklist a { display: flex; align-items: center; gap: var(--space-2); min-height: var(--tap-min); color: var(--ink); }
.rd-admin-checklist__mark { width: 20px; font-weight: 700; text-align: center; }
.rd-admin-checklist__mark.is-ok { color: var(--status-ok); }
.rd-admin-checklist__mark.is-missing { color: var(--status-bad); }
.rd-admin-checklist__details { margin: 0 0 var(--space-2); padding-left: 44px; font-size: 13px; color: var(--ink-soft); }
```

- [ ] **Step 6: Typecheck, lint, test, build**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/shared/ui/RdStickyActions.vue apps/admin/src/shared/ui/RdFormSection.vue apps/admin/src/shared/ui/RdField.vue apps/admin/src/widgets/place-editor/ui apps/admin/src/features/opening-hours-editor/ui/RdOpeningHoursEditor.vue packages/ui/src/admin.css
git commit -m "feat: S28 rebuild place editor with side panel and sticky actions"
```

---

### Task 10: Model form lịch trình

**Files:**
- Create: `apps/admin/src/widgets/template-editor/model/summary.ts`, `apps/admin/src/widgets/template-editor/model/summary.test.ts`
- Modify: `apps/admin/src/widgets/template-editor/model/use-template-editor.ts`, `use-template-editor.test.ts`

**Interfaces:**
- Produces: `templateMeta(form: Pick<TemplateEditInput, 'days' | 'transport' | 'pace'>): string`; `issueCounts(analysis): { errors: number; warnings: number }`; `interface IssueTarget { day: number; stopKey: string | null }`, `firstIssueTarget(analysis, days): IssueTarget | null`; `interface StopRow { time: string; manual: boolean; errors: number; warnings: number }`, `stopRow(stop, scheduled, issues): StopRow`; `stopPosition(days, key): { day: number; index: number } | null`; `moveAnnouncement(days, key, name): string`; `type PublishConfirm = 'first-publish' | 'unpublish' | null`, `publishConfirm(current: ItineraryStatus | null, target: ItineraryStatus): PublishConfirm`; `useTemplateEditor` trả thêm `restorableSavedAt: Ref<string | null>`, `discardChanges(): void`.

- [ ] **Step 1: Viết test hỏng**

`apps/admin/src/widgets/template-editor/model/summary.test.ts`:

```ts
import type { TemplateDayInput, TemplateIssue } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { firstIssueTarget, issueCounts, moveAnnouncement, publishConfirm, stopPosition, stopRow, templateMeta } from './summary';

const place = '111111111111111111111111';
const k1 = '11111111-1111-4111-8111-111111111111';
const k2 = '22222222-2222-4222-8222-222222222222';
const k3 = '33333333-3333-4333-8333-333333333333';
const stop = (key: string) => ({ key, placeId: place, kind: 'visit' as const, note: '' });
const days: TemplateDayInput[] = [
  { startTime: '07:00', stops: [stop(k1), stop(k2)] },
  { startTime: '07:00', stops: [stop(k3)] },
];
const issue = (level: TemplateIssue['level'], day: number, stopKey?: string): TemplateIssue => ({ code: 'outside_hours', level, day, stopKey, message: 'Giả lập' });

describe('templateMeta, issueCounts', () => {
  it('tóm tắt số ngày, số điểm, phương tiện, nhịp độ', () => {
    expect(templateMeta({ days, transport: 'motorbike', pace: 'relaxed' })).toBe('2 ngày · 3 điểm · xe máy · thong thả');
  });
  it('đếm lỗi và nhắc nhở', () => {
    expect(issueCounts({ issues: [issue('error', 0, k1), issue('warning', 1), issue('warning', 0)] })).toEqual({ errors: 1, warnings: 2 });
  });
});

describe('firstIssueTarget', () => {
  it('lỗi trước nhắc nhở, rồi theo ngày và thứ tự điểm', () => {
    expect(firstIssueTarget({ issues: [issue('warning', 0, k1), issue('error', 1, k3), issue('error', 0, k2)] }, days)).toEqual({ day: 0, stopKey: k2 });
  });
  it('vấn đề cả ngày đứng trước các điểm trong ngày; không có vấn đề thì null', () => {
    expect(firstIssueTarget({ issues: [issue('warning', 0, k1), issue('warning', 0)] }, days)).toEqual({ day: 0, stopKey: null });
    expect(firstIssueTarget({ issues: [] }, days)).toBeNull();
  });
});

describe('stopRow', () => {
  it('giờ lấy từ lịch đã tính, thiếu thì lấy giờ sửa tay; đếm vấn đề của riêng điểm', () => {
    const issues = [issue('error', 0, k1), issue('warning', 0, k1), issue('warning', 0, k2)];
    expect(stopRow(stop(k1), { start: '07:00', end: '08:00' }, issues)).toEqual({ time: '07:00–08:00', manual: false, errors: 1, warnings: 1 });
    expect(stopRow({ ...stop(k2), manualStart: '09:' }, undefined, [])).toEqual({ time: '09:–--:--', manual: true, errors: 0, warnings: 0 });
  });
});

describe('stopPosition, moveAnnouncement', () => {
  it('tìm vị trí điểm và báo cho trình đọc màn hình', () => {
    expect(stopPosition(days, k3)).toEqual({ day: 1, index: 0 });
    expect(stopPosition(days, '44444444-4444-4444-8444-444444444444')).toBeNull();
    expect(moveAnnouncement(days, k2, 'Quán Giả Lập')).toBe('Đã chuyển Quán Giả Lập tới vị trí 2, ngày 1.');
  });
});

describe('publishConfirm', () => {
  it('hỏi khi công khai lần đầu và khi chuyển về nháp; lưu tiếp cùng trạng thái thì không', () => {
    expect(publishConfirm(null, 'published')).toBe('first-publish');
    expect(publishConfirm('draft', 'published')).toBe('first-publish');
    expect(publishConfirm('published', 'draft')).toBe('unpublish');
    expect(publishConfirm('published', 'published')).toBeNull();
    expect(publishConfirm('draft', 'draft')).toBeNull();
  });
});
```

Thêm vào cuối `apps/admin/src/widgets/template-editor/model/use-template-editor.test.ts`:

```ts
describe('S28 bỏ thay đổi, giờ đã giữ trên máy', () => {
  it('"Bỏ thay đổi" trả form về bản đã lưu và xoá bản trên máy', async () => {
    const editor = await open();
    editor.form.value.title = 'Đổi Giả Lập';
    expect(storage.size).toBe(1);
    editor.discardChanges();
    expect(editor.form.value.title).toBe('');
    expect(editor.dirty.value).toBe(false);
    expect(editor.localKept.value).toBe(false);
    expect(storage.size).toBe(0);
  });
  it('khung khôi phục biết bản trên máy được giữ lúc nào', async () => {
    storage.set('rd:template:da-lat:moi', JSON.stringify({ savedAt: '2026-10-14T02:00:00.000Z', value: input }));
    const editor = await open();
    expect(editor.restorableSavedAt.value).toBe('2026-10-14T02:00:00.000Z');
    editor.discardLocal();
    expect(editor.restorableSavedAt.value).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, thấy hỏng**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/widgets/template-editor/model`
Expected: FAIL (`./summary` chưa có; `discardChanges`, `restorableSavedAt` chưa có).

- [ ] **Step 3: Viết `summary.ts`**

```ts
import {
  PACE_LABEL,
  TRANSPORT_LABEL,
  type ItineraryStatus,
  type ScheduledTemplateStop,
  type TemplateAnalysis,
  type TemplateDayInput,
  type TemplateEditInput,
  type TemplateIssue,
  type TemplateStopInput,
} from '@ranhduong/contracts';

/** Dòng phụ ở đầu trang: "2 ngày · 9 điểm · xe máy · thong thả". */
export function templateMeta(form: Pick<TemplateEditInput, 'days' | 'transport' | 'pace'>): string {
  const stops = form.days.reduce((sum, day) => sum + day.stops.length, 0);
  return `${form.days.length} ngày · ${stops} điểm · ${TRANSPORT_LABEL[form.transport]} · ${PACE_LABEL[form.pace]}`;
}

export function issueCounts(analysis: Pick<TemplateAnalysis, 'issues'>): { errors: number; warnings: number } {
  const errors = analysis.issues.filter((issue) => issue.level === 'error').length;
  return { errors, warnings: analysis.issues.length - errors };
}

export interface IssueTarget {
  day: number;
  /** null: vấn đề của cả ngày (thiếu bữa, kết thúc muộn). */
  stopKey: string | null;
}
type Rank = readonly [number, number, number];
const compareRank = (a: Rank, b: Rank) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Vấn đề đầu tiên để nhảy tới: lỗi trước nhắc nhở, rồi theo ngày, rồi theo thứ tự điểm (vấn đề cả ngày đứng trước). */
export function firstIssueTarget(analysis: Pick<TemplateAnalysis, 'issues'>, days: readonly TemplateDayInput[]): IssueTarget | null {
  let best: { rank: Rank; target: IssueTarget } | null = null;
  for (const issue of analysis.issues) {
    const index = issue.stopKey ? (days[issue.day]?.stops.findIndex((stop) => stop.key === issue.stopKey) ?? -1) : -1;
    const rank: Rank = [issue.level === 'error' ? 0 : 1, issue.day, index];
    if (!best || compareRank(rank, best.rank) < 0) best = { rank, target: { day: issue.day, stopKey: issue.stopKey ?? null } };
  }
  return best?.target ?? null;
}

export interface StopRow {
  time: string;
  manual: boolean;
  errors: number;
  warnings: number;
}

/** Hàng gọn của một điểm dừng: khoảng giờ (đã tính, thiếu thì giờ sửa tay đang nhập) và số vấn đề của riêng điểm. */
export function stopRow(
  stop: Pick<TemplateStopInput, 'key' | 'manualStart' | 'manualEnd'>,
  scheduled: Pick<ScheduledTemplateStop, 'start' | 'end'> | undefined,
  issues: readonly TemplateIssue[],
): StopRow {
  const own = issues.filter((issue) => issue.stopKey === stop.key);
  const errors = own.filter((issue) => issue.level === 'error').length;
  const start = scheduled?.start ?? stop.manualStart ?? '--:--';
  const end = scheduled?.end ?? stop.manualEnd ?? '--:--';
  return { time: `${start}–${end}`, manual: Boolean(stop.manualStart || stop.manualEnd), errors, warnings: own.length - errors };
}

export function stopPosition(days: readonly TemplateDayInput[], key: string): { day: number; index: number } | null {
  for (const [day, value] of days.entries()) {
    const index = value.stops.findIndex((stop) => stop.key === key);
    if (index >= 0) return { day, index };
  }
  return null;
}

/** Câu báo cho trình đọc màn hình sau khi đổi chỗ một điểm. */
export function moveAnnouncement(days: readonly TemplateDayInput[], key: string, name: string): string {
  const position = stopPosition(days, key);
  return position ? `Đã chuyển ${name} tới vị trí ${position.index + 1}, ngày ${position.day + 1}.` : '';
}

export type PublishConfirm = 'first-publish' | 'unpublish' | null;

/** Hỏi lại khi công khai lần đầu (slug cố định từ đó) và khi chuyển về nháp (thôi hiện trên web). */
export function publishConfirm(current: ItineraryStatus | null, target: ItineraryStatus): PublishConfirm {
  if (target === 'published' && current !== 'published') return 'first-publish';
  if (target === 'draft' && current === 'published') return 'unpublish';
  return null;
}
```

- [ ] **Step 4: Sửa `use-template-editor.ts`**

Ngay dưới dòng `  const restorable = ref<TemplateEditInput | null>(null);`, thêm:

```ts
  const restorableSavedAt = ref<string | null>(null);
```

Thay dòng `      restorable.value = readLocalDraft(storageKey(), TemplateLocalDraft)?.value ?? null;` bằng:

```ts
      const local = readLocalDraft(storageKey(), TemplateLocalDraft);
      restorable.value = local?.value ?? null;
      restorableSavedAt.value = local?.savedAt ?? null;
```

Thay hai dòng `function restore(): void { … }` và `function discardLocal(): void { … }` bằng:

```ts
  function restore(): void { if (restorable.value) form.value = { ...restorable.value, status: template.value?.status ?? 'draft' }; restorable.value = null; restorableSavedAt.value = null; }
  function discardLocal(): void { restorable.value = null; restorableSavedAt.value = null; removeLocalDraft(storageKey()); localKept.value = false; }
  /** "Bỏ thay đổi": form về bản đã lưu (hoặc trống khi chưa lưu), xoá bản trên máy và lời hỏi khôi phục. */
  function discardChanges(): void {
    form.value = TemplateLocalDraft.parse(JSON.parse(baseline.value));
    removeLocalDraft(storageKey()); localKept.value = false; restorable.value = null; restorableSavedAt.value = null; errors.value = []; notice.value = '';
  }
```

Trong dòng `return { … }`, thay `restorable, localKept,` bằng `restorable, restorableSavedAt, localKept,` và thay `restore, discardLocal,` bằng `restore, discardLocal, discardChanges,`.

- [ ] **Step 5: Chạy test, thấy qua**

Run: `pnpm --filter @ranhduong/admin exec vitest run src/widgets/template-editor/model`
Expected: PASS.

- [ ] **Step 6: Typecheck, lint**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/widgets/template-editor/model
git commit -m "feat: S28 add itinerary editor summary and discard model"
```

---

### Task 11: Giao diện form lịch trình

**Files:**
- Modify: `apps/admin/src/widgets/template-editor/ui/RdTemplateEditor.vue` (thay toàn bộ)
- Modify: `apps/admin/src/widgets/template-editor/ui/RdTemplateTimeline.vue` (thay toàn bộ)
- Modify: `apps/admin/src/widgets/template-editor/ui/RdTemplatePicker.vue` (chỉ phần `<style scoped>`)

**Interfaces:**
- Consumes: Task 3, 5, 6, 9 (`RdFormSection`, `RdStickyActions`), Task 10.
- Produces: `RdTemplateTimeline` thêm prop `expandedKey: string | null`, emit `expand: [key: string | null]`; phần tử `[data-stop-toggle="{key}"]`, `[data-day-title="{day}"]` để nhảy tới vấn đề.

- [ ] **Step 1: Thay `RdTemplateTimeline.vue`**

```vue
<script setup lang="ts">
import { CATEGORY_LABEL, WEEK_DAYS, type TemplateAnalysis, type TemplateDayInput, type TemplatePlace, type TemplateStopInput } from '@ranhduong/contracts';
import { computed, nextTick, ref } from 'vue';
import { moveAnnouncement, stopRow } from '../model/summary';

const props = defineProps<{ days: TemplateDayInput[]; analysis: TemplateAnalysis; places: TemplatePlace[]; busy: boolean; expandedKey: string | null }>();
const emit = defineEmits<{
  start: [day: number, value: string];
  stop: [key: string, patch: Partial<TemplateStopInput>];
  move: [key: string, day: number, index: number];
  remove: [key: string];
  replace: [key: string, placeId: string];
  drop: [event: DragEvent, day: number, index: number];
  removeDay: [day: number];
  addDay: [];
  expand: [key: string | null];
}>();

const placesById = computed(() => new Map(props.places.map((p) => [p.id, p])));
const value = (event: Event) => (event.target as HTMLInputElement).value;
const nameOf = (placeId: string) => placesById.value.get(placeId)?.name ?? 'Địa điểm không còn tồn tại';
const categoryOf = (placeId: string) => {
  const place = placesById.value.get(placeId);
  return place ? CATEGORY_LABEL[place.category] : '';
};
const durationOf = (stop: TemplateStopInput) => stop.durationMin ?? placesById.value.get(stop.placeId)?.visitDurationMin ?? 60;
const scheduled = (day: number, key: string) => props.analysis.days[day]?.stops.find((stop) => stop.key === key);
const rows = computed(() => new Map(props.days.flatMap((day, d) => day.stops.map((stop) => [stop.key, stopRow(stop, scheduled(d, stop.key), props.analysis.issues)] as const))));

/** Câu báo cho trình đọc màn hình sau khi đổi chỗ, bỏ điểm. */
const announcement = ref('');

function drag(event: DragEvent, key: string): void {
  if (props.busy) {
    event.preventDefault();
    return;
  }
  event.dataTransfer?.setData('application/x-rd-itinerary', JSON.stringify({ kind: 'stop', key }));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

/** Sau khi đổi chỗ: báo vị trí mới và giữ focus trên đúng nút của điểm đó (nút bị tắt ở mép thì về nút mở hàng). */
async function afterMove(key: string, focus: 'up' | 'down' | 'toggle'): Promise<void> {
  await nextTick();
  const stop = props.days.flatMap((day) => day.stops).find((s) => s.key === key);
  announcement.value = stop ? moveAnnouncement(props.days, key, nameOf(stop.placeId)) : '';
  const button = document.querySelector<HTMLButtonElement>(`[data-stop-${focus}="${key}"]`);
  const target = button && !button.disabled ? button : document.querySelector<HTMLElement>(`[data-stop-toggle="${key}"]`);
  target?.focus();
}
function moveBy(key: string, day: number, index: number, delta: -1 | 1): void {
  emit('move', key, day, delta < 0 ? index - 1 : index + 2);
  void afterMove(key, delta < 0 ? 'up' : 'down');
}
function moveDay(event: Event, key: string): void {
  const target = Number(value(event));
  emit('move', key, target, props.days[target]?.stops.length ?? 0);
  void afterMove(key, 'toggle');
}
async function removeStop(key: string, day: number, placeId: string): Promise<void> {
  emit('remove', key);
  announcement.value = `Đã bỏ ${nameOf(placeId)} khỏi ngày ${day + 1}.`;
  await nextTick();
  document.querySelector<HTMLElement>(`[data-day-title="${day}"]`)?.focus();
}
</script>

<template>
  <section class="rd-template-timeline" aria-label="Lịch trình theo ngày">
    <p class="rd-sr-only" aria-live="polite">{{ announcement }}</p>
    <section
      v-for="(day, d) in days"
      :key="d"
      class="rd-admin-section rd-template-timeline__day"
      :data-day-index="d"
      @dragover.prevent
      @drop.prevent.stop="emit('drop', $event, d, day.stops.length)"
    >
      <header class="rd-template-timeline__head">
        <h2 class="rd-admin-section__title" tabindex="-1" :data-day-title="d">Ngày {{ d + 1 }} · {{ WEEK_DAYS.find((w) => w.day === analysis.days[d]?.weekday)?.label }}</h2>
        <label class="rd-template-timeline__start">
          <span>Bắt đầu</span>
          <input class="rd-input" type="time" :value="day.startTime" :disabled="busy" :aria-label="`Giờ bắt đầu ngày ${d + 1}`" @change="emit('start', d, value($event))" />
        </label>
        <button type="button" class="rd-btn rd-btn--ghost" :disabled="busy || days.length === 1" @click="emit('removeDay', d)">Bỏ ngày {{ d + 1 }}</button>
      </header>
      <p
        v-for="(issue, index) in analysis.issues.filter((i) => i.day === d && !i.stopKey)"
        :key="`${issue.code}-${index}`"
        :class="['rd-callout', issue.level === 'error' ? 'rd-callout--bad' : 'rd-callout--warn']"
      >
        {{ issue.level === 'error' ? 'Lỗi' : 'Nhắc' }}: {{ issue.message }}
      </p>
      <p v-if="!day.stops.length" class="rd-callout rd-callout--warn">Kéo địa điểm vào đây hoặc bấm Thêm ở kho.</p>
      <ol class="rd-template-timeline__stops">
        <li
          v-for="(stop, s) in day.stops"
          :key="stop.key"
          :class="['rd-stop-row', { 'is-open': expandedKey === stop.key }]"
          :data-stop-key="stop.key"
          :draggable="!busy && expandedKey !== stop.key"
          @dragstart.stop="drag($event, stop.key)"
          @dragover.prevent.stop
          @drop.prevent.stop="emit('drop', $event, d, s)"
        >
          <p v-if="s > 0" class="rd-stop-row__travel">{{ scheduled(d, stop.key)?.travelMinFromPrev ?? 0 }} phút di chuyển từ điểm trước (ước lượng)</p>
          <div class="rd-stop-row__head">
            <span class="rd-stop-row__num" aria-hidden="true">{{ s + 1 }}</span>
            <button
              type="button"
              class="rd-stop-row__toggle"
              :aria-expanded="expandedKey === stop.key"
              :aria-controls="`stop-body-${stop.key}`"
              :data-stop-toggle="stop.key"
              @click="emit('expand', expandedKey === stop.key ? null : stop.key)"
            >
              <span class="rd-stop-row__time">{{ rows.get(stop.key)?.time }}</span>
              <span class="rd-stop-row__name"><span class="rd-sr-only">Điểm {{ s + 1 }}: </span>{{ nameOf(stop.placeId) }}</span>
              <span class="rd-stop-row__meta">
                {{ categoryOf(stop.placeId) }} · {{ durationOf(stop) }} phút<template v-if="stop.kind === 'meal'"> · Bữa ăn</template><template v-if="rows.get(stop.key)?.manual"> · đã sửa tay</template>
              </span>
            </button>
            <span v-if="rows.get(stop.key)?.errors" class="rd-status rd-status--bad">✕ {{ rows.get(stop.key)?.errors }}<span class="rd-sr-only"> lỗi</span></span>
            <span v-if="rows.get(stop.key)?.warnings" class="rd-status rd-status--warn">⚠ {{ rows.get(stop.key)?.warnings }}<span class="rd-sr-only"> nhắc</span></span>
          </div>
          <div v-if="expandedKey === stop.key" :id="`stop-body-${stop.key}`" class="rd-stop-row__body">
            <div class="rd-template-timeline__times">
              <label class="rd-field"><span class="rd-field__label">Giờ đến</span><input class="rd-input" type="time" :disabled="busy" :value="stop.manualStart ?? scheduled(d, stop.key)?.start" @change="emit('stop', stop.key, { manualStart: value($event) || undefined })" /></label>
              <label class="rd-field"><span class="rd-field__label">Giờ đi (HH:mm)</span><input class="rd-input" placeholder="08:00" :disabled="busy" :value="stop.manualEnd ?? scheduled(d, stop.key)?.end" @input="emit('stop', stop.key, { manualEnd: value($event) || undefined })" /></label>
              <label class="rd-field"><span class="rd-field__label">Dừng dự kiến (phút)</span><input class="rd-input" type="number" min="1" max="1440" :disabled="busy" :value="durationOf(stop)" @change="emit('stop', stop.key, { durationMin: Number(value($event)) || undefined })" /></label>
              <label class="rd-field"><span class="rd-field__label">Loại điểm</span><select class="rd-input" :disabled="busy" :value="stop.kind" @change="emit('stop', stop.key, { kind: value($event) === 'meal' ? 'meal' : 'visit' })"><option value="visit">Ghé thăm</option><option value="meal">Bữa ăn</option></select></label>
            </div>
            <div v-if="stop.manualStart || stop.manualEnd" class="rd-template-timeline__actions">
              <span class="rd-status rd-status--warn">Đã sửa tay</span>
              <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="emit('stop', stop.key, { manualStart: undefined, manualEnd: undefined })">Tính lại tự động</button>
            </div>
            <label class="rd-field"><span class="rd-field__label">Ghi chú điểm dừng</span><textarea class="rd-input" :value="stop.note" rows="2" maxlength="2000" :disabled="busy" @input="emit('stop', stop.key, { note: value($event) })"></textarea></label>
            <div class="rd-template-timeline__times">
              <label class="rd-field">
                <span class="rd-field__label">Đổi địa điểm</span>
                <select class="rd-input" :value="stop.placeId" :disabled="busy" @change="emit('replace', stop.key, value($event))">
                  <option v-if="!placesById.has(stop.placeId)" :value="stop.placeId">Địa điểm không còn tồn tại</option>
                  <option v-for="place in places" :key="place.id" :value="place.id" :disabled="!['active', 'draft'].includes(place.status)">{{ place.name }}</option>
                </select>
              </label>
              <label class="rd-field">
                <span class="rd-field__label">Chuyển sang ngày</span>
                <select class="rd-input" :value="d" :disabled="busy" @change="moveDay($event, stop.key)">
                  <option v-for="(_, i) in days" :key="i" :value="i">Ngày {{ i + 1 }}</option>
                </select>
              </label>
            </div>
            <div class="rd-template-timeline__actions">
              <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || s === 0" :data-stop-up="stop.key" :aria-label="`Đưa điểm ${s + 1} ngày ${d + 1} lên`" @click="moveBy(stop.key, d, s, -1)">↑ Lên</button>
              <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || s === day.stops.length - 1" :data-stop-down="stop.key" :aria-label="`Đưa điểm ${s + 1} ngày ${d + 1} xuống`" @click="moveBy(stop.key, d, s, 1)">↓ Xuống</button>
              <button type="button" class="rd-btn rd-btn--ghost" :disabled="busy" :aria-label="`Bỏ điểm ${s + 1} ngày ${d + 1}`" @click="removeStop(stop.key, d, stop.placeId)">Bỏ điểm</button>
            </div>
            <p
              v-for="issue in analysis.issues.filter((i) => i.stopKey === stop.key)"
              :key="issue.code"
              :class="['rd-callout', issue.level === 'error' ? 'rd-callout--bad' : 'rd-callout--warn']"
            >
              {{ issue.level === 'error' ? 'Lỗi' : 'Nhắc' }}: {{ issue.message }}
            </p>
          </div>
        </li>
      </ol>
      <div class="rd-template-timeline__drop" @dragover.prevent.stop @drop.prevent.stop="emit('drop', $event, d, day.stops.length)">Thả địa điểm vào cuối ngày {{ d + 1 }}</div>
    </section>
    <button type="button" class="rd-btn rd-btn--outline" :disabled="busy || days.length >= 5" @click="emit('addDay')">+ Thêm ngày ({{ days.length }}/5)</button>
  </section>
</template>

<style scoped>
.rd-template-timeline { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.rd-template-timeline__day { min-width: 0; }
.rd-template-timeline__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.rd-template-timeline__head h2 { flex: 1 1 auto; }
.rd-template-timeline__head h2:focus { outline: none; }
.rd-template-timeline__start { display: inline-flex; align-items: center; gap: var(--space-2); font-weight: 600; }
.rd-template-timeline__start .rd-input { width: auto; }
.rd-template-timeline__stops { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.rd-stop-row { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; padding: var(--space-2) var(--space-3); border: var(--border); border-radius: var(--radius-chip); background: var(--paper); overflow-wrap: anywhere; transition: border-color var(--dur-micro) var(--ease-out); }
.rd-stop-row[draggable='true'] { cursor: grab; }
.rd-stop-row.is-open { border: var(--border-strong) solid var(--ink); background: var(--paper-raised); }
.rd-stop-row__travel { margin: 0; font: italic 400 12px/16px var(--font-body); color: var(--ink-soft); }
.rd-stop-row__head { display: flex; align-items: center; gap: var(--space-2); }
.rd-stop-row__num { flex: 0 0 28px; height: 28px; border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); display: flex; align-items: center; justify-content: center; font: 700 13px var(--font-body); }
.rd-stop-row__toggle { flex: 1 1 auto; min-width: 0; min-height: var(--tap-min); display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: var(--space-3); align-items: center; padding: 0; border: 0; background: none; color: var(--ink); font: inherit; text-align: left; cursor: pointer; }
.rd-stop-row__time { grid-row: 1 / span 2; font: 700 13px/18px var(--font-body); font-variant-numeric: tabular-nums; color: var(--ink-soft); }
.rd-stop-row__name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-stop-row__meta { font-size: 13px; color: var(--ink-soft); }
.rd-stop-row__body { display: flex; flex-direction: column; gap: var(--space-3); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-template-timeline__times { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.rd-template-timeline__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.rd-template-timeline__drop { padding: var(--space-4); border: var(--border-hair) dashed var(--ink-soft); border-radius: var(--radius-chip); color: var(--ink-soft); font-size: 13px; }
</style>
```

- [ ] **Step 2: Thay `RdTemplateEditor.vue`**

```vue
<script setup lang="ts">
import { TemplateDragPayload, WEEK_DAYS, type ItineraryStatus } from '@ranhduong/contracts';
import { slugify } from '@ranhduong/geo';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { CITY_SLUG } from '@/shared/config';
import { useConfirm } from '@/shared/lib/confirm';
import { listReturnLocation } from '@/shared/lib/list-return';
import { formatLocalTime } from '@/shared/lib/time';
import { useToast } from '@/shared/lib/toast';
import { isSameRecordId, useUnsavedGuard } from '@/shared/lib/unsaved-guard';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import RdFormSection from '@/shared/ui/RdFormSection.vue';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import RdSkeleton from '@/shared/ui/RdSkeleton.vue';
import RdStickyActions from '@/shared/ui/RdStickyActions.vue';
import { firstIssueTarget, issueCounts, publishConfirm, templateMeta } from '../model/summary';
import { useTemplateEditor } from '../model/use-template-editor';
import RdTemplatePicker from './RdTemplatePicker.vue';
import RdTemplatePreview from './RdTemplatePreview.vue';
import RdTemplateTimeline from './RdTemplateTimeline.vue';

const props = defineProps<{ templateId: string | null }>();
const emit = defineEmits<{ created: [id: string] }>();
const editor = useTemplateEditor(props.templateId, (id) => emit('created', id));
const { template, form, places, analysis, loading, loadError, errors, notice, busy, loginRequired, loginReturnTo, restorable, restorableSavedAt, dirty, localKept } = editor;
const confirm = useConfirm();
const toast = useToast();

// Cùng quy tắc cũ: chỉ hỏi khi có thay đổi mà không giữ được trên máy; tạo xong (/moi thành /{id}) thì không hỏi.
useUnsavedGuard({ dirty: () => dirty.value, kept: () => localKept.value, skip: (to) => isSameRecordId(to, editor.id.value) });

/** Dưới 1024px: một panel mỗi lúc; từ 1024px: lịch trình luôn hiện, cột phải đổi giữa kho và xem trước. */
const panel = ref<'timeline' | 'library' | 'preview'>('timeline');
const sidePanel = ref<'library' | 'preview'>('library');
const expandedKey = ref<string | null>(null);
/** Lịch trình mới thì mở sẵn khung thông tin; đã có thì gập lại. */
const infoOpen = ref(props.templateId === null);
watch(loading, (value) => {
  if (!value) infoOpen.value = template.value === null;
});

const counts = computed(() => issueCounts(analysis.value));
const slug = computed(() => template.value?.slug ?? slugify(form.value.title));
const publicUrl = computed(() => `https://ranhduong.vn/${CITY_SLUG}/lich-trinh/${slug.value || 'ten-lich-trinh'}`);
const isPublished = computed(() => template.value?.status === 'published');
const title = computed(() => (loading.value ? 'Đang tải lịch trình…' : form.value.title.trim() || (template.value ? 'Lịch trình mẫu' : 'Lịch trình mới')));
const crumbs = [{ label: 'Lịch trình mẫu', to: listReturnLocation('templates') }];
const publishBlocker = computed(() => {
  if (!form.value.title.trim()) return 'Chưa có tên';
  return counts.value.errors > 0 ? `Còn ${counts.value.errors} lỗi` : '';
});
const saveState = computed(() => {
  if (busy.value) return 'Đang lưu…';
  if (dirty.value) return localKept.value ? 'Có thay đổi chưa lưu (đã giữ trên máy này).' : 'Có thay đổi chưa lưu.';
  return template.value ? 'Đã lưu. Khi công khai, lịch trình dùng giờ mở cửa hiện tại của địa điểm.' : '';
});

const feedbackEl = ref<HTMLElement | null>(null);
watch(errors, async (messages) => {
  if (!messages.length) return;
  await nextTick();
  feedbackEl.value?.scrollIntoView({ block: 'center' });
  feedbackEl.value?.focus({ preventScroll: true });
});
watch(notice, (message) => {
  if (message) toast.show(message);
});

function drop(event: DragEvent, day: number, index: number): void {
  if (busy.value) return;
  try {
    const parsed = TemplateDragPayload.safeParse(JSON.parse(event.dataTransfer?.getData('application/x-rd-itinerary') ?? ''));
    if (!parsed.success) return;
    if (parsed.data.kind === 'stop') editor.move(parsed.data.key, day, index);
    else {
      const placeId = parsed.data.placeId;
      const place = places.value.find((p) => p.id === placeId);
      if (!place || !['active', 'draft'].includes(place.status) || !form.value.days[day] || form.value.days[day]!.stops.length >= 20) return;
      editor.add(day, place.id);
      const added = form.value.days[day]?.stops.at(-1);
      if (added) editor.move(added.key, day, index);
    }
  } catch {
    /* Dữ liệu kéo từ nơi khác thì bỏ qua. */
  }
}

async function removeDay(day: number): Promise<void> {
  if (form.value.days[day]?.stops.length) {
    const ok = await confirm({ title: `Bỏ ngày ${day + 1}?`, body: 'Các điểm dừng trong ngày này cũng bị bỏ.', confirmLabel: 'Bỏ ngày', cancelLabel: 'Giữ lại', tone: 'danger' });
    if (!ok) return;
  }
  editor.removeDay(day);
}

async function saveAs(target: ItineraryStatus): Promise<void> {
  const kind = publishConfirm(template.value?.status ?? null, target);
  if (kind === 'first-publish') {
    const ok = await confirm({
      title: 'Công khai lịch trình?',
      body: `Trang /${CITY_SLUG}/lich-trinh/${slug.value || 'ten-lich-trinh'} sẽ hiện trên web và trong sitemap; slug giữ cố định từ giờ.`,
      confirmLabel: 'Công khai',
      cancelLabel: 'Chưa công khai',
    });
    if (!ok) return;
  }
  if (kind === 'unpublish') {
    const ok = await confirm({ title: 'Chuyển về nháp?', body: 'Lịch trình sẽ thôi hiện trên web.', confirmLabel: 'Chuyển về nháp', cancelLabel: 'Giữ công khai', tone: 'danger' });
    if (!ok) return;
  }
  await editor.save(target);
}

async function onDiscard(): Promise<void> {
  const ok = await confirm({
    title: 'Bỏ các thay đổi chưa lưu?',
    body: template.value ? 'Lịch trình trở về bản đã lưu gần nhất.' : 'Lịch trình trở về trống như lúc mới mở.',
    confirmLabel: 'Bỏ thay đổi',
    cancelLabel: 'Giữ lại',
    tone: 'danger',
  });
  if (!ok) return;
  editor.discardChanges();
  expandedKey.value = null;
}

/** Nút "✕ lỗi · ⚠ nhắc": mở đúng điểm (hoặc ngày) có vấn đề đầu tiên, cuộn tới và đưa focus vào đó. */
async function jumpToIssue(): Promise<void> {
  const target = firstIssueTarget(analysis.value, form.value.days);
  if (!target) return;
  panel.value = 'timeline';
  if (target.stopKey) expandedKey.value = target.stopKey;
  await nextTick();
  const el = target.stopKey
    ? document.querySelector<HTMLElement>(`[data-stop-toggle="${target.stopKey}"]`)
    : document.querySelector<HTMLElement>(`[data-day-title="${target.day}"]`);
  el?.scrollIntoView({ block: 'center' });
  el?.focus({ preventScroll: true });
}
</script>

<template>
  <div class="rd-admin-editor rd-template-editor">
    <RdPageHeader :title="title" :crumbs="crumbs">
      <template v-if="!loading && !loadError" #status>
        <span :class="['rd-status', isPublished ? 'rd-status--ok' : 'rd-status--draft']">{{ isPublished ? 'Đang công khai' : 'Nháp' }}</span>
      </template>
      <template v-if="!loading && !loadError" #meta>
        <span>{{ templateMeta(form) }}</span>
        <button v-if="counts.errors || counts.warnings" type="button" class="rd-btn rd-btn--ghost" @click="jumpToIssue">✕ {{ counts.errors }} lỗi · ⚠ {{ counts.warnings }} nhắc</button>
        <span v-else class="rd-status rd-status--ok">Không có lỗi hay nhắc nhở</span>
      </template>
    </RdPageHeader>

    <RdSkeleton v-if="loading" :rows="3" variant="card" />
    <RdEmptyState v-else-if="loadError" kind="error" :title="loadError">
      <button type="button" class="rd-btn rd-btn--outline" @click="editor.load">Thử lại</button>
      <RouterLink v-if="loginRequired" class="rd-btn rd-btn--outline" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại</RouterLink>
    </RdEmptyState>
    <form v-else class="rd-template-editor__form" @submit.prevent>
      <div v-if="restorable" class="rd-callout rd-callout--warn rd-admin-banner" role="status">
        <p class="rd-admin-line">Có nội dung chưa lưu trên máy này{{ restorableSavedAt ? `, giữ lúc ${formatLocalTime(restorableSavedAt)}` : '' }}.</p>
        <div class="rd-admin-banner__actions">
          <button type="button" class="rd-btn rd-btn--primary" @click="editor.restore">Khôi phục</button>
          <button type="button" class="rd-btn rd-btn--outline" @click="editor.discardLocal">Bỏ bản trên máy</button>
        </div>
      </div>
      <div v-if="errors.length" ref="feedbackEl" class="rd-callout rd-callout--bad" tabindex="-1" role="alert">
        <p v-for="message in errors" :key="message" class="rd-admin-line">{{ message }}</p>
        <RouterLink v-if="loginRequired" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại để lưu tiếp</RouterLink>
      </div>

      <RdFormSection id="tpl-info" v-model:open="infoOpen" title="Thông tin lịch trình" collapsible>
        <template #summary>{{ templateMeta(form) }} · ranhduong.vn/{{ CITY_SLUG }}/lich-trinh/{{ slug || 'ten-lich-trinh' }}</template>
        <fieldset class="rd-template-editor__fieldset" :disabled="busy">
          <legend class="rd-sr-only">Thông tin lịch trình</legend>
          <label class="rd-field"><span class="rd-field__label">Tên lịch trình</span><input v-model="form.title" class="rd-input" maxlength="200" required /></label>
          <label class="rd-field"><span class="rd-field__label">Mô tả</span><textarea v-model="form.description" class="rd-input" maxlength="4000" rows="3"></textarea></label>
          <div class="rd-template-editor__metadata">
            <label class="rd-field"><span class="rd-field__label">Ngày đầu là</span><select v-model.number="form.startWeekday" class="rd-input"><option v-for="weekday in WEEK_DAYS" :key="weekday.day" :value="weekday.day">{{ weekday.label }}</option></select><span class="rd-field__hint">Dùng để kiểm tra giờ mở cửa. Các ngày sau nối tiếp.</span></label>
            <label class="rd-field"><span class="rd-field__label">Mùa phù hợp</span><input v-model="form.season" class="rd-input" maxlength="100" placeholder="Ví dụ: mùa mai anh đào" /></label>
            <label class="rd-field"><span class="rd-field__label">Phong cách</span><input v-model="form.style" class="rd-input" maxlength="100" placeholder="Ví dụ: cà phê và thiên nhiên" /></label>
            <label class="rd-field"><span class="rd-field__label">Phương tiện</span><select v-model="form.transport" class="rd-input"><option value="motorbike">Xe máy</option><option value="car">Ô tô</option><option value="taxi">Taxi</option></select></label>
            <label class="rd-field"><span class="rd-field__label">Nhịp độ</span><select v-model="form.pace" class="rd-input"><option value="relaxed">Thong thả</option><option value="packed">Đi nhiều</option></select></label>
            <label class="rd-field"><span class="rd-field__label">Slug</span><input class="rd-input" :value="slug" readonly /><span class="rd-field__hint">Tự tạo khi lưu lần đầu; giữ nguyên khi sửa tên.</span></label>
          </div>
          <details>
            <summary class="rd-template-editor__summary">Tiêu đề và mô tả trên Google</summary>
            <label class="rd-field"><span class="rd-field__label">Tiêu đề Google (để trống dùng tên lịch trình)</span><input v-model="form.seoTitle" class="rd-input" maxlength="200" /></label>
            <label class="rd-field"><span class="rd-field__label">Mô tả Google (để trống dùng mô tả lịch trình)</span><textarea v-model="form.seoDescription" class="rd-input" maxlength="500" rows="2"></textarea></label>
          </details>
        </fieldset>
      </RdFormSection>

      <p class="rd-field__hint rd-admin-line">
        Giờ đi tự tính từ thời gian dừng và di chuyển ước lượng, làm tròn 5 phút. Sửa tay sẽ giữ giờ bạn chọn.
        <button type="button" class="rd-btn rd-btn--ghost" :disabled="busy" @click="editor.refreshPlaces">Kiểm lại dữ liệu địa điểm</button>
      </p>

      <nav class="rd-tabs rd-admin-only-narrow" aria-label="Phần soạn lịch trình">
        <div class="rd-tabs__list rd-template-editor__tabs">
          <button type="button" class="rd-tab" :aria-pressed="panel === 'timeline'" @click="panel = 'timeline'">Lịch trình</button>
          <button type="button" class="rd-tab" :aria-pressed="panel === 'library'" @click="panel = 'library'">Kho địa điểm</button>
          <button type="button" class="rd-tab" :aria-pressed="panel === 'preview'" @click="panel = 'preview'">Xem trước</button>
        </div>
      </nav>

      <div class="rd-template-editor__columns">
        <div class="rd-template-editor__pane" :data-mobile-hidden="panel !== 'timeline'">
          <RdTemplateTimeline
            :days="form.days"
            :places="places"
            :analysis="analysis"
            :busy="busy"
            :expanded-key="expandedKey"
            @expand="expandedKey = $event"
            @start="(day, value) => { form.days[day]!.startTime = value; }"
            @stop="editor.setStop"
            @move="editor.move"
            @remove="editor.remove"
            @replace="editor.replace"
            @drop="drop"
            @remove-day="removeDay"
            @add-day="editor.addDay"
          />
        </div>
        <div class="rd-template-editor__side">
          <div class="rd-tabs rd-admin-only-wide" role="group" aria-label="Cột phụ">
            <div class="rd-tabs__list rd-template-editor__tabs">
              <button type="button" class="rd-tab" :aria-pressed="sidePanel === 'library'" @click="sidePanel = 'library'">Kho địa điểm</button>
              <button type="button" class="rd-tab" :aria-pressed="sidePanel === 'preview'" @click="sidePanel = 'preview'">Xem trước</button>
            </div>
          </div>
          <div class="rd-template-editor__pane" :data-mobile-hidden="panel !== 'library'" :data-desktop-hidden="sidePanel !== 'library'">
            <RdTemplatePicker :places="places" :days="form.days" :busy="busy" @add="editor.add" />
          </div>
          <div class="rd-template-editor__pane" :data-mobile-hidden="panel !== 'preview'" :data-desktop-hidden="sidePanel !== 'preview'">
            <RdTemplatePreview :form="form" :analysis="analysis" :places="places" :url="publicUrl" />
          </div>
        </div>
      </div>

      <RdStickyActions :state="saveState">
        <button v-if="dirty" type="button" class="rd-btn rd-btn--ghost" :disabled="busy" @click="onDiscard">Bỏ thay đổi</button>
        <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="saveAs('draft')">{{ isPublished ? 'Chuyển về nháp' : 'Lưu nháp' }}</button>
        <button
          type="button"
          class="rd-btn rd-btn--primary"
          :disabled="busy || !analysis.canPublish || !form.title.trim()"
          :title="publishBlocker || undefined"
          :aria-describedby="publishBlocker ? 'tpl-publish-blocker' : undefined"
          @click="saveAs('published')"
        >
          {{ busy ? 'Đang lưu…' : isPublished ? 'Lưu và công khai' : 'Công khai lịch trình' }}
        </button>
        <span v-if="publishBlocker" id="tpl-publish-blocker" class="rd-sr-only">Chưa công khai được: {{ publishBlocker }}.</span>
      </RdStickyActions>
    </form>
  </div>
</template>

<style scoped>
.rd-template-editor__form { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.rd-template-editor__fieldset { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; margin: 0; padding: 0; border: 0; }
.rd-template-editor__metadata { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.rd-template-editor__summary { display: flex; align-items: center; min-height: var(--tap-min); font-weight: 600; cursor: pointer; }
.rd-template-editor__tabs { justify-content: flex-start; gap: var(--space-5); }
.rd-template-editor__columns { display: grid; gap: var(--space-4); align-items: start; }
.rd-template-editor__side { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.rd-template-editor__pane { min-width: 0; }
details { display: flex; flex-direction: column; gap: var(--space-3); }
@media (max-width: 479px) { .rd-template-editor__metadata { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 1023.98px) { .rd-template-editor__pane[data-mobile-hidden='true'] { display: none; } }
@media (min-width: 1024px) {
  .rd-template-editor__columns { grid-template-columns: minmax(0, 1fr) 340px; }
  .rd-template-editor__pane[data-desktop-hidden='true'] { display: none; }
  .rd-template-editor__side { position: sticky; top: var(--space-6); max-height: calc(100vh - 2 * var(--space-6) - var(--admin-bar-height, 0px)); overflow-y: auto; }
}
</style>
```

- [ ] **Step 3: Sửa `<style scoped>` của `RdTemplatePicker.vue`** (hàng gọn; cột phải đã tự cuộn nên bỏ `max-height` của danh sách)

Thay toàn bộ khối `<style scoped>` bằng:

```css
<style scoped>
.rd-template-picker { min-width: 0; align-self: start; }
.rd-template-picker__filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
.rd-template-picker__places { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
.rd-template-picker__place { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px var(--space-3); padding: var(--space-2) var(--space-3); border: var(--border); border-radius: var(--radius-chip); background: var(--paper); overflow-wrap: anywhere; }
.rd-template-picker__place > :not(.rd-btn) { grid-column: 1; }
.rd-template-picker__place > .rd-btn { grid-column: 2; grid-row: 1 / span 3; }
.rd-template-picker__place[draggable='true'] { cursor: grab; }
</style>
```

- [ ] **Step 4: Typecheck, lint, test, build**

Run: `pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/widgets/template-editor/ui
git commit -m "feat: S28 rebuild itinerary editor with compact stops and sticky actions"
```

---

### Task 12: Tài liệu

**Files:**
- Modify: `docs/ui-spec.md`, `docs/decisions.md`, `docs/backlog.md`, `CLAUDE.md`
- Create: `docs/runbooks/admin-ux.md`

- [ ] **Step 1: Sửa `docs/ui-spec.md` mục 12**

Thay đoạn cuối dòng "Danh sách địa điểm": `và hộp thoại Thao tác khác (Xác minh, Ẩn khỏi web, Đã đóng cửa, Xoá nháp) | S07 |` bằng:

```
và hộp thoại Thao tác khác (Xác minh, Ẩn khỏi web, Đã đóng cửa, Xoá nháp); cột Còn thiếu (điều kiện kích hoạt) và Cập nhật, ô Xếp, Xoá bộ lọc; dưới 768px mỗi dòng là một thẻ; quay lại từ form giữ bộ lọc và vị trí cuộn | S07, S28 |
```

Thay đoạn cuối dòng "Form địa điểm": `xác nhận (quán, Facebook, điểm công cộng); thanh dưới Lưu nháp và Kích hoạt; tự lưu nháp | S05, S06 |` bằng:

```
xác nhận (quán, Facebook, điểm công cộng); thanh dưới dính: Bỏ thay đổi, Lưu nháp, Kích hoạt; tự lưu nháp; từ 1024px hai cột, cột phụ gồm điều kiện kích hoạt (link tới mục), Xác minh (nguồn, ngày xác minh, Đánh dấu đã xác minh), Trên web (Ẩn, Đã đóng cửa, Hiện lại, Mở lại, Xoá nháp; khoá khi còn thay đổi chưa lưu) | S05, S06, S28 |
```

Thay đoạn cuối dòng "Soạn lịch trình mẫu": `Đầu trang: tên, trạng thái, số ngày, mùa, phong cách, phương tiện, nhịp độ, slug; ba cột: kho địa điểm kéo thả, lịch trình theo ngày, xem trước điện thoại và Google | S15 |` bằng:

```
Đầu trang: tên lịch trình, trạng thái, tóm tắt, số lỗi và nhắc nhở (bấm để tới vấn đề đầu tiên); khung Thông tin lịch trình gập được (mùa, phong cách, phương tiện, nhịp độ, slug, Google); từ 1024px hai cột: lịch trình theo ngày (mỗi điểm một hàng gọn, mở từng điểm để sửa) và cột phải có tab Kho địa điểm kéo thả, Xem trước điện thoại và Google; thanh lưu dính; hỏi lại khi công khai lần đầu và khi chuyển về nháp | S15, S28 |
```

Ngay trước dòng `**Màu trạng thái (chỉ dùng trong quản trị):**`, thêm đoạn:

```
**Khung quản trị (S28):** từ 1280px thanh bên 232px dính, chia nhóm Nội dung (Địa điểm, Lịch trình mẫu, Danh sách gợi ý) và Vận hành (Báo cáo, Mùa & giao diện); dưới 1280px thanh trên 56px và ngăn trượt. Mọi nút trong admin cao 44px (khác nút 52px của web khách ở mục 4). Hỏi lại bằng hộp thoại của admin, không dùng `window.confirm`; thông báo thành công hiện ở đáy màn hình. Component dùng chung ở `apps/admin/src/shared/ui`, class `rd-admin-…` trong `packages/ui/src/admin.css`.

```

- [ ] **Step 2: Thêm dòng vào `docs/decisions.md`** (ngay dưới dòng `| --- | --- | --- |`)

```
| 2026-10-14 | S28 đặt component admin dùng chung ở `apps/admin/src/shared/ui` (logic ở `shared/lib`), luật ESLint chặn import tầng trên và `@/shared/api`; chuyển sang `packages/ui` khi bắt đầu `apps/owner`. Khung trang: thanh bên từ 1280px, dưới đó ngăn trượt `<dialog>`. Không thêm thư viện UI hay kéo thả. Thêm `VITE_WEB_BASE` cho link "Xem trên web"; `ListSort` thêm `-updated` | Chủ dự án duyệt spec `docs/superpowers/specs/2026-10-14-admin-ux-foundation-design.md`: muốn mở rộng, tái sử dụng cho app chủ quán mà không phải dựng build Vue cho `packages/ui` trước khi có app thứ hai; mốc 1280px để 1024px còn đủ chỗ cho form lịch trình hai cột |
```

- [ ] **Step 3: Sửa `docs/backlog.md`**

Thay `27 story, tổng khoảng 141 giờ;` bằng `28 story, tổng khoảng 169 giờ;`.

Thêm dòng ngay dưới dòng `| S27 | …`:

```
| S28 | Nhập liệu | Nền UX admin dùng chung (giai đoạn 1) | Khung trang (thanh bên từ 1280px, ngăn trượt dưới 1280px) và component dùng chung trong `apps/admin/src/shared/ui`; danh sách địa điểm có cột Còn thiếu, ô Xếp, Xoá bộ lọc, thẻ trên điện thoại, nhớ bộ lọc và vị trí cuộn; form địa điểm hai cột, cột phụ xác minh và đổi trạng thái, Bỏ thay đổi, chặn rời trang khi không giữ được bản trên máy; lịch trình hai cột, điểm dừng dạng hàng gọn, thanh lưu dính, hỏi lại khi công khai lần đầu và khi chuyển về nháp (spec `docs/superpowers/specs/2026-10-14-admin-ux-foundation-design.md`) | 28 | P1 | Đang làm trên `feat/S28-admin-ux` |
```

- [ ] **Step 4: Viết `docs/runbooks/admin-ux.md`**

```markdown
# S28 — Nền UX admin dùng chung (giai đoạn 1)

Spec: `docs/superpowers/specs/2026-10-14-admin-ux-foundation-design.md`. Plan: `docs/superpowers/plans/2026-10-14-s28-admin-ux-phase1.md`.

## Dùng

- **Menu:** từ 1280px thanh bên bên trái; hẹp hơn thì bấm nút ☰ ở thanh trên. "Địa điểm" và "Lịch trình mẫu" mở lại bộ lọc lần trước trong tab đó.
- **Danh sách địa điểm:** tab trạng thái là link (mở tab mới được). Cột **Còn thiếu** cho biết còn thiếu Vị trí, Giờ mở cửa, Nguồn xác nhận hay Nguồn ảnh. Ô **Xếp** có thêm "Lâu chưa sửa". **Xoá bộ lọc** giữ tab và cách xếp. Từ form quay lại (breadcrumb, menu, Back) thì về đúng bộ lọc và chỗ đang cuộn.
- **Form địa điểm:** từ 1024px có cột phụ: danh sách điều kiện (bấm để tới mục), **Xác minh** (nguồn xác nhận, ngày xác minh, Đánh dấu đã xác minh), **Trên web** (Ẩn, Đã đóng cửa, Hiện lại, Mở lại, Xoá nháp). Các nút này khoá khi còn thay đổi chưa lưu. **Bỏ thay đổi** hỏi lại rồi trả form về bản đã lưu.
- **Form lịch trình:** bấm "✕ lỗi · ⚠ nhắc" ở đầu trang để tới vấn đề đầu tiên. Mỗi điểm là một hàng gọn, bấm để mở. Công khai lần đầu và Chuyển về nháp có hỏi lại.
- **Rời trang:** chỉ hỏi khi có thay đổi chưa lưu mà trình duyệt không giữ được bản trên máy (chế độ riêng tư, hết chỗ).

## Cấu hình

`VITE_WEB_BASE` (mặc định `http://localhost:3100`) cho link "Xem trên web". Staging, production đặt URL web tương ứng trên Cloudflare Pages.

## Kiểm tra

- `pnpm turbo run lint typecheck test build`.
- Trình duyệt ở 320, 390, 768, 1024, 1280, 1440px: không cuộn ngang; ngăn trượt mở/đóng bằng Esc và nền mờ; viền focus thấy được trong thanh bên; tiêu đề bảng dính; thanh lưu không che ô đang nhập; giảm chuyển động thì không có hiệu ứng.

## Chưa làm (giai đoạn 2)

Bản đồ tuyến, tay cầm kéo và vạch thả, "Đã có ở Ngày N", gợi ý "HH:mm, nhận 24:00", hoàn tác dời ghim, thu gọn form upload ảnh, hàng giờ gọn trên desktop; chuyển Danh sách gợi ý, Báo cáo, Mùa, danh sách Lịch trình sang component. Xoá, sắp xếp, chọn ảnh bìa cần API mới (story riêng).
```

- [ ] **Step 5: Thêm dòng trạng thái vào `CLAUDE.md`** (dòng đầu tiên dưới `## Trạng thái`)

```
- S28 giai đoạn 1 code xong trên `feat/S28-admin-ux`: khung trang admin (thanh bên từ 1280px, ngăn trượt), component dùng chung `apps/admin/src/shared/ui` với luật lint chặn import tầng trên; danh sách địa điểm cột Còn thiếu/Cập nhật, ô Xếp, Xoá bộ lọc, thẻ điện thoại, nhớ bộ lọc và vị trí cuộn; form địa điểm hai cột, cột phụ xác minh/đổi trạng thái, Bỏ thay đổi, chặn rời trang; lịch trình hai cột, hàng điểm gọn, thanh lưu dính, hỏi lại khi công khai/chuyển nháp. Runbook `docs/runbooks/admin-ux.md`; chờ kiểm trình duyệt có phiên admin, CI remote, staging và điện thoại thật.
```

- [ ] **Step 6: Commit**

```bash
git add docs/ui-spec.md docs/decisions.md docs/backlog.md docs/runbooks/admin-ux.md CLAUDE.md
git commit -m "docs: S28 record admin UX foundation"
```

---

### Task 13: Kiểm toàn bộ

**Files:** không sửa file nào, trừ khi phát hiện lỗi (sửa trong task tương ứng rồi commit `fix: S28 …`).

- [ ] **Step 1: Chạy kiểm toàn repo**

Run: `pnpm turbo run lint typecheck test build`
Expected: PASS mọi package. Nếu `apps/web` hỏng vì `packages/ui/src/admin.css`, kiểm `apps/web` không import file này (`grep -rn "admin.css" apps/web`) — web chỉ dùng `tokens.css`, `components.css`.

- [ ] **Step 2: Điều kiện kiểm trình duyệt**

Admin cần phiên đăng nhập. Hỏi chủ dự án một trong hai: kết nối Claude in Chrome với phiên admin đang đăng nhập, hoặc cho phép tạo phiên thử cục bộ. Chưa có thì ghi rõ trong báo cáo các mục dưới là **chưa kiểm**, không ghi là đã kiểm.

- [ ] **Step 3: Kiểm trên trình duyệt (khi có phiên)**

Chạy `pnpm infra:up` và `pnpm dev`; dùng dữ liệu "Giả Lập". Ở 320, 390, 768, 1024, 1280, 1440px:

1. Không cuộn ngang trang (`document.documentElement.scrollWidth <= innerWidth`).
2. Dưới 1280px: ☰ mở ngăn trượt, focus vào nút đóng; Esc, bấm nền mờ, chuyển trang đều đóng; focus trở về nút ☰. Từ 1280px: thanh bên dính, Tab qua các mục thấy viền focus sáng.
3. Danh sách: lọc, xếp bằng ô Xếp và bằng tiêu đề cột (hai cách khớp nhau), Xoá bộ lọc, tab là link; cuộn xuống, mở một địa điểm, quay lại bằng breadcrumb, menu và Back: đúng bộ lọc và vị trí. Tiêu đề bảng dính; Shift+Tab ngược lên không để link nằm dưới tiêu đề. Dưới 768px là thẻ.
4. Form địa điểm: hai cột từ 1024px; link trong danh sách điều kiện tới đúng mục; sửa một ô rồi Bỏ thay đổi (hỏi lại, về bản đã lưu); Tab tới ô cuối trước thanh lưu thì ô không bị che; tạo mới ở `/dia-diem/moi`, Lưu nháp: URL thành `/dia-diem/{id}`, không hỏi rời trang, không nhảy lên đầu, focus giữ nguyên; thao tác Ẩn/Hiện lại trong cột phụ, nút khoá khi còn thay đổi; Xoá nháp về danh sách và có thông báo.
5. Chặn localStorage (DevTools → Application → Storage, hoặc chế độ riêng tư Safari): sửa form rồi bấm menu khác thì có hộp "Rời trang khi chưa lưu?"; đóng tab thì có hộp của trình duyệt.
6. Form lịch trình: hai cột ở 1024px, kéo thật một địa điểm từ kho vào ngày; mở một điểm, Lên/Xuống bằng bàn phím (focus ở lại, trình đọc màn hình đọc vị trí mới); nút "✕ lỗi · ⚠ nhắc" tới đúng điểm; Bỏ ngày có hỏi lại; Công khai lần đầu và Chuyển về nháp có hỏi lại; Enter trong ô không lưu.
7. Bật "Reduce motion" (DevTools → Rendering): ngăn trượt, hộp thoại, thông báo hiện ngay, không trượt.

- [ ] **Step 4: Báo cáo**

Ghi vào báo cáo cuối: file đã đổi, lệnh đã chạy và kết quả, mục trình duyệt nào đã kiểm hoặc chưa kiểm (kèm lý do), rủi ro còn lại (ví dụ `@starting-style` không có hiệu ứng ở trình duyệt cũ: hộp thoại vẫn mở được, chỉ không có chuyển động).

