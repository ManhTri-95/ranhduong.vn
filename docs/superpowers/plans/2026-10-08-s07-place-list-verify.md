# S07 Danh sách và xác minh trong admin: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `admin.ranhduong.vn/dia-diem` liệt kê mọi địa điểm của Đà Lạt với tab trạng thái có số đếm, tìm và lọc; từ danh sách mở form để thêm, sửa, bấm "Đã xác minh" (cập nhật `lastVerifiedAt`, `verifySource`, nháp thành đang hiển thị), ẩn, đánh dấu đóng cửa, mở lại, và xoá hẳn nháp.

**Architecture:** Luật chuyển trạng thái nằm ở `packages/contracts` (`statusAfter`, `canVerify`, `verificationStale`, `AdminPlaceSummary`) để API và admin dùng chung. API thêm `GET /v1/admin/cities/:city/places` (mọi địa điểm chưa gộp, kèm mã điều kiện kích hoạt còn thiếu), `POST /v1/admin/places/:id/verify`, `POST /v1/admin/places/:id/status`, `DELETE /v1/admin/places/:id` (chỉ nháp); mọi chuyển trạng thái là `findOneAndUpdate` theo `status` và `updatedAt` trong `PlaceStatusService`. Admin tải hết một lần rồi lọc, đếm, xếp trong trình duyệt (widget `place-list`, bộ lọc giữ trong query URL); thao tác chạy trong hộp thoại `<dialog>` (feature `place-status`).

**Tech Stack:** Zod 4, NestJS 12, Mongoose 9, Vitest 5 (MongoDB thật), Vue 3 + Vite, vue-router 5, ofetch.

**Spec:** `docs/backlog.md` dòng S07 (tiêu chí nghiệm thu), `docs/ui-spec.md` mục 12 (màn "Danh sách địa điểm", màu trạng thái) và bản mẫu UI (artboard `AdminPlaces`), `docs/technical-design.md` mục 4 (sơ đồ trạng thái Place), mục 6 (route quản trị). Quyết định của chủ dự án 2026-10-08: xoá hẳn chỉ cho nháp; địa điểm đã công khai dùng Ẩn, Đã đóng cửa, Mở lại; gộp làm sau S07. Liên quan: ADR 0010 (không bỏ URL công khai), ADR 0011 (contracts dùng chung), ADR 0013 (nguồn xác nhận).

## Global Constraints

- TypeScript strict; không `any`, `@ts-ignore`, `as unknown as`.
- Kiểu dữ liệu qua API nằm trong `packages/contracts`; API validate bằng đúng schema đó (ADR 0011).
- Không bịa dữ liệu địa điểm: test chỉ dùng dữ liệu giả tên "Giả Lập", toạ độ quanh `[0, 0]`.
- Xoá hẳn chỉ khi `status` là `draft` (điều kiện nằm trong câu lệnh xoá); địa điểm đã công khai không bao giờ bị xoá (ADR 0010).
- Mọi chuyển sang `active` (xác minh, hiện lại, mở lại) kiểm `activationIssues`; mọi chuyển trạng thái là update có điều kiện, không đọc rồi ghi.
- "Cần xác minh lại" = đang hiển thị và quá 90 ngày chưa xác minh (`VERIFY_MAX_AGE_DAYS = 90`); chưa xác minh lần nào cũng tính.
- Ngày giờ lưu UTC, hiển thị theo `Asia/Ho_Chi_Minh`.
- Admin: chỉ token và class `rd-…` của `packages/ui`, không hard-code màu; chip trạng thái có chữ và chấm tròn; vùng bấm từ 44px; `<button>`, `<a href>`, `<label>` đúng chỗ; nút chỉ có biểu tượng có `aria-label`; không cuộn ngang trang ở 390px (bảng cuộn trong khung của nó).
- FSD trong `apps/admin/src`: `pages` → `widgets` → `features` → `entities` → `shared`, chỉ import lớp thấp hơn, không import ngang giữa hai slice cùng lớp.
- Chữ hiển thị tiếng Việt theo ui-spec mục 3.
- Nhánh `feat/S07-place-list` tạo từ `main`. Commit theo Conventional Commits có `S07`. `git add` từng đường dẫn cụ thể; không add `.pnpm-store/`.
- Sửa `packages/contracts` thì build lại (`pnpm --filter @ranhduong/contracts build`) trước khi chạy test API, admin.

## Review Focus

1. **Bấm hai lần hoặc hai tab cùng làm một thao tác** (ẩn, mở lại): lần sau trả trạng thái hiện tại (200), không báo lỗi giả; document vừa đổi ở nơi khác thì đọc lại, không ghi đè. Test ở Task 3 Step 1 (`changeStatus` bấm lại, `transition` khi `updatedAt` khác).
2. **Xoá một nháp vừa được kích hoạt ở máy khác**: không được xoá; API trả 400 hoặc 409, DB giữ nguyên. Test ở Task 3 Step 1 (`deleteDraft` với active, hidden, closed; `repo.deleteDraft` khi không còn là nháp).
3. **Dữ liệu nhập thẳng vào DB** (không có `updatedAt`, `lastVerifiedAt`, ảnh thiếu nguồn, giờ trống): danh sách vẫn tải (không 500), chỗ đang hiển thị chưa xác minh hiện "Cần xác minh lại", xác minh được khi đủ điều kiện, "Hiện lại" bị chặn kèm điều kiện còn thiếu. Test ở Task 2 Step 1 (`toAdminPlaceSummary`), Task 3 Step 1 (verify document không có `updatedAt`, unhide thiếu điều kiện), Task 4 Step 1 (`statusChip`).
4. **Từ khoá tìm có dấu, không dấu, chỉ ký tự đặc biệt** (`ca phe may`, tên khác, `(((`): tìm không dấu theo tên và tên khác; từ khoá chỉ có ký tự đặc biệt coi như không lọc, không làm trống danh sách. Test ở Task 5 Step 1 (`matchesFilters`).
5. **URL cũ hoặc bị sửa tay** (`?status=xoa&sort=gia&zone=Cụm A`, tham số lặp): rơi về mặc định, trang không lỗi; quay lại từ form giữ đúng bộ lọc. Test ở Task 5 Step 1 (`filtersFromQuery`), thử tay ở Task 8 Step 3.

## Tiêu chí nghiệm thu → bước kiểm

| Tiêu chí (backlog S07, ui-spec mục 12, chủ dự án) | Kiểm ở |
| --- | --- |
| Tab trạng thái có số đếm (Tất cả, Nháp, Đang hiển thị, Bị nghi ngờ, Cần xác minh lại; thêm "Ẩn hoặc đã đóng") | Task 1 (`verificationStale`), Task 5 (`inTab`, `tabCounts`), Task 7, Task 8 Step 3 |
| Lọc theo zone, danh mục (tính cả danh mục phụ, S27), nguồn xác nhận; tìm theo tên | Task 5 (`matchesFilters`), Task 7, Task 8 Step 3 |
| Bảng: tên, danh mục, cụm, trạng thái, xác nhận, xác minh lần cuối, số ảnh | Task 2 (`AdminPlaceSummary`), Task 4 (`statusChip`, `verifySourceLabel`, `daysAgoText`), Task 7 |
| Nút "Đã xác minh" cập nhật `lastVerifiedAt` và `verifySource` | Task 1 (`PlaceVerifyInput`), Task 3 (`verify`), Task 6 (hộp thoại), Task 8 Step 3 |
| Chuyển draft sang active | Task 3 (`verify` nháp), Task 6 (`readyToVerify`) |
| Chọn quán đã xác nhận (owner) hay chỉ dựa trên Facebook (admin) | Task 4 (`verifySourceOptions` dùng chung), Task 6 (hộp thoại theo danh mục) |
| Hành động theo trạng thái (Sửa, Hoàn thiện, Xác minh, Xem báo cáo) | Task 6 (`primaryAction`; "Xem báo cáo" thay bằng "Xác minh" tới lát 3, xem Ngoài phạm vi) |
| Thêm, sửa, xoá (chủ dự án 2026-10-08): xoá hẳn nháp; ẩn, hiện lại, đã đóng cửa, mở lại | Task 1 (`statusAfter`), Task 3, Task 6, Task 7, Task 8 Step 3 |
| DoD: logic có điều kiện có unit test | Task 1–6 |
| DoD: CI xanh | Task 8 Step 2 |
| DoD: thử staging và điện thoại thật | Chờ S02 (Task 8 Step 5 báo lại) |

## Ngoài phạm vi

- Gộp hai địa điểm trùng (`POST /admin/places/:id/merge`, 301 từ slug cũ): chủ dự án chọn để sau S07, làm sau S06 và S08. Trong lúc chờ, nháp trùng thì xoá.
- "Xem báo cáo" cho chỗ bị nghi ngờ: báo cáo đóng cửa (`submissions`) có ở lát 3; lát 1 chỗ bị nghi ngờ hiện nút "Xác minh" (còn mở) và "Đã đóng cửa".
- Ảnh nhỏ trong bảng: S06 (admin chưa có đường dẫn ảnh). Nút "Import CSV": S21.
- Phân trang bảng: vài trăm điểm, hiện hết.
- Kiểm nháp có nằm trong lịch trình mẫu trước khi xoá: chưa có lịch trình mẫu soạn trong admin; S15 thêm. Xoá ảnh R2 của nháp bị xoá: S06.
- Trang công khai của chỗ đã ẩn hay đã đóng cửa (ẩn trang, ghi "Đã đóng cửa"), xoá cache SWR khi đổi trạng thái: S11, S17.
- Nút xoá nháp, đổi trạng thái ngay trong form `/dia-diem/:id`.

## Cấu trúc file

```text
packages/contracts/src/
  place.ts                 VERIFY_MAX_AGE_DAYS, verificationStale                                  (sửa)
  place-admin.ts           PlaceStatusAction, statusAfter, statusActionTarget, statusActionsFor,
                           canVerify, PlaceVerifyInput, PlaceStatusInput, AdminPlaceSummary,
                           AdminPlaceListResponse                                                  (sửa)
  place.test.ts, place-admin.test.ts                                                               (sửa)
apps/api/src/modules/places/
  place-errors.ts          MAX_ATTEMPTS, placeNotFound, placeBusy, placeInvalid                     (mới)
  place-edit.ts            SummaryRow, toAdminPlaceSummary                                         (sửa)
  places.repository.ts     listForAdmin, transition, deleteDraft                                   (sửa)
  place-editor.service.ts  list; present công khai; lỗi lấy từ place-errors                        (sửa)
  place-status.service.ts  verify, changeStatus, deleteDraft                                       (mới)
  places.module.ts         PlaceStatusService                                                      (sửa)
  place-edit.test.ts, place-editor.service.test.ts                                                 (sửa)
  place-status.service.test.ts                                                                     (mới)
apps/api/src/modules/admin/
  admin-places.controller.ts   GET list, POST verify, POST status, DELETE                          (sửa)
  admin.http.test.ts                                                                               (sửa)
apps/admin/src/
  shared/lib/time.ts, time.test.ts                 daysAgoText                                     (sửa)
  entities/place/api/places.ts                     fetchPlaces, verifyPlace, changePlaceStatus,
                                                   deletePlace                                     (sửa)
  entities/place/model/verify-options.ts, .test.ts chuyển từ widgets/place-editor/model            (chuyển)
  entities/place/model/status.ts, status.test.ts   PLACE_STATUS_CLASS, statusChip, verifySourceLabel (mới)
  entities/place/model/draft-key.ts                placeDraftKey                                   (mới)
  widgets/place-editor/model/use-place-editor.ts   dùng placeDraftKey                              (sửa)
  widgets/place-editor/ui/RdPlaceEditor.vue        dùng PLACE_STATUS_CLASS, verify-options mới      (sửa)
  widgets/place-list/model/filters.ts, .test.ts    bộ lọc, tab, đếm, xếp, query URL                (mới)
  widgets/place-list/model/use-place-list.ts, .test.ts  tải danh sách                              (mới)
  widgets/place-list/ui/RdPlaceList.vue            tab, bộ lọc, bảng, thông báo                    (mới)
  features/place-status/model/actions.ts, .test.ts nút theo trạng thái, câu báo, lỗi               (mới)
  features/place-status/ui/RdPlaceActionsDialog.vue hộp thoại xác minh, đổi trạng thái, xoá        (mới)
  pages/PlacesPage.vue                                                                             (sửa)
  app/router.ts            không hỏi lại phiên khi chỉ đổi query trên cùng trang                   (sửa)
docs/backlog.md, docs/decisions.md, docs/technical-design.md, docs/ui-spec.md, CLAUDE.md            (sửa)
```

## Bước 0: Chuẩn bị

- [ ] Tạo nhánh, bật hạ tầng, commit plan:

```bash
git switch main
git status --short   # sạch, trừ file plan này
git switch -c feat/S07-place-list
pnpm install
pnpm infra:up
git add docs/superpowers/plans/2026-10-08-s07-place-list-verify.md
git commit -m "docs: S07 add implementation plan"
```

---

### Task 1: Contracts cho đổi trạng thái, xác minh và dòng danh sách

**Files:**
- Modify: `packages/contracts/src/place.ts` (thêm sau hàm `needsOwnerConfirmation`)
- Modify: `packages/contracts/src/place-admin.ts` (thêm vào cuối file)
- Test: `packages/contracts/src/place.test.ts`, `packages/contracts/src/place-admin.test.ts`

**Interfaces:**
- Consumes: `PlaceStatus`, `PlaceCategory`, `VerifySource` (enums.ts); `AdminVerifySource`, `ActivationIssueCode` (place-admin.ts); `ObjectIdString`, `Slug` (common.ts).
- Produces:
  - `VERIFY_MAX_AGE_DAYS = 90`; `verificationStale(lastVerifiedAt: Date | string | undefined, now: Date): boolean`
  - `PlaceStatusAction = z.enum(['hide', 'unhide', 'close', 'reopen'])`
  - `statusAfter(from: PlaceStatus, action: PlaceStatusAction): PlaceStatus | null`
  - `statusActionTarget(action: PlaceStatusAction): PlaceStatus`
  - `statusActionsFor(status: PlaceStatus): PlaceStatusAction[]`
  - `canVerify(status: PlaceStatus): boolean`
  - `PlaceVerifyInput = { verifySource: AdminVerifySource }`, `PlaceStatusInput = { action: PlaceStatusAction }`
  - `AdminPlaceSummary = { id, status, slug, name, aliases, category, alsoCategories, zone?, verifySource?, lastVerifiedAt?, photoCount, activationIssues: ActivationIssueCode[], updatedAt }`
  - `AdminPlaceListResponse = { items: AdminPlaceSummary[] }`

- [ ] **Step 1: Viết test (đỏ)**

`packages/contracts/src/place.test.ts`: thêm `verificationStale` vào import từ `./place.js`, rồi thêm vào cuối file:

```ts
describe('verificationStale', () => {
  const now = new Date('2026-10-08T03:00:00Z');
  const daysBefore = (days: number, extraMs = 0) => new Date(now.getTime() - days * 86_400_000 - extraMs);

  it('chưa xác minh hoặc ngày không đọc được: cần xác minh lại', () => {
    expect(verificationStale(undefined, now)).toBe(true);
    expect(verificationStale('khong-phai-ngay', now)).toBe(true);
  });
  it('đúng 90 ngày chưa cần; quá 90 ngày thì cần; nhận Date hoặc chuỗi ISO', () => {
    expect(verificationStale(daysBefore(90), now)).toBe(false);
    expect(verificationStale(daysBefore(90, 1), now)).toBe(true);
    expect(verificationStale(daysBefore(90, 1).toISOString(), now)).toBe(true);
    expect(verificationStale(daysBefore(1).toISOString(), now)).toBe(false);
  });
});
```

`packages/contracts/src/place-admin.test.ts`: đổi import đầu file thành

```ts
import { describe, expect, it } from 'vitest';
import { PlaceStatus } from './enums.js';
import { parseOpeningHours } from './opening-hours.js';
import {
  activationIssues,
  AdminPlace,
  AdminPlaceSummary,
  canVerify,
  DuplicateCheckInput,
  PlaceEditInput,
  PlaceStatusInput,
  PlaceVerifyInput,
  statusActionsFor,
  statusActionTarget,
  statusAfter,
  ZoneSuggestQuery,
} from './place-admin.js';
```

rồi thêm vào cuối file:

```ts
describe('đổi trạng thái địa điểm', () => {
  it('statusAfter: ẩn, hiện lại, đã đóng cửa (từ đang hiển thị, bị nghi ngờ, đã ẩn), mở lại', () => {
    expect(statusAfter('active', 'hide')).toBe('hidden');
    expect(statusAfter('hidden', 'unhide')).toBe('active');
    expect(statusAfter('active', 'close')).toBe('closed');
    expect(statusAfter('suspected', 'close')).toBe('closed');
    expect(statusAfter('hidden', 'close')).toBe('closed');
    expect(statusAfter('closed', 'reopen')).toBe('active');
  });
  it('statusAfter: không làm được với nháp (xoá thay vì ẩn), chỗ đã gộp, thao tác không hợp trạng thái', () => {
    expect(statusAfter('draft', 'hide')).toBeNull();
    expect(statusAfter('draft', 'close')).toBeNull();
    expect(statusAfter('merged', 'reopen')).toBeNull();
    expect(statusAfter('active', 'reopen')).toBeNull();
    expect(statusAfter('closed', 'hide')).toBeNull();
    expect(statusAfter('closed', 'unhide')).toBeNull();
  });
  it('statusActionsFor: các thao tác làm được, theo thứ tự hiện trong admin', () => {
    expect(statusActionsFor('active')).toEqual(['hide', 'close']);
    expect(statusActionsFor('hidden')).toEqual(['unhide', 'close']);
    expect(statusActionsFor('suspected')).toEqual(['close']);
    expect(statusActionsFor('closed')).toEqual(['reopen']);
    expect(statusActionsFor('draft')).toEqual([]);
    expect(statusActionsFor('merged')).toEqual([]);
  });
  it('statusActionTarget: trạng thái đích của thao tác', () => {
    expect(statusActionTarget('hide')).toBe('hidden');
    expect(statusActionTarget('close')).toBe('closed');
    expect(statusActionTarget('unhide')).toBe('active');
    expect(statusActionTarget('reopen')).toBe('active');
  });
  it('canVerify: xác minh được nháp, chỗ đang hiển thị, chỗ bị nghi ngờ', () => {
    expect(PlaceStatus.options.filter(canVerify)).toEqual(['draft', 'active', 'suspected']);
  });
  it('thân request: nguồn xác nhận chỉ owner hoặc admin; thao tác phải có trong danh sách', () => {
    expect(PlaceVerifyInput.safeParse({ verifySource: 'owner' }).success).toBe(true);
    expect(PlaceVerifyInput.safeParse({ verifySource: 'ctv' }).success).toBe(false);
    expect(PlaceVerifyInput.safeParse({}).success).toBe(false);
    expect(PlaceStatusInput.safeParse({ action: 'hide' }).success).toBe(true);
    expect(PlaceStatusInput.safeParse({ action: 'merge' }).success).toBe(false);
  });
});

describe('AdminPlaceSummary', () => {
  const base = {
    id: '0123456789abcdef01234567',
    status: 'draft',
    slug: 'quan-gia-lap',
    name: 'Quán Giả Lập',
    aliases: [],
    category: 'cafe',
    alsoCategories: ['food'],
    photoCount: 0,
    activationIssues: ['location_missing', 'verify_source_missing'],
    updatedAt: '2026-10-08T03:00:00.000Z',
  };
  it('đọc một dòng danh sách; cụm, nguồn, ngày xác minh tuỳ chọn', () => {
    const row = AdminPlaceSummary.parse(base);
    expect(row.zone).toBeUndefined();
    expect(row.lastVerifiedAt).toBeUndefined();
    expect(row.activationIssues).toEqual(['location_missing', 'verify_source_missing']);
    expect(AdminPlaceSummary.parse({ ...base, zone: 'cum-gia-lap-a', verifySource: 'owner', lastVerifiedAt: '2026-10-01T03:00:00.000Z' })).toMatchObject({
      zone: 'cum-gia-lap-a',
      verifySource: 'owner',
    });
  });
  it('số ảnh âm, mã điều kiện lạ: lỗi', () => {
    expect(AdminPlaceSummary.safeParse({ ...base, photoCount: -1 }).success).toBe(false);
    expect(AdminPlaceSummary.safeParse({ ...base, activationIssues: ['khong-co'] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts test`
Expected: FAIL (`verificationStale`, `statusAfter`, `AdminPlaceSummary`… chưa export).

- [ ] **Step 3: Viết code**

`packages/contracts/src/place.ts`, thêm ngay sau hàm `needsOwnerConfirmation`:

```ts
/** Quá số ngày này kể từ lần xác minh cuối thì cần xác minh lại (backlog S07, S11; technical-design mục 7). */
export const VERIFY_MAX_AGE_DAYS = 90;
const DAY_MS = 86_400_000;

/**
 * Cần xác minh lại: chưa xác minh, ngày không đọc được, hoặc đã quá VERIFY_MAX_AGE_DAYS ngày tính tới `now`.
 * Nhận Date (API) hoặc chuỗi ISO (admin, web).
 */
export function verificationStale(lastVerifiedAt: Date | string | undefined, now: Date): boolean {
  if (lastVerifiedAt === undefined) return true;
  const time = new Date(lastVerifiedAt).getTime();
  return Number.isNaN(time) || now.getTime() - time > VERIFY_MAX_AGE_DAYS * DAY_MS;
}
```

`packages/contracts/src/place-admin.ts`, thêm vào cuối file:

```ts
/** Đổi trạng thái trong danh sách admin (S07, technical-design mục 4); gộp làm sau. */
export const PlaceStatusAction = z.enum(['hide', 'unhide', 'close', 'reopen']);
export type PlaceStatusAction = z.infer<typeof PlaceStatusAction>;

/**
 * hide: đang hiển thị → đã ẩn; unhide: đã ẩn → đang hiển thị; close: đang hiển thị, bị nghi ngờ hoặc đã ẩn → đã đóng cửa
 * (lát 1 chưa có báo cáo nên admin tự đánh dấu); reopen: đã đóng cửa → đang hiển thị. Nháp thì xoá, không ẩn hay đóng.
 */
const STATUS_TRANSITIONS: Record<PlaceStatusAction, { from: readonly PlaceStatus[]; to: PlaceStatus }> = {
  hide: { from: ['active'], to: 'hidden' },
  unhide: { from: ['hidden'], to: 'active' },
  close: { from: ['active', 'suspected', 'hidden'], to: 'closed' },
  reopen: { from: ['closed'], to: 'active' },
};

/** Trạng thái đích của `action`. */
export function statusActionTarget(action: PlaceStatusAction): PlaceStatus {
  return STATUS_TRANSITIONS[action].to;
}

/** Trạng thái sau khi làm `action` từ `from`; null khi không làm được. */
export function statusAfter(from: PlaceStatus, action: PlaceStatusAction): PlaceStatus | null {
  const transition = STATUS_TRANSITIONS[action];
  return transition.from.includes(from) ? transition.to : null;
}

/** Các thao tác đổi trạng thái làm được từ `status`, theo thứ tự hiện trong admin. */
export function statusActionsFor(status: PlaceStatus): PlaceStatusAction[] {
  return PlaceStatusAction.options.filter((action) => statusAfter(status, action) !== null);
}

/** Xác minh (đặt nguồn xác nhận, ngày xác minh rồi cho hiển thị) làm được với nháp, chỗ đang hiển thị, chỗ bị nghi ngờ. */
export function canVerify(status: PlaceStatus): boolean {
  return status === 'draft' || status === 'active' || status === 'suspected';
}

/** Thân POST /v1/admin/places/:id/verify. */
export const PlaceVerifyInput = z.object({ verifySource: AdminVerifySource });
export type PlaceVerifyInput = z.infer<typeof PlaceVerifyInput>;

/** Thân POST /v1/admin/places/:id/status. */
export const PlaceStatusInput = z.object({ action: PlaceStatusAction });
export type PlaceStatusInput = z.infer<typeof PlaceStatusInput>;

/** Một dòng của danh sách địa điểm trong admin (S07). Ngày giờ là chuỗi ISO. */
export const AdminPlaceSummary = z.object({
  id: ObjectIdString,
  status: PlaceStatus,
  slug: Slug,
  name: z.string(),
  aliases: z.array(z.string()),
  category: PlaceCategory,
  alsoCategories: z.array(PlaceCategory),
  /** Slug cụm; không có khi chưa chọn cụm. */
  zone: Slug.optional(),
  verifySource: VerifySource.optional(),
  lastVerifiedAt: z.iso.datetime().optional(),
  photoCount: z.number().int().min(0),
  /** Điều kiện kích hoạt còn thiếu, mỗi mã một lần; rỗng là đủ. */
  activationIssues: z.array(ActivationIssueCode),
  updatedAt: z.iso.datetime(),
});
export type AdminPlaceSummary = z.infer<typeof AdminPlaceSummary>;

/** GET /v1/admin/cities/:city/places: mọi địa điểm chưa gộp của thành phố; admin lọc, đếm, xếp trong trình duyệt. */
export const AdminPlaceListResponse = z.object({ items: z.array(AdminPlaceSummary) });
export type AdminPlaceListResponse = z.infer<typeof AdminPlaceListResponse>;
```

- [ ] **Step 4: Chạy test, typecheck, lint, build**

Run: `pnpm --filter @ranhduong/contracts test && pnpm --filter @ranhduong/contracts typecheck && pnpm --filter @ranhduong/contracts lint && pnpm --filter @ranhduong/contracts build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/place.ts packages/contracts/src/place-admin.ts packages/contracts/src/place.test.ts packages/contracts/src/place-admin.test.ts
git commit -m "feat: S07 add place status actions and list rows to contracts"
```

---

### Task 2: API danh sách địa điểm cho admin

**Files:**
- Modify: `apps/api/src/modules/places/place-edit.ts`
- Modify: `apps/api/src/modules/places/places.repository.ts`
- Modify: `apps/api/src/modules/places/place-editor.service.ts`
- Modify: `apps/api/src/modules/admin/admin-places.controller.ts`
- Test: `apps/api/src/modules/places/place-edit.test.ts`, `apps/api/src/modules/places/place-editor.service.test.ts`, `apps/api/src/modules/admin/admin.http.test.ts`

**Interfaces:**
- Consumes: `AdminPlaceSummary`, `AdminPlaceListResponse`, `activationIssues` (Task 1); `CitiesService.resolveCity(slug): Promise<{ id: string }>`, `CitiesService.zones(cityId): Promise<{ id: string; slug: string; name: string }[]>`.
- Produces:
  - `type SummaryRow` và `toAdminPlaceSummary(row: SummaryRow, zoneSlugById: ReadonlyMap<string, string>): AdminPlaceSummary` (place-edit.ts)
  - `PlacesRepository.listForAdmin(cityId: string): Promise<SummaryRow[]>`
  - `PlaceEditorService.list(citySlug: string): Promise<AdminPlaceListResponse>`
  - `GET /v1/admin/cities/:city/places` → 200 `AdminPlaceListResponse`

- [ ] **Step 1: Viết test (đỏ)**

`apps/api/src/modules/places/place-edit.test.ts`: đổi import thành

```ts
import { PlaceEditInput } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { FAKE_PHOTO } from '../../testing/fixtures';
import { editUpdate, toAdminPlace, toAdminPlaceSummary, type EditRow } from './place-edit';
```

rồi thêm vào cuối file:

```ts
describe('toAdminPlaceSummary', () => {
  const base: EditRow = {
    _id: new Types.ObjectId(),
    cityId: new Types.ObjectId(),
    status: 'draft',
    slug: 'quan-gia-lap',
    name: 'Quán Giả Lập',
    category: 'cafe',
  };

  it('nháp chèn thẳng: thiếu mảng, thiếu updatedAt vẫn đọc được; mã điều kiện còn thiếu, mỗi mã một lần', () => {
    const summary = toAdminPlaceSummary(
      {
        ...base,
        openingHours: [
          { day: 1, open: '22:00', close: '22:00' },
          { day: 2, open: '23:00', close: '23:00' },
        ],
      },
      new Map(),
    );
    expect(summary).toEqual({
      id: base._id.toString(),
      status: 'draft',
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập',
      aliases: [],
      category: 'cafe',
      alsoCategories: [],
      photoCount: 0,
      activationIssues: ['location_missing', 'hours_invalid', 'verify_source_missing'],
      updatedAt: base._id.getTimestamp().toISOString(),
    });
  });
  it('đủ dữ liệu: slug cụm, ngày xác minh ISO, số ảnh; ảnh thiếu nguồn là điều kiện còn thiếu', () => {
    const zoneId = new Types.ObjectId();
    const summary = toAdminPlaceSummary(
      {
        ...base,
        status: 'active',
        zoneId,
        aliases: ['Mây Giả Lập'],
        alsoCategories: ['food'],
        verifySource: 'owner',
        location: { type: 'Point', coordinates: [0.2, 0.2] },
        openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
        photos: [{ key: 'places/gia-lap/1', ...FAKE_PHOTO }, { key: 'places/gia-lap/2', source: 'self' }],
        lastVerifiedAt: new Date('2026-10-01T03:00:00Z'),
        updatedAt: new Date('2026-10-02T03:00:00Z'),
      },
      new Map([[zoneId.toString(), 'cum-gia-lap-a']]),
    );
    expect(summary).toMatchObject({
      status: 'active',
      zone: 'cum-gia-lap-a',
      aliases: ['Mây Giả Lập'],
      alsoCategories: ['food'],
      verifySource: 'owner',
      lastVerifiedAt: '2026-10-01T03:00:00.000Z',
      updatedAt: '2026-10-02T03:00:00.000Z',
      photoCount: 2,
      activationIssues: ['photo_source_missing'],
    });
  });
});
```

`apps/api/src/modules/places/place-editor.service.test.ts`: thêm khối sau `describe('get', …)` (trong `describe('PlaceEditorService')`):

```ts
  describe('list', () => {
    it('mọi địa điểm chưa gộp của thành phố, kèm slug cụm; bỏ chỗ đã gộp và thành phố khác', async () => {
      const zone = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-a' });
      const otherCityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-ba' }))).cityId;
      await places().insertMany([
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-a', name: 'Quán Giả Lập A', zoneId: zone?._id }),
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-b', name: 'Quán Giả Lập B', status: 'hidden' }),
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-c', name: 'Quán Giả Lập C', status: 'merged' }),
        fakePlaceDoc(otherCityId, { slug: 'quan-gia-lap-d', name: 'Quán Giả Lập D' }),
      ]);
      const { items } = await editor.list(CITY);
      const rows = [...items].sort((a, b) => a.name.localeCompare(b.name)).map((p) => [p.name, p.status, p.zone]);
      expect(rows).toEqual([
        ['Quán Giả Lập A', 'active', 'cum-gia-lap-a'],
        ['Quán Giả Lập B', 'hidden', undefined],
      ]);
    });
    it('thành phố không có: 404', async () => {
      await expect(editor.list('thanh-pho-khong-co')).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
  });
```

`apps/api/src/modules/admin/admin.http.test.ts`:
- Import: `import { AdminPlace, AdminPlaceListResponse } from '@ranhduong/contracts';`
- Trong test "chưa đăng nhập: 401…", thêm vào mảng `routes`: `['GET', \`/admin/cities/${CITY}/places\`],`
- Thêm test mới:

```ts
  it('danh sách địa điểm của thành phố, kèm điều kiện kích hoạt còn thiếu', async () => {
    await createDraft();
    const res = await call(`/admin/cities/${CITY}/places`);
    expect(res.status).toBe(200);
    const { items } = AdminPlaceListResponse.parse(await res.json());
    expect(items).toMatchObject([
      { name: 'Quán Giả Lập', status: 'draft', activationIssues: ['location_missing', 'hours_invalid', 'verify_source_missing'] },
    ]);
    expect((await call('/admin/cities/thanh-pho-khong-co/places')).status).toBe(404);
  });
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/api test`
Expected: FAIL (`toAdminPlaceSummary`, `editor.list` chưa có; route trả 404).

- [ ] **Step 3: Viết code**

`apps/api/src/modules/places/place-edit.ts`:
- Import đầu file đổi thành:

```ts
import {
  activationIssues,
  AdminPlace,
  AdminPlaceSummary,
  type PlaceCategory,
  type PlaceCover,
  type PlaceEditInput,
  type PlaceStatus,
  type VerifySource,
} from '@ranhduong/contracts';
```

- Thêm vào cuối file:

```ts
/** Các trường đọc cho một dòng danh sách admin (S07); ảnh đọc đủ để kiểm nguồn. */
export type SummaryRow = Pick<
  EditRow,
  | '_id'
  | 'status'
  | 'slug'
  | 'name'
  | 'aliases'
  | 'category'
  | 'alsoCategories'
  | 'zoneId'
  | 'location'
  | 'openingHours'
  | 'verifySource'
  | 'lastVerifiedAt'
  | 'photos'
  | 'updatedAt'
>;

/** Document → một dòng danh sách admin: id cụm thành slug, số ảnh, mã điều kiện kích hoạt còn thiếu (mỗi mã một lần). */
export function toAdminPlaceSummary(row: SummaryRow, zoneSlugById: ReadonlyMap<string, string>): AdminPlaceSummary {
  const issues = activationIssues({
    location: row.location,
    openingHours: row.openingHours ?? [],
    verifySource: row.verifySource,
    photos: row.photos ?? [],
  });
  return AdminPlaceSummary.parse({
    id: row._id.toString(),
    status: row.status,
    slug: row.slug,
    name: row.name,
    aliases: row.aliases ?? [],
    category: row.category,
    alsoCategories: row.alsoCategories ?? [],
    zone: row.zoneId ? zoneSlugById.get(row.zoneId.toString()) : undefined,
    verifySource: opt(row.verifySource),
    lastVerifiedAt: row.lastVerifiedAt?.toISOString(),
    photoCount: row.photos?.length ?? 0,
    activationIssues: [...new Set(issues.map((issue) => issue.code))],
    updatedAt: (row.updatedAt ?? row._id.getTimestamp()).toISOString(),
  });
}
```

`apps/api/src/modules/places/places.repository.ts`:
- Import đổi thành `import type { DuplicateRow, EditRow, PlaceUpdate, SummaryRow } from './place-edit';`
- Thêm hằng sau `type DuplicateDoc = …`:

```ts
/** Trường của một dòng danh sách admin (SummaryRow). */
const SUMMARY_FIELDS = {
  status: 1,
  slug: 1,
  name: 1,
  aliases: 1,
  category: 1,
  alsoCategories: 1,
  zoneId: 1,
  location: 1,
  openingHours: 1,
  verifySource: 1,
  lastVerifiedAt: 1,
  photos: 1,
  updatedAt: 1,
};
```

- Thêm phương thức sau `findForEdit`:

```ts
  /** Địa điểm chưa gộp của thành phố cho danh sách admin (S07); đọc hết, admin lọc trong trình duyệt (vài trăm điểm). */
  async listForAdmin(cityId: string): Promise<SummaryRow[]> {
    return this.places.find({ cityId: new Types.ObjectId(cityId), status: { $ne: 'merged' } }, SUMMARY_FIELDS).lean<SummaryRow[]>();
  }
```

`apps/api/src/modules/places/place-editor.service.ts`:
- Import contracts thêm `type AdminPlaceListResponse,`; import place-edit đổi thành `import { editUpdate, toAdminPlace, toAdminPlaceSummary, type EditRow } from './place-edit';`
- Thêm phương thức ngay sau `get`:

```ts
  /** Danh sách admin (S07): mọi địa điểm chưa gộp của thành phố. */
  async list(citySlug: string): Promise<AdminPlaceListResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const [rows, zones] = await Promise.all([this.repo.listForAdmin(city.id), this.cities.zones(city.id)]);
    const zoneSlugById = new Map(zones.map((z) => [z.id, z.slug]));
    return { items: rows.map((row) => toAdminPlaceSummary(row, zoneSlugById)) };
  }
```

`apps/api/src/modules/admin/admin-places.controller.ts`:
- Import contracts thêm `type AdminPlaceListResponse,`.
- Thêm route đầu class (trước `create`):

```ts
  @Get('cities/:city/places')
  list(@Param('city', cityParam) city: string): Promise<AdminPlaceListResponse> {
    return this.editor.list(city);
  }
```

- [ ] **Step 4: Chạy test, typecheck, lint**

Run: `pnpm --filter @ranhduong/api test && pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/api lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/places/place-edit.ts apps/api/src/modules/places/places.repository.ts apps/api/src/modules/places/place-editor.service.ts apps/api/src/modules/admin/admin-places.controller.ts apps/api/src/modules/places/place-edit.test.ts apps/api/src/modules/places/place-editor.service.test.ts apps/api/src/modules/admin/admin.http.test.ts
git commit -m "feat: S07 list places for admin"
```

---

### Task 3: API xác minh, đổi trạng thái, xoá nháp

**Files:**
- Create: `apps/api/src/modules/places/place-errors.ts`
- Create: `apps/api/src/modules/places/place-status.service.ts`
- Modify: `apps/api/src/modules/places/place-editor.service.ts` (lỗi lấy từ place-errors, `present` công khai)
- Modify: `apps/api/src/modules/places/places.repository.ts` (`transition`, `deleteDraft`)
- Modify: `apps/api/src/modules/places/places.module.ts`
- Modify: `apps/api/src/modules/admin/admin-places.controller.ts`
- Test: `apps/api/src/modules/places/place-status.service.test.ts` (mới), `apps/api/src/modules/admin/admin.http.test.ts`

**Interfaces:**
- Consumes: `statusAfter`, `statusActionTarget`, `canVerify`, `PlaceVerifyInput`, `PlaceStatusInput`, `activationIssues`, `PLACE_STATUS_LABEL` (contracts); `PlacesRepository.findForEdit(id): Promise<EditRow | null>`.
- Produces:
  - `place-errors.ts`: `MAX_ATTEMPTS = 3`, `placeNotFound()`, `placeBusy()`, `placeInvalid(message, details?)` (đều trả `ApiException`)
  - `PlacesRepository.transition(id, expected: { status: PlaceStatus; updatedAt: Date | null }, set: Record<string, unknown>): Promise<EditRow | null>`
  - `PlacesRepository.deleteDraft(id): Promise<boolean>`
  - `PlaceEditorService.present(row: EditRow): Promise<AdminPlace>` (công khai)
  - `PlaceStatusService.verify(id, verifySource: AdminVerifySource, now?: Date): Promise<AdminPlace>`
  - `PlaceStatusService.changeStatus(id, action: PlaceStatusAction): Promise<AdminPlace>`
  - `PlaceStatusService.deleteDraft(id): Promise<void>`
  - `POST /v1/admin/places/:id/verify` (200 `AdminPlace`), `POST /v1/admin/places/:id/status` (200 `AdminPlace`), `DELETE /v1/admin/places/:id` (204)

- [ ] **Step 1: Viết test (đỏ)**

Tạo `apps/api/src/modules/places/place-status.service.test.ts`:

```ts
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { PlaceStatusService } from './place-status.service';
import { PlacesModule } from './places.module';
import { PlacesRepository } from './places.repository';

/** Đã ghim và có giờ (dữ liệu giả); thêm nguồn xác nhận là đủ điều kiện hiển thị. */
const PINNED = { location: { type: 'Point', coordinates: [0.2, 0.2] }, openingHours: [{ day: 1, open: '07:00', close: '22:00' }] };
const COMPLETE = { ...PINNED, verifySource: 'admin' };
const NOW = new Date('2026-10-08T03:00:00Z');

describe('PlaceStatusService', () => {
  let t: TestApp;
  let cityId: string;
  let service: PlaceStatusService;
  let seq = 0;
  const places = () => t.conn.collection('places');
  const dbDoc = (id: string) => places().findOne({ _id: new Types.ObjectId(id) });
  /** Chèn document giả (không qua Mongoose nên không có updatedAt); slug khác nhau để không đụng unique index. */
  const insert = async (overrides: Record<string, unknown> = {}) =>
    (await places().insertOne(fakePlaceDoc(cityId, { slug: `quan-gia-lap-${++seq}`, ...overrides }))).insertedId.toString();

  beforeAll(async () => {
    t = await createTestApp([PlacesModule]);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
    service = t.app.get(PlaceStatusService);
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await places().deleteMany({});
  });

  describe('verify', () => {
    it('nháp đủ điều kiện trừ nguồn xác nhận: thành đang hiển thị với nguồn vừa chọn, lastVerifiedAt là lúc bấm', async () => {
      const id = await insert({ ...PINNED, status: 'draft' });
      expect(await service.verify(id, 'owner', NOW)).toMatchObject({ status: 'active', verifySource: 'owner', lastVerifiedAt: NOW.toISOString() });
    });
    it('chỗ bị nghi ngờ: xác minh còn mở thì đang hiển thị, điểm nghi ngờ về 0', async () => {
      const id = await insert({ ...COMPLETE, status: 'suspected', suspicionScore: 3 });
      await service.verify(id, 'admin', NOW);
      expect(await dbDoc(id)).toMatchObject({ status: 'active', suspicionScore: 0, verifySource: 'admin', lastVerifiedAt: NOW });
    });
    it('chỗ đang hiển thị (document chèn thẳng, không có updatedAt): cập nhật ngày và nguồn', async () => {
      const id = await insert({ ...COMPLETE, lastVerifiedAt: new Date('2026-01-01T00:00:00Z') });
      expect(await service.verify(id, 'owner', NOW)).toMatchObject({ status: 'active', verifySource: 'owner', lastVerifiedAt: NOW.toISOString() });
    });
    it('thiếu điều kiện khác ngoài nguồn xác nhận: 400 kèm mã, DB giữ nguyên', async () => {
      const id = await insert({ status: 'draft' });
      await expect(service.verify(id, 'owner', NOW)).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ code: 'hours_invalid' }] },
      });
      expect(await dbDoc(id)).toMatchObject({ status: 'draft' });
      expect(await dbDoc(id)).not.toHaveProperty('lastVerifiedAt');
    });
    it('chỗ đã ẩn, đã đóng cửa: 400; id không có: 404', async () => {
      for (const status of ['hidden', 'closed']) {
        const id = await insert({ ...COMPLETE, status });
        await expect(service.verify(id, 'owner', NOW)).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
      }
      await expect(service.verify(new Types.ObjectId().toString(), 'owner', NOW)).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
  });

  describe('changeStatus', () => {
    it('ẩn rồi hiện lại; đánh dấu đóng cửa rồi mở lại; giữ ngày xác minh', async () => {
      const id = await insert({ ...COMPLETE, lastVerifiedAt: NOW });
      expect((await service.changeStatus(id, 'hide')).status).toBe('hidden');
      expect((await service.changeStatus(id, 'unhide')).status).toBe('active');
      expect((await service.changeStatus(id, 'close')).status).toBe('closed');
      const reopened = await service.changeStatus(id, 'reopen');
      expect(reopened).toMatchObject({ status: 'active', lastVerifiedAt: NOW.toISOString() });
    });
    it('bấm lại thao tác vừa xong (hai tab, bấm hai lần): trả trạng thái hiện tại, không lỗi', async () => {
      const id = await insert({ ...COMPLETE, status: 'hidden' });
      expect((await service.changeStatus(id, 'hide')).status).toBe('hidden');
    });
    it('thao tác không hợp trạng thái (ẩn một nháp, mở lại chỗ đang ẩn): 400, DB giữ nguyên', async () => {
      const draft = await insert({ ...COMPLETE, status: 'draft' });
      await expect(service.changeStatus(draft, 'hide')).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
      const hidden = await insert({ ...COMPLETE, status: 'hidden' });
      await expect(service.changeStatus(hidden, 'reopen')).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
      expect((await dbDoc(draft))?.status).toBe('draft');
      expect((await dbDoc(hidden))?.status).toBe('hidden');
    });
    it('hiện lại chỗ đã ẩn mà dữ liệu không còn đủ điều kiện (nhập thẳng vào DB): 400 kèm mã, vẫn ẩn', async () => {
      const id = await insert({ status: 'hidden' });
      await expect(service.changeStatus(id, 'unhide')).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ code: 'hours_invalid' }, { code: 'verify_source_missing' }] },
      });
      expect((await dbDoc(id))?.status).toBe('hidden');
    });
    it('repository không đổi khi document đã đổi sau lúc đọc (trạng thái hoặc updatedAt khác)', async () => {
      const id = await insert(COMPLETE);
      const repo = t.app.get(PlacesRepository);
      expect(await repo.transition(id, { status: 'active', updatedAt: new Date('2000-01-01T00:00:00Z') }, { status: 'hidden' })).toBeNull();
      expect(await repo.transition(id, { status: 'draft', updatedAt: null }, { status: 'hidden' })).toBeNull();
      expect((await dbDoc(id))?.status).toBe('active');
    });
  });

  describe('deleteDraft', () => {
    it('xoá hẳn nháp', async () => {
      const id = await insert({ status: 'draft' });
      await service.deleteDraft(id);
      expect(await dbDoc(id)).toBeNull();
    });
    it('chỗ đã công khai (đang hiển thị, bị nghi ngờ, đã ẩn, đã đóng cửa): 400, không xoá', async () => {
      for (const status of ['active', 'suspected', 'hidden', 'closed']) {
        const id = await insert({ ...COMPLETE, status });
        await expect(service.deleteDraft(id)).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
        expect(await dbDoc(id)).not.toBeNull();
      }
    });
    it('id không có: 404', async () => {
      await expect(service.deleteDraft(new Types.ObjectId().toString())).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
    it('repository chỉ xoá khi còn là nháp (nháp vừa được kích hoạt ở máy khác thì không xoá)', async () => {
      const id = await insert(COMPLETE);
      expect(await t.app.get(PlacesRepository).deleteDraft(id)).toBe(false);
      expect(await dbDoc(id)).not.toBeNull();
    });
  });
});
```

`apps/api/src/modules/admin/admin.http.test.ts`:
- Trong test "chưa đăng nhập: 401…", thêm vào mảng `routes`:

```ts
      ['POST', '/admin/places/0123456789abcdef01234567/verify'],
      ['POST', '/admin/places/0123456789abcdef01234567/status'],
      ['DELETE', '/admin/places/0123456789abcdef01234567'],
```

- Thêm các test:

```ts
  it('xoá nháp không có Origin: 403, không xoá', async () => {
    const place = await createDraft();
    const res = await call(`/admin/places/${place.id}`, { method: 'DELETE', withOrigin: false });
    expect(res.status).toBe(403);
    expect(await t.conn.collection('places').countDocuments()).toBe(1);
  });
  it('xoá nháp, xác minh, ẩn qua HTTP; chỗ đã công khai không xoá được', async () => {
    const draft = await createDraft();
    expect((await call(`/admin/places/${draft.id}`, { method: 'DELETE' })).status).toBe(204);
    expect(await t.conn.collection('places').countDocuments()).toBe(0);

    const pinned = {
      ...DRAFT,
      location: { type: 'Point', coordinates: [0.2, 0.2] },
      openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
    };
    const place = AdminPlace.parse(await (await call(`/admin/cities/${CITY}/places`, { method: 'POST', body: pinned })).json());
    const verified = await call(`/admin/places/${place.id}/verify`, { method: 'POST', body: { verifySource: 'owner' } });
    expect(verified.status).toBe(200);
    expect(AdminPlace.parse(await verified.json())).toMatchObject({ status: 'active', verifySource: 'owner' });
    const hidden = await call(`/admin/places/${place.id}/status`, { method: 'POST', body: { action: 'hide' } });
    expect(hidden.status).toBe(200);
    expect(AdminPlace.parse(await hidden.json()).status).toBe('hidden');
    const notDraft = await call(`/admin/places/${place.id}`, { method: 'DELETE' });
    expect(notDraft.status).toBe(400);
    expect(await t.conn.collection('places').countDocuments()).toBe(1);
  });
  it('thân sai: 400 VALIDATION_FAILED có path', async () => {
    const place = await createDraft();
    const status = await call(`/admin/places/${place.id}/status`, { method: 'POST', body: { action: 'merge' } });
    expect(status.status).toBe(400);
    expect(await status.json()).toMatchObject({ code: 'VALIDATION_FAILED', details: [{ path: 'action' }] });
    const verify = await call(`/admin/places/${place.id}/verify`, { method: 'POST', body: { verifySource: 'ctv' } });
    expect(await verify.json()).toMatchObject({ code: 'VALIDATION_FAILED', details: [{ path: 'verifySource' }] });
  });
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/api test`
Expected: FAIL (`./place-status.service` chưa có; route verify, status, DELETE trả 404).

- [ ] **Step 3: Viết code**

Tạo `apps/api/src/modules/places/place-errors.ts`:

```ts
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../shared/http/api-exception';

/** Số lần đọc lại khi trạng thái, updatedAt hay slug vừa bị request khác đổi. */
export const MAX_ATTEMPTS = 3;

/** Lỗi dùng chung của các service sửa địa điểm trong admin (PlaceEditorService, PlaceStatusService). */
export const placeNotFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy địa điểm');
export const placeBusy = () =>
  new ApiException('CONFLICT', HttpStatus.CONFLICT, 'Địa điểm vừa được sửa ở nơi khác. Tải lại trang rồi thử lại.');
export const placeInvalid = (message: string, details?: unknown) =>
  new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, message, details);
```

`apps/api/src/modules/places/place-editor.service.ts`:
- `import { HttpStatus, Injectable } from '@nestjs/common';` → `import { Injectable } from '@nestjs/common';`
- Bỏ dòng `import { ApiException } from '../../shared/http/api-exception';`
- Thêm `import { MAX_ATTEMPTS, placeBusy as busy, placeInvalid as invalid, placeNotFound as notFound } from './place-errors';` (sau import `./place-edit`).
- Bỏ khối khai báo cũ (giữ `MAX_DUPLICATES` và `invalidField`):

```ts
/** Số lần đọc lại khi trạng thái, updatedAt hay slug vừa bị request khác đổi. */
const MAX_ATTEMPTS = 3;
```

```ts
const notFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy địa điểm');
const busy = () => new ApiException('CONFLICT', HttpStatus.CONFLICT, 'Địa điểm vừa được sửa ở nơi khác. Tải lại trang rồi thử lại.');
const invalid = (message: string, details?: unknown) => new ApiException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST, message, details);
```

- Đổi `private async present(row: EditRow): Promise<AdminPlace> {` thành:

```ts
  /** Document → AdminPlace (id cụm thành slug); PlaceStatusService cũng dùng. */
  async present(row: EditRow): Promise<AdminPlace> {
```

`apps/api/src/modules/places/places.repository.ts`, thêm sau phương thức `activate`:

```ts
  /**
   * Đổi trạng thái (và các trường đi kèm), chỉ khi document còn như lúc đọc: cùng trạng thái, cùng updatedAt
   * (null là document chèn thẳng, chưa có updatedAt). Đã đổi thì null.
   */
  async transition(id: string, expected: { status: PlaceStatus; updatedAt: Date | null }, set: Record<string, unknown>): Promise<EditRow | null> {
    return this.places
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: expected.status, updatedAt: expected.updatedAt ?? { $exists: false } },
        { $set: set },
        { returnDocument: 'after', runValidators: true },
      )
      .lean<EditRow>();
  }

  /** Xoá hẳn, chỉ khi còn là nháp; false khi không có hoặc không còn là nháp. */
  async deleteDraft(id: string): Promise<boolean> {
    const { deletedCount } = await this.places.deleteOne({ _id: new Types.ObjectId(id), status: 'draft' });
    return deletedCount === 1;
  }
```

Tạo `apps/api/src/modules/places/place-status.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import {
  activationIssues,
  canVerify,
  PLACE_STATUS_LABEL,
  statusActionTarget,
  statusAfter,
  type AdminPlace,
  type AdminVerifySource,
  type PlaceStatusAction,
} from '@ranhduong/contracts';
import type { EditRow } from './place-edit';
import { PlaceEditorService } from './place-editor.service';
import { MAX_ATTEMPTS, placeBusy, placeInvalid, placeNotFound } from './place-errors';
import { PlacesRepository } from './places.repository';

const NOT_READY = 'Chưa đủ điều kiện để hiện trên web, mở form để hoàn thiện.';

/** Điều kiện kích hoạt của địa điểm như đang lưu; `verifySource` là nguồn vừa chọn khi xác minh. */
function issuesOf(row: EditRow, verifySource: unknown = row.verifySource) {
  return activationIssues({ location: row.location, openingHours: row.openingHours ?? [], verifySource, photos: row.photos ?? [] });
}

/** Chỉ ghi khi document còn như lúc đọc. */
const expectedOf = (row: EditRow) => ({ status: row.status, updatedAt: row.updatedAt ?? null });

/**
 * Xác minh, đổi trạng thái, xoá nháp từ danh sách admin (S07, technical-design mục 4). Mọi chuyển trạng thái là update
 * có điều kiện, đọc lại tối đa MAX_ATTEMPTS lần; chuyển sang active luôn kiểm điều kiện kích hoạt.
 */
@Injectable()
export class PlaceStatusService {
  constructor(
    private readonly repo: PlacesRepository,
    private readonly editor: PlaceEditorService,
  ) {}

  /** "Đã xác minh": đặt nguồn xác nhận, lastVerifiedAt là lúc bấm; nháp và chỗ bị nghi ngờ thành đang hiển thị. */
  async verify(id: string, verifySource: AdminVerifySource, now = new Date()): Promise<AdminPlace> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const current = await this.repo.findForEdit(id);
      if (!current) throw placeNotFound();
      if (!canVerify(current.status)) {
        throw placeInvalid(`Không xác minh được địa điểm đang ở trạng thái "${PLACE_STATUS_LABEL[current.status]}".`);
      }
      const issues = issuesOf(current, verifySource);
      if (issues.length > 0) throw placeInvalid(NOT_READY, issues);
      const updated = await this.repo.transition(id, expectedOf(current), {
        status: 'active',
        verifySource,
        lastVerifiedAt: now,
        suspicionScore: 0,
      });
      if (updated) return this.editor.present(updated);
    }
    throw placeBusy();
  }

  /** Ẩn, hiện lại, đánh dấu đã đóng cửa, mở lại. Đã ở trạng thái đích (bấm lại) thì trả nguyên. */
  async changeStatus(id: string, action: PlaceStatusAction): Promise<AdminPlace> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const current = await this.repo.findForEdit(id);
      if (!current) throw placeNotFound();
      if (current.status === statusActionTarget(action)) return this.editor.present(current);
      const target = statusAfter(current.status, action);
      if (target === null) {
        throw placeInvalid(`Không làm được thao tác này với địa điểm đang ở trạng thái "${PLACE_STATUS_LABEL[current.status]}".`);
      }
      if (target === 'active') {
        const issues = issuesOf(current);
        if (issues.length > 0) throw placeInvalid(NOT_READY, issues);
      }
      const updated = await this.repo.transition(id, expectedOf(current), { status: target });
      if (updated) return this.editor.present(updated);
    }
    throw placeBusy();
  }

  /**
   * Xoá hẳn nháp (chủ dự án chọn 2026-10-08): nháp chưa từng có URL công khai nên không gãy link (ADR 0010).
   * Chỗ đã công khai thì ẩn hoặc đánh dấu đã đóng cửa.
   */
  async deleteDraft(id: string): Promise<void> {
    const current = await this.repo.findForEdit(id);
    if (!current) throw placeNotFound();
    if (current.status !== 'draft') {
      throw placeInvalid('Chỉ xoá được nháp. Chỗ đã hiện trên web thì ẩn hoặc đánh dấu đã đóng cửa để giữ đường dẫn.');
    }
    // Vừa được kích hoạt ở máy khác giữa lúc đọc và lúc xoá: không xoá.
    if (!(await this.repo.deleteDraft(id))) throw placeBusy();
  }
}
```

`apps/api/src/modules/places/places.module.ts`:
- Thêm `import { PlaceStatusService } from './place-status.service';`
- `providers: [PlacesRepository, PlacesService, PlaceEditorService, PlaceStatusService],`
- `exports: [PlacesService, PlaceEditorService, PlaceStatusService],`

`apps/api/src/modules/admin/admin-places.controller.ts`: thay toàn bộ file bằng

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  DuplicateCheckInput,
  ObjectIdString,
  PlaceEditInput,
  PlaceStatusInput,
  PlaceVerifyInput,
  Slug,
  type AdminPlace,
  type AdminPlaceListResponse,
  type DuplicateCheckResponse,
} from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { PlaceEditorService } from '../places/place-editor.service';
import { PlaceStatusService } from '../places/place-status.service';

const cityParam = new ZodValidationPipe(Slug);
const idParam = new ZodValidationPipe(ObjectIdString);

/** Địa điểm trong admin: form (S05), danh sách, xác minh, đổi trạng thái, xoá nháp (S07). Chỉ validate input rồi gọi service. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminPlacesController {
  constructor(
    private readonly editor: PlaceEditorService,
    private readonly status: PlaceStatusService,
  ) {}

  @Get('cities/:city/places')
  list(@Param('city', cityParam) city: string): Promise<AdminPlaceListResponse> {
    return this.editor.list(city);
  }

  @Post('cities/:city/places')
  create(
    @Param('city', cityParam) city: string,
    @Body(new ZodValidationPipe(PlaceEditInput)) input: PlaceEditInput,
  ): Promise<AdminPlace> {
    return this.editor.create(city, input);
  }

  @Post('cities/:city/places/duplicate-check')
  @HttpCode(200)
  duplicates(
    @Param('city', cityParam) city: string,
    @Body(new ZodValidationPipe(DuplicateCheckInput)) input: DuplicateCheckInput,
  ): Promise<DuplicateCheckResponse> {
    return this.editor.checkDuplicates(city, input);
  }

  @Get('places/:id')
  get(@Param('id', idParam) id: string): Promise<AdminPlace> {
    return this.editor.get(id);
  }

  @Put('places/:id')
  update(@Param('id', idParam) id: string, @Body(new ZodValidationPipe(PlaceEditInput)) input: PlaceEditInput): Promise<AdminPlace> {
    return this.editor.update(id, input);
  }

  @Post('places/:id/activate')
  @HttpCode(200)
  activate(@Param('id', idParam) id: string): Promise<AdminPlace> {
    return this.editor.activate(id);
  }

  @Post('places/:id/verify')
  @HttpCode(200)
  verify(@Param('id', idParam) id: string, @Body(new ZodValidationPipe(PlaceVerifyInput)) input: PlaceVerifyInput): Promise<AdminPlace> {
    return this.status.verify(id, input.verifySource);
  }

  @Post('places/:id/status')
  @HttpCode(200)
  changeStatus(
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(PlaceStatusInput)) input: PlaceStatusInput,
  ): Promise<AdminPlace> {
    return this.status.changeStatus(id, input.action);
  }

  @Delete('places/:id')
  @HttpCode(204)
  remove(@Param('id', idParam) id: string): Promise<void> {
    return this.status.deleteDraft(id);
  }
}
```

- [ ] **Step 4: Chạy test, typecheck, lint**

Run: `pnpm --filter @ranhduong/api test && pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/api lint`
Expected: PASS (kể cả các test S05 cũ của `PlaceEditorService`, vì chỉ đổi chỗ khai báo lỗi).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/places/place-errors.ts apps/api/src/modules/places/place-status.service.ts apps/api/src/modules/places/place-status.service.test.ts apps/api/src/modules/places/place-editor.service.ts apps/api/src/modules/places/places.repository.ts apps/api/src/modules/places/places.module.ts apps/api/src/modules/admin/admin-places.controller.ts apps/api/src/modules/admin/admin.http.test.ts
git commit -m "feat: S07 verify, hide, close, reopen and delete drafts in admin API"
```

---

### Task 4: Admin entities: gọi API, nhãn trạng thái, ngày xác minh

**Files:**
- Modify: `apps/admin/src/entities/place/api/places.ts`
- Move: `apps/admin/src/widgets/place-editor/model/verify-options.ts` → `apps/admin/src/entities/place/model/verify-options.ts` (kèm `verify-options.test.ts`)
- Create: `apps/admin/src/entities/place/model/status.ts`, `apps/admin/src/entities/place/model/status.test.ts`
- Create: `apps/admin/src/entities/place/model/draft-key.ts`
- Modify: `apps/admin/src/widgets/place-editor/model/use-place-editor.ts`
- Modify: `apps/admin/src/widgets/place-editor/ui/RdPlaceEditor.vue`
- Modify: `apps/admin/src/shared/lib/time.ts`, `apps/admin/src/shared/lib/time.test.ts`

**Interfaces:**
- Consumes: `AdminPlaceSummary`, `AdminPlaceListResponse`, `PlaceVerifyInput`, `PlaceStatusAction`, `verificationStale`, `PLACE_STATUS_LABEL` (contracts); `api` (shared/api/client).
- Produces:
  - `fetchPlaces(city: string): Promise<AdminPlaceSummary[]>`, `verifyPlace(id, verifySource: AdminVerifySource): Promise<AdminPlace>`, `changePlaceStatus(id, action: PlaceStatusAction): Promise<AdminPlace>`, `deletePlace(id): Promise<void>` (entities/place/api/places.ts)
  - `verifySourceOptions(category: PlaceCategory | ''): VerifyOption[]` (chuyển sang `@/entities/place/model/verify-options`)
  - `PLACE_STATUS_CLASS: Record<PlaceStatus, string>`, `statusChip(place: { status: PlaceStatus; lastVerifiedAt?: string }, now: Date): { label: string; className: string }`, `verifySourceLabel(category: PlaceCategory, source: VerifySource | undefined): string` (entities/place/model/status.ts)
  - `placeDraftKey(id: string | null): string` (entities/place/model/draft-key.ts)
  - `daysAgoText(iso: string, now: Date): string` (shared/lib/time.ts)

- [ ] **Step 1: Chuyển verify-options, viết test (đỏ)**

```bash
mkdir -p apps/admin/src/entities/place/model
git mv apps/admin/src/widgets/place-editor/model/verify-options.ts apps/admin/src/entities/place/model/verify-options.ts
git mv apps/admin/src/widgets/place-editor/model/verify-options.test.ts apps/admin/src/entities/place/model/verify-options.test.ts
```

Tạo `apps/admin/src/entities/place/model/status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { statusChip, verifySourceLabel } from './status';

const NOW = new Date('2026-10-08T03:00:00Z');

describe('statusChip', () => {
  it('đang hiển thị, xác minh trong 90 ngày: "Đang hiển thị" màu ok', () => {
    expect(statusChip({ status: 'active', lastVerifiedAt: '2026-10-01T03:00:00.000Z' }, NOW)).toEqual({
      label: 'Đang hiển thị',
      className: 'rd-status--ok',
    });
  });
  it('đang hiển thị mà quá 90 ngày hoặc chưa xác minh lần nào: "Cần xác minh lại" màu warn', () => {
    const stale = { label: 'Cần xác minh lại', className: 'rd-status--warn' };
    expect(statusChip({ status: 'active', lastVerifiedAt: '2026-07-01T03:00:00.000Z' }, NOW)).toEqual(stale);
    expect(statusChip({ status: 'active' }, NOW)).toEqual(stale);
  });
  it('trạng thái khác giữ nhãn và màu riêng, không xét ngày xác minh', () => {
    expect(statusChip({ status: 'draft' }, NOW)).toEqual({ label: 'Nháp', className: 'rd-status--draft' });
    expect(statusChip({ status: 'suspected' }, NOW)).toEqual({ label: 'Bị nghi ngờ', className: 'rd-status--bad' });
    expect(statusChip({ status: 'hidden' }, NOW)).toEqual({ label: 'Đã ẩn', className: 'rd-status--warn' });
    expect(statusChip({ status: 'closed' }, NOW)).toEqual({ label: 'Đã đóng cửa', className: 'rd-status--warn' });
  });
});

describe('verifySourceLabel', () => {
  it('tên nguồn theo danh mục, như lựa chọn trong form', () => {
    expect(verifySourceLabel('cafe', 'owner')).toBe('Quán đã xác nhận');
    expect(verifySourceLabel('cafe', 'admin')).toBe('Chỉ dựa trên Facebook');
    expect(verifySourceLabel('attraction', 'admin')).toBe('Điểm công cộng');
    expect(verifySourceLabel('attraction', 'owner')).toBe('Đơn vị quản lý đã xác nhận');
  });
  it('chưa chọn; nguồn của các lát sau', () => {
    expect(verifySourceLabel('cafe', undefined)).toBe('Chưa chọn');
    expect(verifySourceLabel('cafe', 'ctv')).toBe('Cộng tác viên');
    expect(verifySourceLabel('cafe', 'user')).toBe('Người dùng');
  });
});
```

`apps/admin/src/shared/lib/time.test.ts`: đổi import thành `import { daysAgoText, formatLocalTime } from './time';` rồi thêm vào cuối file:

```ts
describe('daysAgoText', () => {
  it('cùng ngày ở Việt Nam: hôm nay; ngày trong tương lai (lệch đồng hồ) cũng là hôm nay', () => {
    const now = new Date('2026-10-08T03:00:00Z');
    expect(daysAgoText('2026-10-08T00:30:00Z', now)).toBe('Hôm nay');
    expect(daysAgoText('2026-10-09T03:00:00Z', now)).toBe('Hôm nay');
  });
  it('tính theo ngày lịch ở Việt Nam (UTC+7), không theo 24 giờ', () => {
    // 23:59 ngày 7/10 và 00:01 ngày 8/10 giờ Việt Nam.
    expect(daysAgoText('2026-10-07T16:59:00Z', new Date('2026-10-07T17:01:00Z'))).toBe('Hôm qua');
  });
  it('từ hai ngày: "N ngày trước"', () => {
    const now = new Date('2026-10-08T03:00:00Z');
    expect(daysAgoText('2026-10-06T03:00:00Z', now)).toBe('2 ngày trước');
    expect(daysAgoText('2026-07-10T03:00:00Z', now)).toBe('90 ngày trước');
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/admin test`
Expected: FAIL (`./status` chưa có, `daysAgoText` chưa export). `verify-options.test.ts` ở chỗ mới vẫn PASS.

- [ ] **Step 3: Viết code**

Tạo `apps/admin/src/entities/place/model/status.ts`:

```ts
import { PLACE_STATUS_LABEL, verificationStale, type PlaceCategory, type PlaceStatus, type VerifySource } from '@ranhduong/contracts';
import { verifySourceOptions } from './verify-options';

/** Màu chip trạng thái (ui-spec mục 12); chip luôn có chữ và chấm tròn (`.rd-status::before`). */
export const PLACE_STATUS_CLASS: Record<PlaceStatus, string> = {
  draft: 'rd-status--draft',
  active: 'rd-status--ok',
  suspected: 'rd-status--bad',
  hidden: 'rd-status--warn',
  closed: 'rd-status--warn',
  merged: 'rd-status--warn',
};

export interface StatusChip {
  label: string;
  className: string;
}

/** Chip trạng thái trong danh sách: chỗ đang hiển thị quá 90 ngày chưa xác minh ghi "Cần xác minh lại". */
export function statusChip(place: { status: PlaceStatus; lastVerifiedAt?: string }, now: Date): StatusChip {
  if (place.status === 'active' && verificationStale(place.lastVerifiedAt, now)) {
    return { label: 'Cần xác minh lại', className: 'rd-status--warn' };
  }
  return { label: PLACE_STATUS_LABEL[place.status], className: PLACE_STATUS_CLASS[place.status] };
}

/** Cột "Xác nhận": tên nguồn theo danh mục như lựa chọn trong form; chưa chọn thì "Chưa chọn". */
export function verifySourceLabel(category: PlaceCategory, source: VerifySource | undefined): string {
  if (source === undefined) return 'Chưa chọn';
  if (source === 'ctv') return 'Cộng tác viên';
  if (source === 'user') return 'Người dùng';
  return verifySourceOptions(category).find((option) => option.value === source)?.label ?? source;
}
```

Tạo `apps/admin/src/entities/place/model/draft-key.ts`:

```ts
/** Khoá localStorage của bản đang sửa trên máy (form địa điểm S05); `moi` khi tạo mới. Xoá nháp (S07) cũng xoá khoá này. */
export function placeDraftKey(id: string | null): string {
  return `rd-admin:place-draft:${id ?? 'moi'}`;
}
```

`apps/admin/src/widgets/place-editor/model/use-place-editor.ts`:
- Bỏ dòng `const draftKey = (id: string | null) => \`rd-admin:place-draft:${id ?? 'moi'}\`;`
- Thêm import `import { placeDraftKey } from '@/entities/place/model/draft-key';` (sau import `@/entities/place/api/places`).
- Đổi 3 chỗ gọi `draftKey(` thành `placeDraftKey(`.

`apps/admin/src/widgets/place-editor/ui/RdPlaceEditor.vue`:
- Bỏ `type PlaceStatus,` khỏi import contracts.
- `import { verifySourceOptions } from '../model/verify-options';` → `import { verifySourceOptions } from '@/entities/place/model/verify-options';`
- Thêm `import { PLACE_STATUS_CLASS } from '@/entities/place/model/status';`
- Bỏ khối `const STATUS_CLASS: Record<PlaceStatus, string> = { … };`
- Trong template đổi `STATUS_CLASS[status]` thành `PLACE_STATUS_CLASS[status]`.

`apps/admin/src/entities/place/api/places.ts`: thay import đầu file và thêm 4 hàm vào cuối:

```ts
import {
  AdminPlace,
  AdminPlaceListResponse,
  DuplicateCheckResponse,
  type AdminPlaceSummary,
  type AdminVerifySource,
  type DuplicateCheckInput,
  type DuplicateMatch,
  type PlaceEditInput,
  type PlaceStatusAction,
  type PlaceStatusInput,
  type PlaceVerifyInput,
} from '@ranhduong/contracts';
import { api } from '@/shared/api/client';
```

```ts
/** Mọi địa điểm chưa gộp của thành phố cho danh sách (S07). */
export async function fetchPlaces(city: string): Promise<AdminPlaceSummary[]> {
  return AdminPlaceListResponse.parse(await api(`/admin/cities/${city}/places`)).items;
}

/** "Đã xác minh": đặt nguồn xác nhận và ngày xác minh; nháp, chỗ bị nghi ngờ thành đang hiển thị. */
export async function verifyPlace(id: string, verifySource: AdminVerifySource): Promise<AdminPlace> {
  const body: PlaceVerifyInput = { verifySource };
  return AdminPlace.parse(await api(`/admin/places/${id}/verify`, { method: 'POST', body }));
}

/** Ẩn, hiện lại, đánh dấu đã đóng cửa, mở lại. */
export async function changePlaceStatus(id: string, action: PlaceStatusAction): Promise<AdminPlace> {
  const body: PlaceStatusInput = { action };
  return AdminPlace.parse(await api(`/admin/places/${id}/status`, { method: 'POST', body }));
}

/** Xoá hẳn một nháp (API từ chối nếu không còn là nháp). */
export async function deletePlace(id: string): Promise<void> {
  await api(`/admin/places/${id}`, { method: 'DELETE' });
}
```

`apps/admin/src/shared/lib/time.ts`, thêm vào cuối file:

```ts
const DAY_PARTS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Số thứ tự của ngày lịch ở Việt Nam chứa `date` (trừ hai số ra số ngày). */
function vnDayIndex(date: Date): number {
  const parts = DAY_PARTS.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part('year'), part('month') - 1, part('day')) / 86_400_000;
}

/** "Hôm nay", "Hôm qua", "N ngày trước" theo ngày lịch ở Việt Nam (cột "Xác minh lần cuối"). Ngày trong tương lai coi là hôm nay. */
export function daysAgoText(iso: string, now: Date): string {
  const days = vnDayIndex(now) - vnDayIndex(new Date(iso));
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  return `${days} ngày trước`;
}
```

- [ ] **Step 4: Chạy test, typecheck, lint**

Run: `pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint`
Expected: PASS (test `use-place-editor` vẫn xanh vì khoá localStorage không đổi).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/entities/place apps/admin/src/widgets/place-editor/model/use-place-editor.ts apps/admin/src/widgets/place-editor/ui/RdPlaceEditor.vue apps/admin/src/shared/lib/time.ts apps/admin/src/shared/lib/time.test.ts
git add -u apps/admin/src/widgets/place-editor/model
git commit -m "feat: S07 add place list api calls and status labels to admin entities"
```

---

### Task 5: Bộ lọc, tab, xếp và tải danh sách (model của widget `place-list`)

**Files:**
- Create: `apps/admin/src/widgets/place-list/model/filters.ts`, `filters.test.ts`
- Create: `apps/admin/src/widgets/place-list/model/use-place-list.ts`, `use-place-list.test.ts`

**Interfaces:**
- Consumes: `AdminPlaceSummary`, `PlaceCategory`, `Slug`, `servesCategory`, `verificationStale`, `CityPublic` (contracts); `matchScore`, `searchKey` (`@ranhduong/geo`); `fetchPlaces` (Task 4), `fetchCity` (entities/city); `toApiFailure`, `ApiFailure` (shared/api/errors); `CITY_SLUG` (shared/config).
- Produces:
  - `ListTab = 'all' | 'draft' | 'active' | 'suspected' | 'stale' | 'inactive'`, `LIST_TABS: { value: ListTab; label: string }[]`
  - `VerifyFilter = 'owner' | 'facebook' | 'public' | 'none'`, `VERIFY_FILTERS: { value: VerifyFilter; label: string }[]`
  - `ListSort = 'updated' | 'name' | '-name' | 'verified' | '-verified'`, `NO_ZONE = '_none'`
  - `interface ListFilters { tab; q; zone; category: PlaceCategory | ''; verify: VerifyFilter | ''; sort }`, `DEFAULT_FILTERS`
  - `filtersFromQuery(query: Readonly<Record<string, unknown>>): ListFilters`, `filtersToQuery(filters): Record<string, string>`
  - `inTab(row, tab, now): boolean`, `matchesFilters(row, filters): boolean`, `tabCounts(rows, filters, now): Record<ListTab, number>`, `sortRows(rows, sort): AdminPlaceSummary[]`, `visibleRows(rows, filters, now): AdminPlaceSummary[]`
  - `listLoadError(failure: ApiFailure): string`
  - `usePlaceList(): { load: Ref<ListLoad>; rows: ShallowRef<AdminPlaceSummary[]>; zones: ShallowRef<CityPublic['zones']>; reload(): Promise<void> }` với `ListLoad = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string; login: boolean }`

- [ ] **Step 1: Viết test (đỏ)**

Tạo `apps/admin/src/widgets/place-list/model/filters.test.ts`:

```ts
import { AdminPlaceSummary } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  filtersFromQuery,
  filtersToQuery,
  inTab,
  matchesFilters,
  NO_ZONE,
  sortRows,
  tabCounts,
  visibleRows,
  type ListFilters,
} from './filters';

// Dữ liệu giả, tên rõ là giả.
const NOW = new Date('2026-10-08T03:00:00Z');
let seq = 0;
function row(overrides: Partial<AdminPlaceSummary> = {}): AdminPlaceSummary {
  seq++;
  return AdminPlaceSummary.parse({
    id: seq.toString(16).padStart(24, '0'),
    status: 'active',
    slug: `quan-gia-lap-${seq}`,
    name: `Quán Giả Lập ${seq}`,
    aliases: [],
    category: 'cafe',
    alsoCategories: [],
    photoCount: 0,
    activationIssues: [],
    lastVerifiedAt: '2026-10-01T03:00:00.000Z',
    updatedAt: '2026-10-01T03:00:00.000Z',
    ...overrides,
  });
}
const filters = (overrides: Partial<ListFilters> = {}): ListFilters => ({ ...DEFAULT_FILTERS, ...overrides });
const names = (rows: readonly AdminPlaceSummary[]) => rows.map((r) => r.name);

describe('filtersFromQuery, filtersToQuery', () => {
  it('query trống: mặc định; đọc đủ các giá trị hợp lệ', () => {
    expect(filtersFromQuery({})).toEqual(DEFAULT_FILTERS);
    expect(
      filtersFromQuery({ status: 'stale', q: 'ca phe', zone: 'cum-gia-lap-a', category: 'food', verify: 'facebook', sort: '-name' }),
    ).toEqual({ tab: 'stale', q: 'ca phe', zone: 'cum-gia-lap-a', category: 'food', verify: 'facebook', sort: '-name' });
  });
  it('URL cũ hoặc bị sửa tay: giá trị lạ, null, tham số lặp thì lấy mặc định hoặc giá trị đầu', () => {
    expect(filtersFromQuery({ status: 'xoa', zone: 'Cụm A', category: 'bar', verify: 'ctv', sort: 'gia', q: null })).toEqual(DEFAULT_FILTERS);
    expect(filtersFromQuery({ status: ['draft', 'active'], zone: NO_ZONE })).toMatchObject({ tab: 'draft', zone: NO_ZONE });
    expect(filtersFromQuery({ q: 'a'.repeat(150) }).q).toHaveLength(100);
  });
  it('chỉ ghi giá trị khác mặc định, bỏ khoảng trắng thừa của từ khoá; đọc lại ra đúng bộ lọc', () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toEqual({});
    const chosen = filters({ tab: 'draft', q: '  may  ', zone: NO_ZONE, category: 'attraction', verify: 'none', sort: 'name' });
    expect(filtersToQuery(chosen)).toEqual({ status: 'draft', q: 'may', zone: '_none', category: 'attraction', verify: 'none', sort: 'name' });
    expect(filtersFromQuery(filtersToQuery(chosen))).toEqual({ ...chosen, q: 'may' });
  });
});

describe('inTab', () => {
  it('"Cần xác minh lại" là chỗ đang hiển thị quá 90 ngày hoặc chưa xác minh, vẫn nằm trong "Đang hiển thị"', () => {
    const stale = row({ lastVerifiedAt: '2026-06-01T03:00:00.000Z' });
    const never = row({ lastVerifiedAt: undefined });
    const fresh = row();
    expect([stale, never, fresh].map((r) => inTab(r, 'stale', NOW))).toEqual([true, true, false]);
    expect([stale, never, fresh].map((r) => inTab(r, 'active', NOW))).toEqual([true, true, true]);
    expect(inTab(row({ status: 'draft', lastVerifiedAt: undefined }), 'stale', NOW)).toBe(false);
  });
  it('"Ẩn hoặc đã đóng" gồm đã ẩn và đã đóng cửa; "Tất cả" gồm mọi trạng thái', () => {
    expect(inTab(row({ status: 'hidden' }), 'inactive', NOW)).toBe(true);
    expect(inTab(row({ status: 'closed' }), 'inactive', NOW)).toBe(true);
    expect(inTab(row({ status: 'suspected' }), 'inactive', NOW)).toBe(false);
    expect(inTab(row({ status: 'closed' }), 'all', NOW)).toBe(true);
    expect(inTab(row({ status: 'draft' }), 'draft', NOW)).toBe(true);
  });
});

describe('matchesFilters', () => {
  it('tìm không dấu theo tên và tên khác', () => {
    const may = row({ name: 'Cà phê Giả Lập Mây', aliases: ['Tiệm Cũ Giả Lập'] });
    expect(matchesFilters(may, filters({ q: 'ca phe may' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: 'Mây' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: 'tiem cu' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: 'doi che' }))).toBe(false);
  });
  it('từ khoá chỉ có ký tự đặc biệt hoặc khoảng trắng: coi như không lọc', () => {
    const may = row({ name: 'Cà phê Giả Lập Mây' });
    expect(matchesFilters(may, filters({ q: '(((' }))).toBe(true);
    expect(matchesFilters(may, filters({ q: '   ' }))).toBe(true);
  });
  it('cụm: đúng slug, hoặc "Chưa chọn cụm"', () => {
    const inA = row({ zone: 'cum-gia-lap-a' });
    const noZone = row();
    expect([inA, noZone].map((r) => matchesFilters(r, filters({ zone: 'cum-gia-lap-a' })))).toEqual([true, false]);
    expect([inA, noZone].map((r) => matchesFilters(r, filters({ zone: NO_ZONE })))).toEqual([false, true]);
    expect([inA, noZone].map((r) => matchesFilters(r, filters()))).toEqual([true, true]);
  });
  it('danh mục tính cả danh mục phụ (S27)', () => {
    const cafeFood = row({ category: 'cafe', alsoCategories: ['food'] });
    expect(matchesFilters(cafeFood, filters({ category: 'food' }))).toBe(true);
    expect(matchesFilters(cafeFood, filters({ category: 'cafe' }))).toBe(true);
    expect(matchesFilters(cafeFood, filters({ category: 'attraction' }))).toBe(false);
  });
  it('nguồn xác nhận: admin là "Chỉ dựa trên Facebook" với quán, "Điểm công cộng" với điểm tham quan', () => {
    const owner = row({ verifySource: 'owner' });
    const facebook = row({ verifySource: 'admin', category: 'cafe' });
    const publicSpot = row({ verifySource: 'admin', category: 'attraction' });
    const none = row();
    const all = [owner, facebook, publicSpot, none];
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'owner' })))).toEqual([true, false, false, false]);
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'facebook' })))).toEqual([false, true, false, false]);
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'public' })))).toEqual([false, false, true, false]);
    expect(all.map((r) => matchesFilters(r, filters({ verify: 'none' })))).toEqual([false, false, false, true]);
  });
});

describe('tabCounts', () => {
  const rows = [
    row({ name: 'Nháp Giả Lập', status: 'draft', lastVerifiedAt: undefined }),
    row({ name: 'Mới Giả Lập' }),
    row({ name: 'Cũ Giả Lập', lastVerifiedAt: undefined }),
    row({ name: 'Nghi Giả Lập', status: 'suspected' }),
    row({ name: 'Ẩn Giả Lập', status: 'hidden' }),
    row({ name: 'Đóng Giả Lập', status: 'closed' }),
  ];
  it('đếm mọi tab; chỗ cần xác minh lại tính cả ở "Đang hiển thị"', () => {
    expect(tabCounts(rows, filters(), NOW)).toEqual({ all: 6, draft: 1, active: 2, suspected: 1, stale: 1, inactive: 2 });
  });
  it('đếm sau các bộ lọc khác (từ khoá, cụm…), không phụ thuộc tab đang chọn', () => {
    expect(tabCounts(rows, filters({ q: 'an gia lap', tab: 'draft' }), NOW)).toEqual({
      all: 1,
      draft: 0,
      active: 0,
      suspected: 0,
      stale: 0,
      inactive: 1,
    });
  });
});

describe('sortRows, visibleRows', () => {
  it('mặc định: sửa gần nhất trước', () => {
    const older = row({ name: 'Cũ Giả Lập', updatedAt: '2026-10-01T03:00:00.000Z' });
    const newer = row({ name: 'Mới Giả Lập', updatedAt: '2026-10-05T03:00:00.000Z' });
    expect(names(sortRows([older, newer], 'updated'))).toEqual(['Mới Giả Lập', 'Cũ Giả Lập']);
  });
  it('theo tên: thứ tự chữ cái tiếng Việt (Ấ trước B, Đ sau D); bấm lại thì ngược lại', () => {
    const rows = [row({ name: 'Đồi Giả Lập' }), row({ name: 'Bãi Giả Lập' }), row({ name: 'Ấp Giả Lập' }), row({ name: 'Dốc Giả Lập' })];
    expect(names(sortRows(rows, 'name'))).toEqual(['Ấp Giả Lập', 'Bãi Giả Lập', 'Dốc Giả Lập', 'Đồi Giả Lập']);
    expect(names(sortRows(rows, '-name'))).toEqual(['Đồi Giả Lập', 'Dốc Giả Lập', 'Bãi Giả Lập', 'Ấp Giả Lập']);
  });
  it('theo ngày xác minh: chưa xác minh và lâu nhất trước; ngược lại thì mới nhất trước, chưa xác minh cuối', () => {
    const never = row({ name: 'Chưa Giả Lập', lastVerifiedAt: undefined });
    const old = row({ name: 'Lâu Giả Lập', lastVerifiedAt: '2026-05-01T03:00:00.000Z' });
    const recent = row({ name: 'Gần Giả Lập', lastVerifiedAt: '2026-10-07T03:00:00.000Z' });
    expect(names(sortRows([recent, never, old], 'verified'))).toEqual(['Chưa Giả Lập', 'Lâu Giả Lập', 'Gần Giả Lập']);
    expect(names(sortRows([old, never, recent], '-verified'))).toEqual(['Gần Giả Lập', 'Lâu Giả Lập', 'Chưa Giả Lập']);
  });
  it('visibleRows: lọc theo tab và bộ lọc rồi xếp; không đổi mảng gốc', () => {
    const rows = [row({ name: 'Bãi Giả Lập', status: 'draft' }), row({ name: 'Ấp Giả Lập', status: 'draft' }), row({ name: 'Cầu Giả Lập' })];
    expect(names(visibleRows(rows, filters({ tab: 'draft', sort: 'name' }), NOW))).toEqual(['Ấp Giả Lập', 'Bãi Giả Lập']);
    expect(names(rows)).toEqual(['Bãi Giả Lập', 'Ấp Giả Lập', 'Cầu Giả Lập']);
  });
});
```

Tạo `apps/admin/src/widgets/place-list/model/use-place-list.test.ts`:

```ts
import { AdminPlaceSummary, CityPublic } from '@ranhduong/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { fetchCity } from '@/entities/city/api/city';
import { fetchPlaces } from '@/entities/place/api/places';
import { listLoadError, usePlaceList } from './use-place-list';

vi.mock('@/entities/city/api/city', () => ({ fetchCity: vi.fn() }));
vi.mock('@/entities/place/api/places', () => ({ fetchPlaces: vi.fn() }));

// Dữ liệu giả, tên rõ là giả.
const CITY = CityPublic.parse({
  slug: 'thanh-pho-gia-lap',
  name: 'Thành phố Giả Lập',
  accent: '#123456',
  center: { type: 'Point', coordinates: [0.5, 0.5] },
  mapBounds: [0, 0, 1, 1],
  zones: [{ slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' }],
});
const row = (name: string) =>
  AdminPlaceSummary.parse({
    id: '0123456789abcdef01234567',
    status: 'draft',
    slug: 'quan-gia-lap',
    name,
    aliases: [],
    category: 'cafe',
    alsoCategories: [],
    photoCount: 0,
    activationIssues: [],
    updatedAt: '2026-10-08T03:00:00.000Z',
  });

function mount() {
  const list = effectScope().run(() => usePlaceList());
  if (!list) throw new Error('không dựng được danh sách');
  return list;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('usePlaceList', () => {
  it('tải danh sách và các cụm của thành phố', async () => {
    vi.mocked(fetchCity).mockResolvedValue(CITY);
    vi.mocked(fetchPlaces).mockResolvedValue([row('Quán Giả Lập')]);
    const list = mount();
    await vi.waitFor(() => expect(list.load.value.kind).toBe('ready'));
    expect(list.rows.value.map((r) => r.name)).toEqual(['Quán Giả Lập']);
    expect(list.zones.value).toEqual([{ slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' }]);
  });
  it('mất mạng: báo chưa kết nối, không phải lỗi đăng nhập', async () => {
    vi.mocked(fetchCity).mockResolvedValue(CITY);
    vi.mocked(fetchPlaces).mockRejectedValue(new Error('Mất mạng giả lập'));
    const list = mount();
    await vi.waitFor(() => expect(list.load.value).toEqual({ kind: 'error', message: 'Chưa kết nối được máy chủ.', login: false }));
  });
  it('hai lần tải chồng nhau: kết quả về muộn của lần cũ không ghi đè lần mới', async () => {
    let resolveOld: ((rows: AdminPlaceSummary[]) => void) | undefined;
    vi.mocked(fetchCity).mockResolvedValue(CITY);
    vi.mocked(fetchPlaces)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce([row('Bản Mới Giả Lập')]);
    const list = mount();
    await list.reload();
    resolveOld?.([row('Bản Cũ Giả Lập')]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(list.rows.value.map((r) => r.name)).toEqual(['Bản Mới Giả Lập']);
  });
});

describe('listLoadError', () => {
  it('hết phiên, mất mạng, lỗi khác', () => {
    expect(listLoadError({ status: 401, error: null })).toBe('Phiên đăng nhập đã hết, đăng nhập lại.');
    expect(listLoadError({ status: 0, error: null })).toBe('Chưa kết nối được máy chủ.');
    expect(listLoadError({ status: 500, error: null })).toBe('Chưa tải được danh sách địa điểm, thử lại.');
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/admin test`
Expected: FAIL (`./filters`, `./use-place-list` chưa có).

- [ ] **Step 3: Viết code**

Tạo `apps/admin/src/widgets/place-list/model/filters.ts`:

```ts
import { PlaceCategory, servesCategory, Slug, verificationStale, type AdminPlaceSummary } from '@ranhduong/contracts';
import { matchScore, searchKey } from '@ranhduong/geo';
import { z } from 'zod';

/** Tab trạng thái (ui-spec mục 12) và tab "Ẩn hoặc đã đóng" thêm ở S07 để tìm lại chỗ đã ẩn, đã đóng. */
export const ListTab = z.enum(['all', 'draft', 'active', 'suspected', 'stale', 'inactive']);
export type ListTab = z.infer<typeof ListTab>;
export const LIST_TABS: readonly { value: ListTab; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'active', label: 'Đang hiển thị' },
  { value: 'suspected', label: 'Bị nghi ngờ' },
  { value: 'stale', label: 'Cần xác minh lại' },
  { value: 'inactive', label: 'Ẩn hoặc đã đóng' },
];

/** Lọc nguồn xác nhận như cột "Xác nhận": quán xác nhận, chỉ dựa trên Facebook, điểm công cộng, chưa chọn. */
export const VerifyFilter = z.enum(['owner', 'facebook', 'public', 'none']);
export type VerifyFilter = z.infer<typeof VerifyFilter>;
export const VERIFY_FILTERS: readonly { value: VerifyFilter; label: string }[] = [
  { value: 'owner', label: 'Quán xác nhận' },
  { value: 'facebook', label: 'Chỉ dựa trên Facebook' },
  { value: 'public', label: 'Điểm công cộng' },
  { value: 'none', label: 'Chưa chọn' },
];

/** updated: sửa gần nhất trước; name: A→Z; verified: chưa xác minh và lâu nhất trước; dấu trừ là chiều ngược lại. */
export const ListSort = z.enum(['updated', 'name', '-name', 'verified', '-verified']);
export type ListSort = z.infer<typeof ListSort>;

/** Giá trị lọc cụm cho chỗ chưa chọn cụm; không phải slug hợp lệ nên không trùng cụm nào. */
export const NO_ZONE = '_none';
const MAX_QUERY_LENGTH = 100;

export interface ListFilters {
  tab: ListTab;
  /** Từ khoá tìm theo tên và tên khác, không dấu. */
  q: string;
  /** '' mọi cụm, NO_ZONE chưa chọn cụm, còn lại là slug cụm. */
  zone: string;
  category: PlaceCategory | '';
  verify: VerifyFilter | '';
  sort: ListSort;
}

export const DEFAULT_FILTERS: ListFilters = { tab: 'all', q: '', zone: '', category: '', verify: '', sort: 'updated' };

/** Giá trị đầu của một tham số query (vue-router trả chuỗi, null hoặc mảng). */
function firstValue(value: unknown): string | undefined {
  const first: unknown = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : undefined;
}

/** Bộ lọc từ query của URL (giữ khi quay lại từ form); giá trị lạ hoặc thiếu thì lấy mặc định. */
export function filtersFromQuery(query: Readonly<Record<string, unknown>>): ListFilters {
  const read = (key: string) => firstValue(query[key]);
  const zone = read('zone') ?? '';
  return {
    tab: ListTab.catch(DEFAULT_FILTERS.tab).parse(read('status')),
    q: (read('q') ?? '').slice(0, MAX_QUERY_LENGTH),
    zone: zone === NO_ZONE || Slug.safeParse(zone).success ? zone : '',
    category: PlaceCategory.or(z.literal('')).catch('').parse(read('category')),
    verify: VerifyFilter.or(z.literal('')).catch('').parse(read('verify')),
    sort: ListSort.catch(DEFAULT_FILTERS.sort).parse(read('sort')),
  };
}

/** Ngược lại của filtersFromQuery: chỉ ghi giá trị khác mặc định để URL ngắn. */
export function filtersToQuery(filters: ListFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.tab !== DEFAULT_FILTERS.tab) query.status = filters.tab;
  const q = filters.q.trim();
  if (q) query.q = q;
  if (filters.zone) query.zone = filters.zone;
  if (filters.category) query.category = filters.category;
  if (filters.verify) query.verify = filters.verify;
  if (filters.sort !== DEFAULT_FILTERS.sort) query.sort = filters.sort;
  return query;
}

/** Địa điểm có thuộc tab không. "Cần xác minh lại" là chỗ đang hiển thị quá 90 ngày chưa xác minh (cũng thuộc "Đang hiển thị"). */
export function inTab(row: AdminPlaceSummary, tab: ListTab, now: Date): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'stale':
      return row.status === 'active' && verificationStale(row.lastVerifiedAt, now);
    case 'inactive':
      return row.status === 'hidden' || row.status === 'closed';
    default:
      return row.status === tab;
  }
}

function matchesVerify(row: AdminPlaceSummary, verify: VerifyFilter): boolean {
  switch (verify) {
    case 'owner':
      return row.verifySource === 'owner';
    case 'facebook':
      return row.verifySource === 'admin' && row.category !== 'attraction';
    case 'public':
      return row.verifySource === 'admin' && row.category === 'attraction';
    case 'none':
      return row.verifySource === undefined;
  }
}

/**
 * Các bộ lọc trừ tab: từ khoá (tên, tên khác, không dấu; chỉ có ký tự đặc biệt thì coi như không có), cụm,
 * danh mục (chính hoặc phụ), nguồn xác nhận.
 */
export function matchesFilters(row: AdminPlaceSummary, filters: ListFilters): boolean {
  if (searchKey(filters.q) && matchScore(filters.q, row.name, row.aliases) === 0) return false;
  if (filters.zone === NO_ZONE ? row.zone !== undefined : filters.zone !== '' && row.zone !== filters.zone) return false;
  if (filters.category && !servesCategory(row, filters.category)) return false;
  if (filters.verify && !matchesVerify(row, filters.verify)) return false;
  return true;
}

/** Số địa điểm mỗi tab, sau các bộ lọc khác (không phụ thuộc tab đang chọn). */
export function tabCounts(rows: readonly AdminPlaceSummary[], filters: ListFilters, now: Date): Record<ListTab, number> {
  const counts: Record<ListTab, number> = { all: 0, draft: 0, active: 0, suspected: 0, stale: 0, inactive: 0 };
  for (const row of rows) {
    if (!matchesFilters(row, filters)) continue;
    for (const tab of ListTab.options) if (inTab(row, tab, now)) counts[tab]++;
  }
  return counts;
}

type Compare = (a: AdminPlaceSummary, b: AdminPlaceSummary) => number;
const collator = new Intl.Collator('vi');
const byName: Compare = (a, b) => collator.compare(a.name, b.name);
/** Chưa xác minh tính là xa nhất. */
const verifiedTime = (row: AdminPlaceSummary) => (row.lastVerifiedAt ? Date.parse(row.lastVerifiedAt) : -Infinity);
const COMPARE: Record<ListSort, Compare> = {
  updated: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || byName(a, b),
  name: byName,
  '-name': (a, b) => byName(b, a),
  // -Infinity trừ -Infinity ra NaN (falsy) nên hai chỗ chưa xác minh xếp theo tên.
  verified: (a, b) => verifiedTime(a) - verifiedTime(b) || byName(a, b),
  '-verified': (a, b) => verifiedTime(b) - verifiedTime(a) || byName(a, b),
};

/** Bản đã xếp (không đổi mảng gốc). */
export function sortRows(rows: readonly AdminPlaceSummary[], sort: ListSort): AdminPlaceSummary[] {
  return [...rows].sort(COMPARE[sort]);
}

/** Các dòng hiện ra: thuộc tab, khớp bộ lọc, đã xếp. */
export function visibleRows(rows: readonly AdminPlaceSummary[], filters: ListFilters, now: Date): AdminPlaceSummary[] {
  return sortRows(
    rows.filter((row) => inTab(row, filters.tab, now) && matchesFilters(row, filters)),
    filters.sort,
  );
}
```

Tạo `apps/admin/src/widgets/place-list/model/use-place-list.ts`:

```ts
import type { AdminPlaceSummary, CityPublic } from '@ranhduong/contracts';
import { ref, shallowRef } from 'vue';
import { fetchCity } from '@/entities/city/api/city';
import { fetchPlaces } from '@/entities/place/api/places';
import { toApiFailure, type ApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';

export type ListLoad = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string; login: boolean };

/** Câu báo khi không tải được danh sách. */
export function listLoadError(failure: ApiFailure): string {
  if (failure.status === 401) return 'Phiên đăng nhập đã hết, đăng nhập lại.';
  if (failure.status === 0) return 'Chưa kết nối được máy chủ.';
  return 'Chưa tải được danh sách địa điểm, thử lại.';
}

/** Tải danh sách địa điểm và các cụm của thành phố; `reload` sau mỗi lần đóng hộp thoại thao tác. */
export function usePlaceList() {
  const load = ref<ListLoad>({ kind: 'loading' });
  const rows = shallowRef<AdminPlaceSummary[]>([]);
  const zones = shallowRef<CityPublic['zones']>([]);
  /** Chỉ lần tải mới nhất được ghi kết quả (lần cũ về muộn thì bỏ). */
  let latest = 0;

  async function reload(): Promise<void> {
    const call = ++latest;
    try {
      const [city, items] = await Promise.all([fetchCity(CITY_SLUG), fetchPlaces(CITY_SLUG)]);
      if (call !== latest) return;
      zones.value = city.zones;
      rows.value = items;
      load.value = { kind: 'ready' };
    } catch (err) {
      if (call !== latest) return;
      const failure = toApiFailure(err);
      load.value = { kind: 'error', message: listLoadError(failure), login: failure.status === 401 };
    }
  }

  void reload();
  return { load, rows, zones, reload };
}
```

- [ ] **Step 4: Chạy test, typecheck, lint**

Run: `pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/widgets/place-list/model
git commit -m "feat: S07 filter, count, sort and load the admin place list"
```

---

### Task 6: Thao tác theo trạng thái và hộp thoại (feature `place-status`)

**Files:**
- Create: `apps/admin/src/features/place-status/model/actions.ts`, `actions.test.ts`
- Create: `apps/admin/src/features/place-status/ui/RdPlaceActionsDialog.vue`

**Interfaces:**
- Consumes: `canVerify`, `statusActionsFor`, `verificationStale`, `AdminPlaceSummary`, `AdminVerifySource`, `PlaceStatus`, `PlaceStatusAction` (contracts); `verifyPlace`, `changePlaceStatus`, `deletePlace` (Task 4); `statusChip`, `verifySourceOptions`, `placeDraftKey` (Task 4); `toApiFailure`, `failureMessages`, `ApiFailure` (shared/api/errors); `removeLocalDraft` (shared/lib/local-draft).
- Produces:
  - `STATUS_ACTION_LABEL`, `STATUS_ACTION_EXPLAIN: Record<PlaceStatusAction, string>`
  - `type PlaceAction = { kind: 'edit'; label } | { kind: 'verify'; label } | { kind: 'status'; action; label } | { kind: 'delete'; label }`
  - `type ActionRequest = { kind: 'verify'; verifySource } | { kind: 'status'; action } | { kind: 'delete' }`
  - `type DialogStep = { kind: 'menu' } | { kind: 'verify' } | { kind: 'status'; action } | { kind: 'delete' }`
  - `readyToVerify(row): boolean`, `primaryAction(row, now): PlaceAction`, `menuActions(row): PlaceAction[]`, `stepFor(action): DialogStep | null`, `doneMessage(name, previous: PlaceStatus, request): string`, `actionFailure(failure: ApiFailure): { messages: string[]; login: boolean }`
  - Component `RdPlaceActionsDialog` props `{ place: AdminPlaceSummary; start: DialogStep; now: Date }`, emits `done(message: string)`, `close()`

- [ ] **Step 1: Viết test (đỏ)**

Tạo `apps/admin/src/features/place-status/model/actions.test.ts`:

```ts
import type { AdminPlaceSummary } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { actionFailure, doneMessage, menuActions, primaryAction, readyToVerify, stepFor } from './actions';

const NOW = new Date('2026-10-08T03:00:00Z');
type Row = Pick<AdminPlaceSummary, 'status' | 'activationIssues' | 'lastVerifiedAt'>;
const row = (overrides: Partial<Row> = {}): Row => ({
  status: 'active',
  activationIssues: [],
  lastVerifiedAt: '2026-10-01T03:00:00.000Z',
  ...overrides,
});
const labels = (r: Row) => menuActions(r).map((a) => a.label);

describe('readyToVerify', () => {
  it('nháp chỉ thiếu nguồn xác nhận (hộp thoại sẽ chọn) hoặc không thiếu gì: được', () => {
    expect(readyToVerify(row({ status: 'draft', activationIssues: ['verify_source_missing'] }))).toBe(true);
    expect(readyToVerify(row({ status: 'draft' }))).toBe(true);
  });
  it('còn thiếu toạ độ, giờ, nguồn ảnh; hoặc đã ẩn, đã đóng: không được', () => {
    expect(readyToVerify(row({ status: 'draft', activationIssues: ['location_missing', 'verify_source_missing'] }))).toBe(false);
    expect(readyToVerify(row({ status: 'hidden' }))).toBe(false);
    expect(readyToVerify(row({ status: 'closed' }))).toBe(false);
  });
});

describe('primaryAction', () => {
  it('nháp: đủ thì Xác minh, thiếu thì Hoàn thiện (mở form)', () => {
    expect(primaryAction(row({ status: 'draft', activationIssues: ['verify_source_missing'] }), NOW)).toEqual({ kind: 'verify', label: 'Xác minh' });
    expect(primaryAction(row({ status: 'draft', activationIssues: ['hours_invalid'] }), NOW)).toEqual({ kind: 'edit', label: 'Hoàn thiện' });
  });
  it('đang hiển thị: còn hạn thì Sửa; quá 90 ngày thì Xác minh; dữ liệu hỏng thì Sửa', () => {
    expect(primaryAction(row(), NOW)).toEqual({ kind: 'edit', label: 'Sửa' });
    expect(primaryAction(row({ lastVerifiedAt: undefined }), NOW)).toEqual({ kind: 'verify', label: 'Xác minh' });
    expect(primaryAction(row({ lastVerifiedAt: undefined, activationIssues: ['photo_source_missing'] }), NOW)).toEqual({ kind: 'edit', label: 'Sửa' });
  });
  it('bị nghi ngờ: Xác minh (lát 1 chưa có báo cáo); đã ẩn: Hiện lại; đã đóng cửa: Mở lại', () => {
    expect(primaryAction(row({ status: 'suspected' }), NOW)).toEqual({ kind: 'verify', label: 'Xác minh' });
    expect(primaryAction(row({ status: 'hidden' }), NOW)).toEqual({ kind: 'status', action: 'unhide', label: 'Hiện lại' });
    expect(primaryAction(row({ status: 'closed' }), NOW)).toEqual({ kind: 'status', action: 'reopen', label: 'Mở lại' });
  });
});

describe('menuActions', () => {
  it('theo trạng thái; chỉ nháp mới có Xoá nháp', () => {
    expect(labels(row({ status: 'draft', activationIssues: ['verify_source_missing'] }))).toEqual(['Xác minh', 'Xoá nháp']);
    expect(labels(row({ status: 'draft', activationIssues: ['location_missing'] }))).toEqual(['Xoá nháp']);
    expect(labels(row())).toEqual(['Xác minh', 'Ẩn khỏi web', 'Đã đóng cửa']);
    expect(labels(row({ status: 'suspected' }))).toEqual(['Xác minh', 'Đã đóng cửa']);
    expect(labels(row({ status: 'hidden' }))).toEqual(['Hiện lại', 'Đã đóng cửa']);
    expect(labels(row({ status: 'closed' }))).toEqual(['Mở lại']);
  });
});

describe('stepFor', () => {
  it('mở form thì không cần hộp thoại; thao tác khác mở đúng bước', () => {
    expect(stepFor({ kind: 'edit', label: 'Sửa' })).toBeNull();
    expect(stepFor({ kind: 'verify', label: 'Xác minh' })).toEqual({ kind: 'verify' });
    expect(stepFor({ kind: 'status', action: 'hide', label: 'Ẩn khỏi web' })).toEqual({ kind: 'status', action: 'hide' });
    expect(stepFor({ kind: 'delete', label: 'Xoá nháp' })).toEqual({ kind: 'delete' });
  });
});

describe('doneMessage', () => {
  it('xác minh nháp thì nói đã hiện trên web; xác minh chỗ đang hiển thị thì không', () => {
    expect(doneMessage('Quán Giả Lập', 'draft', { kind: 'verify', verifySource: 'owner' })).toBe('Đã xác minh "Quán Giả Lập", chỗ này đang hiện trên web.');
    expect(doneMessage('Quán Giả Lập', 'active', { kind: 'verify', verifySource: 'owner' })).toBe('Đã xác minh "Quán Giả Lập".');
  });
  it('đổi trạng thái, xoá nháp', () => {
    expect(doneMessage('Quán Giả Lập', 'active', { kind: 'status', action: 'hide' })).toBe('Đã ẩn "Quán Giả Lập" khỏi web.');
    expect(doneMessage('Quán Giả Lập', 'closed', { kind: 'status', action: 'reopen' })).toBe('"Quán Giả Lập" đã mở lại và hiện trên web.');
    expect(doneMessage('Quán Giả Lập', 'draft', { kind: 'delete' })).toBe('Đã xoá nháp "Quán Giả Lập".');
  });
});

describe('actionFailure', () => {
  it('hết phiên thì kèm link đăng nhập lại; mất mạng', () => {
    expect(actionFailure({ status: 401, error: null })).toEqual({ messages: ['Phiên đăng nhập đã hết, đăng nhập lại rồi thử lại.'], login: true });
    expect(actionFailure({ status: 0, error: null })).toEqual({ messages: ['Chưa kết nối được máy chủ, thử lại sau.'], login: false });
  });
  it('lỗi API: câu chính và từng điều kiện còn thiếu; không đọc được thân lỗi thì câu chung', () => {
    const failure = {
      status: 400,
      error: {
        code: 'VALIDATION_FAILED' as const,
        message: 'Chưa đủ điều kiện để hiện trên web, mở form để hoàn thiện.',
        details: [{ code: 'hours_invalid', message: 'Chưa có giờ mở cửa' }],
      },
    };
    expect(actionFailure(failure)).toEqual({
      messages: ['Chưa đủ điều kiện để hiện trên web, mở form để hoàn thiện.', 'Chưa có giờ mở cửa'],
      login: false,
    });
    expect(actionFailure({ status: 500, error: null })).toEqual({ messages: ['Chưa làm được, thử lại.'], login: false });
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/admin test`
Expected: FAIL (`./actions` chưa có).

- [ ] **Step 3: Viết code**

Tạo `apps/admin/src/features/place-status/model/actions.ts`:

```ts
import {
  canVerify,
  statusActionsFor,
  verificationStale,
  type AdminPlaceSummary,
  type AdminVerifySource,
  type PlaceStatus,
  type PlaceStatusAction,
} from '@ranhduong/contracts';
import { failureMessages, type ApiFailure } from '@/shared/api/errors';

export const STATUS_ACTION_LABEL: Record<PlaceStatusAction, string> = {
  hide: 'Ẩn khỏi web',
  unhide: 'Hiện lại',
  close: 'Đã đóng cửa',
  reopen: 'Mở lại',
};

/** Giải thích trước khi bấm xác nhận (hộp thoại). Trang công khai của chỗ đã ẩn, đã đóng làm ở S11. */
export const STATUS_ACTION_EXPLAIN: Record<PlaceStatusAction, string> = {
  hide: 'Chỗ này thôi hiện trong danh sách, bản đồ và lịch trình. Đường dẫn vẫn được giữ; bấm Hiện lại để hiện như cũ.',
  unhide: 'Chỗ này hiện lại trên web với thông tin đang có.',
  close: 'Trang của chỗ này vẫn giữ và ghi "Đã đóng cửa"; chỗ này thôi hiện trong danh sách, bản đồ và lịch trình. Mở cửa lại thì bấm Mở lại.',
  reopen: 'Chỗ này hiện lại trên web. Nếu đã lâu chưa xác minh, nên xác minh lại giờ mở cửa.',
};

/** Thao tác trên một dòng: mở form, xác minh, đổi trạng thái, xoá nháp. */
export type PlaceAction =
  | { kind: 'edit'; label: string }
  | { kind: 'verify'; label: string }
  | { kind: 'status'; action: PlaceStatusAction; label: string }
  | { kind: 'delete'; label: string };

/** Request gửi lên API khi bấm nút xác nhận trong hộp thoại. */
export type ActionRequest = { kind: 'verify'; verifySource: AdminVerifySource } | { kind: 'status'; action: PlaceStatusAction } | { kind: 'delete' };

/** Bước đang hiện trong hộp thoại. */
export type DialogStep = { kind: 'menu' } | { kind: 'verify' } | { kind: 'status'; action: PlaceStatusAction } | { kind: 'delete' };

type Row = Pick<AdminPlaceSummary, 'status' | 'activationIssues' | 'lastVerifiedAt'>;

const VERIFY: PlaceAction = { kind: 'verify', label: 'Xác minh' };
const DELETE: PlaceAction = { kind: 'delete', label: 'Xoá nháp' };
const statusAction = (action: PlaceStatusAction): PlaceAction => ({ kind: 'status', action, label: STATUS_ACTION_LABEL[action] });

/** Xác minh ngay trong danh sách được: trạng thái cho phép và chỉ còn thiếu (nếu có) nguồn xác nhận, vì hộp thoại chọn nguồn. */
export function readyToVerify(row: Pick<AdminPlaceSummary, 'status' | 'activationIssues'>): boolean {
  return canVerify(row.status) && row.activationIssues.every((code) => code === 'verify_source_missing');
}

/**
 * Nút chính của dòng (ui-spec mục 12): nháp thiếu thông tin thì Hoàn thiện, nháp đủ thì Xác minh; đang hiển thị quá 90 ngày
 * thì Xác minh, còn lại Sửa; bị nghi ngờ thì Xác minh (lát 1 chưa có báo cáo để xem); đã ẩn thì Hiện lại; đã đóng thì Mở lại.
 */
export function primaryAction(row: Row, now: Date): PlaceAction {
  switch (row.status) {
    case 'draft':
      return readyToVerify(row) ? VERIFY : { kind: 'edit', label: 'Hoàn thiện' };
    case 'active':
      return verificationStale(row.lastVerifiedAt, now) && readyToVerify(row) ? VERIFY : { kind: 'edit', label: 'Sửa' };
    case 'suspected':
      return readyToVerify(row) ? VERIFY : { kind: 'edit', label: 'Sửa' };
    case 'hidden':
      return statusAction('unhide');
    case 'closed':
      return statusAction('reopen');
    case 'merged':
      return { kind: 'edit', label: 'Sửa' };
  }
}

/** Các thao tác trong hộp thoại "Thao tác khác": xác minh (khi được), đổi trạng thái, xoá (chỉ nháp). */
export function menuActions(row: Pick<AdminPlaceSummary, 'status' | 'activationIssues'>): PlaceAction[] {
  return [...(readyToVerify(row) ? [VERIFY] : []), ...statusActionsFor(row.status).map(statusAction), ...(row.status === 'draft' ? [DELETE] : [])];
}

/** Bước mở hộp thoại cho một thao tác; mở form thì không cần hộp thoại (null). */
export function stepFor(action: PlaceAction): DialogStep | null {
  switch (action.kind) {
    case 'edit':
      return null;
    case 'verify':
      return { kind: 'verify' };
    case 'status':
      return { kind: 'status', action: action.action };
    case 'delete':
      return { kind: 'delete' };
  }
}

/** Câu báo sau khi làm xong, hiện ở đầu danh sách. */
export function doneMessage(name: string, previous: PlaceStatus, request: ActionRequest): string {
  switch (request.kind) {
    case 'verify':
      return previous === 'active' ? `Đã xác minh "${name}".` : `Đã xác minh "${name}", chỗ này đang hiện trên web.`;
    case 'delete':
      return `Đã xoá nháp "${name}".`;
    case 'status': {
      const messages: Record<PlaceStatusAction, string> = {
        hide: `Đã ẩn "${name}" khỏi web.`,
        unhide: `"${name}" đã hiện lại trên web.`,
        close: `Đã đánh dấu "${name}" đã đóng cửa.`,
        reopen: `"${name}" đã mở lại và hiện trên web.`,
      };
      return messages[request.action];
    }
  }
}

export interface ActionFailure {
  messages: string[];
  /** Hiện link đăng nhập lại. */
  login: boolean;
}

/** Câu lỗi khi thao tác không xong: hết phiên, mất mạng, hoặc lỗi API (kèm điều kiện còn thiếu). */
export function actionFailure(failure: ApiFailure): ActionFailure {
  if (failure.status === 401) return { messages: ['Phiên đăng nhập đã hết, đăng nhập lại rồi thử lại.'], login: true };
  if (failure.status === 0) return { messages: ['Chưa kết nối được máy chủ, thử lại sau.'], login: false };
  const messages = failureMessages(failure);
  return { messages: messages.length > 0 ? messages : ['Chưa làm được, thử lại.'], login: false };
}
```

Tạo `apps/admin/src/features/place-status/ui/RdPlaceActionsDialog.vue`:

```vue
<script setup lang="ts">
import type { AdminPlaceSummary, AdminVerifySource } from '@ranhduong/contracts';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { changePlaceStatus, deletePlace, verifyPlace } from '@/entities/place/api/places';
import { placeDraftKey } from '@/entities/place/model/draft-key';
import { statusChip } from '@/entities/place/model/status';
import { verifySourceOptions } from '@/entities/place/model/verify-options';
import { toApiFailure } from '@/shared/api/errors';
import { removeLocalDraft } from '@/shared/lib/local-draft';
import {
  actionFailure,
  doneMessage,
  menuActions,
  STATUS_ACTION_EXPLAIN,
  STATUS_ACTION_LABEL,
  stepFor,
  type ActionFailure,
  type ActionRequest,
  type DialogStep,
  type PlaceAction,
} from '../model/actions';

const props = defineProps<{ place: AdminPlaceSummary; start: DialogStep; now: Date }>();
const emit = defineEmits<{ done: [message: string]; close: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);
const step = ref<DialogStep>(props.start);
const busy = ref(false);
const failure = ref<ActionFailure | null>(null);
/** Nguồn đang chọn khi xác minh: mặc định là nguồn đã lưu (nếu là owner hoặc admin). */
const source = ref<AdminVerifySource | ''>(props.place.verifySource === 'owner' || props.place.verifySource === 'admin' ? props.place.verifySource : '');

const chip = computed(() => statusChip(props.place, props.now));
const actions = computed(() => menuActions(props.place));
const verifyOptions = computed(() => verifySourceOptions(props.place.category));
const confirmLabel = computed(() => {
  const current = step.value;
  if (current.kind === 'verify') return 'Đã xác minh';
  if (current.kind === 'status') return STATUS_ACTION_LABEL[current.action];
  return 'Xoá hẳn';
});

onMounted(() => dialog.value?.showModal());

function go(action: PlaceAction): void {
  failure.value = null;
  step.value = stepFor(action) ?? { kind: 'menu' };
}

async function submit(request: ActionRequest): Promise<void> {
  busy.value = true;
  failure.value = null;
  const id = props.place.id;
  try {
    if (request.kind === 'verify') await verifyPlace(id, request.verifySource);
    else if (request.kind === 'status') await changePlaceStatus(id, request.action);
    else {
      await deletePlace(id);
      removeLocalDraft(placeDraftKey(id));
    }
    emit('done', doneMessage(props.place.name, props.place.status, request));
    dialog.value?.close();
  } catch (err) {
    failure.value = actionFailure(toApiFailure(err));
  } finally {
    busy.value = false;
  }
}

// Trong hàm xử lý sự kiện, TypeScript không giữ phép thu hẹp của v-if nên đọc lại bước hiện tại ở đây.
function confirm(): void {
  const current = step.value;
  if (current.kind === 'verify' && source.value) void submit({ kind: 'verify', verifySource: source.value });
  else if (current.kind === 'status') void submit({ kind: 'status', action: current.action });
  else if (current.kind === 'delete') void submit({ kind: 'delete' });
}

function close(): void {
  dialog.value?.close();
}

/** Đang gửi thì Esc không đóng (kết quả chưa về). */
function onCancel(event: Event): void {
  if (busy.value) event.preventDefault();
}
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="place-actions-title" @close="emit('close')" @cancel="onCancel">
    <div class="body">
      <header class="head">
        <h2 id="place-actions-title" class="title">{{ place.name }}</h2>
        <span :class="['rd-status', chip.className]">{{ chip.label }}</span>
      </header>

      <div v-if="failure" class="rd-callout rd-callout--bad" role="alert">
        <p v-for="(message, i) in failure.messages" :key="i" class="line">{{ message }}</p>
        <RouterLink v-if="failure.login" :to="{ path: '/dang-nhap', query: { returnTo: '/dia-diem' } }">Đăng nhập lại</RouterLink>
      </div>

      <template v-if="step.kind === 'menu'">
        <ul v-if="actions.length > 0" class="menu">
          <li v-for="action in actions" :key="action.label">
            <button type="button" class="rd-btn rd-btn--outline" @click="go(action)">{{ action.label }}</button>
          </li>
        </ul>
        <div class="actions">
          <RouterLink class="rd-btn rd-btn--outline" :to="`/dia-diem/${place.id}`">Mở form để sửa</RouterLink>
          <button type="button" class="rd-btn rd-btn--outline" @click="close">Đóng</button>
        </div>
      </template>

      <form v-else class="step" @submit.prevent="confirm">
        <template v-if="step.kind === 'verify'">
          <p class="line">
            Bạn đã kiểm lại giờ mở cửa, địa chỉ, giá và thấy còn đúng. Ngày xác minh lần cuối sẽ là hôm nay.
            <template v-if="place.status !== 'active'">Sau khi xác minh, chỗ này hiện trên web.</template>
          </p>
          <fieldset class="rd-field">
            <legend class="rd-field__label">Nguồn xác nhận</legend>
            <label v-for="option in verifyOptions" :key="option.value" class="rd-choice rd-choice--block">
              <input v-model="source" type="radio" name="verify-source" :value="option.value" />
              <span class="option">
                <span>{{ option.label }}</span>
                <span class="rd-field__hint">{{ option.hint }}</span>
              </span>
            </label>
          </fieldset>
        </template>
        <p v-else-if="step.kind === 'status'" class="line">{{ STATUS_ACTION_EXPLAIN[step.action] }}</p>
        <p v-else class="line">
          Xoá hẳn nháp "{{ place.name }}"? Mọi thông tin đã nhập sẽ mất, không khôi phục được. Nháp chưa từng hiện trên web nên không
          ảnh hưởng đường dẫn nào.
        </p>
        <div class="actions">
          <button type="submit" class="rd-btn rd-btn--primary" :disabled="busy || (step.kind === 'verify' && !source)">{{ confirmLabel }}</button>
          <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="close">Huỷ</button>
        </div>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  box-sizing: border-box;
  width: min(480px, calc(100vw - 2 * var(--page-gutter)));
  max-height: calc(100vh - 2 * var(--page-gutter));
  padding: 0;
  border: var(--border);
  border-radius: var(--radius-card);
  background: var(--paper-raised);
  color: var(--ink);
}
.dialog::backdrop { background: color-mix(in srgb, var(--ink) 45%, transparent); }
.body { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5); }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.title { margin: 0; font: 700 20px/1.3 var(--font-display); overflow-wrap: anywhere; }
.menu { display: flex; flex-direction: column; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.menu .rd-btn { width: 100%; }
.step { display: flex; flex-direction: column; gap: var(--space-4); }
.option { display: flex; flex-direction: column; gap: 2px; }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.line { margin: 0; }
</style>
```

- [ ] **Step 4: Chạy test, typecheck, lint**

Run: `pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/place-status
git commit -m "feat: S07 add place status actions and dialog to admin"
```

---

### Task 7: Trang danh sách `/dia-diem`

**Files:**
- Create: `apps/admin/src/widgets/place-list/ui/RdPlaceList.vue`
- Modify: `apps/admin/src/pages/PlacesPage.vue` (thay toàn bộ)
- Modify: `apps/admin/src/app/router.ts`

**Interfaces:**
- Consumes: mọi thứ của Task 4, 5, 6; `CATEGORY_LABEL`, `PlaceCategory` (contracts).
- Produces: component `RdPlaceList` (không props); trang `/dia-diem` dùng nó.

Không ép TDD (trang hiển thị, layout): kiểm bằng typecheck, lint và trình duyệt ở Task 8 Step 3.

- [ ] **Step 1: Router không hỏi lại phiên khi chỉ đổi query trên cùng trang**

Bộ lọc ghi vào query bằng `router.replace` mỗi lần gõ; guard hiện tại gọi `/auth/session` ở mọi lần chuyển, tức một request mỗi phím. `apps/admin/src/app/router.ts`: đổi guard thành

```ts
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

- [ ] **Step 2: Widget `RdPlaceList`**

Tạo `apps/admin/src/widgets/place-list/ui/RdPlaceList.vue`:

```vue
<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, type AdminPlaceSummary } from '@ranhduong/contracts';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { statusChip, verifySourceLabel } from '@/entities/place/model/status';
import { primaryAction, stepFor, type DialogStep, type PlaceAction } from '@/features/place-status/model/actions';
import RdPlaceActionsDialog from '@/features/place-status/ui/RdPlaceActionsDialog.vue';
import { daysAgoText } from '@/shared/lib/time';
import { filtersFromQuery, filtersToQuery, LIST_TABS, NO_ZONE, tabCounts, VERIFY_FILTERS, visibleRows, type ListFilters, type ListSort } from '../model/filters';
import { usePlaceList } from '../model/use-place-list';

const route = useRoute();
const router = useRouter();
const { load, rows, zones, reload } = usePlaceList();

/** Bộ lọc ghi vào query URL; quay lại từ form thì trang dựng lại từ query nên giữ nguyên. */
const filters = ref<ListFilters>(filtersFromQuery(route.query));
watch(filters, (value) => void router.replace({ query: filtersToQuery(value) }), { deep: true });

/** Mốc cho "Cần xác minh lại" và "N ngày trước"; lấy lại mỗi lần tải danh sách. */
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
    zone: row.zone ? (zoneNames.value.get(row.zone) ?? row.zone) : 'Chưa chọn',
    verify: verifySourceLabel(row.category, row.verifySource),
    verified: row.lastVerifiedAt ? daysAgoText(row.lastVerifiedAt, now.value) : 'Chưa xác minh',
  })),
);

const SORT_COLUMNS = { name: ['name', '-name'], verified: ['verified', '-verified'] } as const satisfies Record<string, readonly [ListSort, ListSort]>;
type SortColumn = keyof typeof SORT_COLUMNS;
function sortBy(column: SortColumn): void {
  const [ascending, descending] = SORT_COLUMNS[column];
  filters.value.sort = filters.value.sort === ascending ? descending : ascending;
}
function ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
  const [ascending, descending] = SORT_COLUMNS[column];
  if (filters.value.sort === ascending) return 'ascending';
  return filters.value.sort === descending ? 'descending' : 'none';
}
const SORT_MARK = { ascending: '↑', descending: '↓', none: '' } as const;

const notice = ref<string | null>(null);
const dialog = ref<{ place: AdminPlaceSummary; start: DialogStep } | null>(null);

function openDialog(place: AdminPlaceSummary, start: DialogStep): void {
  notice.value = null;
  dialog.value = { place, start };
}
function onPrimary(place: AdminPlaceSummary, action: PlaceAction): void {
  const step = stepFor(action);
  if (step) openDialog(place, step);
}
function onDone(message: string): void {
  notice.value = message;
}
/** Đóng hộp thoại (xong hay huỷ) thì tải lại để số đếm, trạng thái luôn mới. */
function onDialogClose(): void {
  dialog.value = null;
  void reload();
}
</script>

<template>
  <div class="place-list">
    <p v-if="notice" class="rd-callout rd-callout--ok" role="status">{{ notice }}</p>

    <div class="tabs" role="group" aria-label="Lọc theo trạng thái">
      <button
        v-for="tab in LIST_TABS"
        :key="tab.value"
        type="button"
        class="rd-chip rd-chip--filter"
        :aria-pressed="filters.tab === tab.value"
        @click="filters.tab = tab.value"
      >
        {{ tab.label }} <span class="count">{{ counts[tab.value] }}</span>
      </button>
    </div>

    <div class="filters">
      <div class="rd-field search">
        <label class="rd-field__label" for="place-list-q">Tìm theo tên</label>
        <input id="place-list-q" v-model="filters.q" class="rd-input" type="search" autocomplete="off" placeholder="Tên hoặc tên khác, gõ không dấu được" />
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="place-list-zone">Cụm</label>
        <select id="place-list-zone" v-model="filters.zone" class="rd-input">
          <option value="">Mọi cụm</option>
          <option v-for="zone in zones" :key="zone.slug" :value="zone.slug">{{ zone.name }}</option>
          <option :value="NO_ZONE">Chưa chọn cụm</option>
        </select>
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="place-list-category">Danh mục</label>
        <select id="place-list-category" v-model="filters.category" class="rd-input">
          <option value="">Mọi danh mục</option>
          <option v-for="category in PlaceCategory.options" :key="category" :value="category">{{ CATEGORY_LABEL[category] }}</option>
        </select>
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="place-list-verify">Nguồn xác nhận</label>
        <select id="place-list-verify" v-model="filters.verify" class="rd-input">
          <option value="">Mọi nguồn xác nhận</option>
          <option v-for="option in VERIFY_FILTERS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
    </div>

    <p v-if="load.kind === 'loading'" class="rd-quiet" aria-busy="true">Đang tải danh sách…</p>
    <div v-else-if="load.kind === 'error'" class="rd-callout rd-callout--bad" role="alert">
      <p class="line">{{ load.message }}</p>
      <RouterLink v-if="load.login" :to="{ path: '/dang-nhap', query: { returnTo: route.fullPath } }">Đăng nhập lại</RouterLink>
      <button v-else type="button" class="rd-btn rd-btn--outline" @click="reload">Thử lại</button>
    </div>
    <template v-else>
      <p class="rd-quiet" aria-live="polite">Đang hiện {{ items.length }} trong {{ rows.length }} địa điểm</p>
      <p v-if="rows.length === 0" class="empty">Chưa có địa điểm nào. Bấm "Thêm địa điểm" để nhập chỗ đầu tiên.</p>
      <p v-else-if="items.length === 0" class="empty">Không có địa điểm nào khớp bộ lọc.</p>
      <div v-else class="table-box">
        <table class="table">
          <thead>
            <tr>
              <th :aria-sort="ariaSort('name')">
                <button type="button" class="sort" @click="sortBy('name')">Tên <span aria-hidden="true">{{ SORT_MARK[ariaSort('name')] }}</span></button>
              </th>
              <th>Danh mục</th>
              <th>Cụm</th>
              <th>Trạng thái</th>
              <th>Xác nhận</th>
              <th :aria-sort="ariaSort('verified')">
                <button type="button" class="sort" @click="sortBy('verified')">
                  Xác minh lần cuối <span aria-hidden="true">{{ SORT_MARK[ariaSort('verified')] }}</span>
                </button>
              </th>
              <th>Ảnh</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.row.id">
              <td>
                <RouterLink class="name" :to="`/dia-diem/${item.row.id}`">{{ item.row.name }}</RouterLink>
                <div v-if="item.row.aliases.length > 0" class="rd-quiet">{{ item.row.aliases.join('; ') }}</div>
              </td>
              <td>{{ item.categories }}</td>
              <td>{{ item.zone }}</td>
              <td><span :class="['rd-status', item.chip.className]">{{ item.chip.label }}</span></td>
              <td>{{ item.verify }}</td>
              <td class="rd-quiet">{{ item.verified }}</td>
              <td>{{ item.row.photoCount }}</td>
              <td class="row-actions">
                <RouterLink v-if="item.primary.kind === 'edit'" class="rd-btn rd-btn--outline" :to="`/dia-diem/${item.row.id}`">{{ item.primary.label }}</RouterLink>
                <button v-else type="button" class="rd-btn rd-btn--outline" @click="onPrimary(item.row, item.primary)">{{ item.primary.label }}</button>
                <button type="button" class="rd-icon-btn" :aria-label="`Thao tác khác: ${item.row.name}`" @click="openDialog(item.row, { kind: 'menu' })">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <RdPlaceActionsDialog
      v-if="dialog"
      :key="dialog.place.id"
      :place="dialog.place"
      :start="dialog.start"
      :now="now"
      @done="onDone"
      @close="onDialogClose"
    />
  </div>
</template>

<style scoped>
.place-list { display: flex; flex-direction: column; gap: var(--space-4); }
.tabs { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.count { font-weight: 500; }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3); }
.filters .rd-field { flex: 1 1 180px; }
.filters .search { flex: 2 1 260px; }
.line { margin: 0; }
.empty { margin: 0; padding: var(--space-5); text-align: center; color: var(--ink-soft); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
/* Bảng rộng cuộn ngang trong khung của nó; trang không cuộn ngang ở 390px. */
.table-box { overflow-x: auto; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
.table { width: 100%; border-collapse: collapse; font: 400 14px/1.4 var(--font-body); }
.table th { padding: 10px 12px; border-bottom: var(--border); text-align: left; font-size: 13px; font-weight: 600; color: var(--ink-soft); white-space: nowrap; }
.table td { padding: 6px 12px; border-bottom: var(--border-hair) solid var(--mist); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: 0; }
.name { display: inline-flex; align-items: center; min-height: var(--tap-min); color: var(--ink); font-weight: 700; }
.sort { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--tap-min); padding: 0; border: 0; background: none; font: inherit; color: inherit; cursor: pointer; }
.row-actions { white-space: nowrap; text-align: right; }
.row-actions > * { vertical-align: middle; }
.row-actions > * + * { margin-left: var(--space-2); }
</style>
```

- [ ] **Step 3: Trang `/dia-diem`**

Thay toàn bộ `apps/admin/src/pages/PlacesPage.vue` bằng:

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import RdPlaceList from '@/widgets/place-list/ui/RdPlaceList.vue';
</script>

<template>
  <div class="page">
    <header class="head">
      <h1 class="title">Địa điểm</h1>
      <RouterLink class="rd-btn rd-btn--primary" to="/dia-diem/moi">Thêm địa điểm</RouterLink>
    </header>
    <RdPlaceList />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--space-5); }
.head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.title { margin: 0; font: 700 28px/1.2 var(--font-display); }
</style>
```

- [ ] **Step 4: Typecheck, lint, test, build**

Run: `pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/widgets/place-list/ui/RdPlaceList.vue apps/admin/src/pages/PlacesPage.vue apps/admin/src/app/router.ts
git commit -m "feat: S07 add place list page to admin"
```

---

### Task 8: Tài liệu, kiểm toàn bộ, thử trên trình duyệt

**Files:**
- Modify: `docs/backlog.md`, `docs/decisions.md`, `docs/technical-design.md`, `docs/ui-spec.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: mọi task trước.
- Produces: tài liệu khớp code.

- [ ] **Step 1: Cập nhật tài liệu**

`docs/backlog.md`, dòng S07 trong bảng mục 4:
- Cột tiêu chí: thay "hành động theo trạng thái (Hoàn thiện, Xác minh, Xem báo cáo)" bằng "hành động theo trạng thái (Hoàn thiện, Xác minh, Xem báo cáo; lát 1 chỗ bị nghi ngờ dùng Xác minh vì chưa có báo cáo); xoá hẳn nháp, ẩn, hiện lại, đánh dấu đã đóng cửa, mở lại (chủ dự án chọn 2026-10-08; gộp làm sau)".
- Cột trạng thái: thay "Chưa làm" bằng "Code xong (nhánh `feat/S07-place-list`, chưa mở PR); chờ thử staging (S02)".

`docs/decisions.md`, thêm vào cuối bảng:

```markdown
| 2026-10-08 | Xoá hẳn chỉ cho nháp (`DELETE /v1/admin/places/:id`, điều kiện `status: draft` nằm trong câu lệnh xoá); địa điểm đã công khai dùng Ẩn, Hiện lại, Đã đóng cửa, Mở lại (`POST /v1/admin/places/:id/status`, `PlaceStatusAction`); gộp làm sau S07 | Chủ dự án chọn: nháp chưa từng có URL công khai nên xoá không gãy link (ADR 0010), dọn được nháp thử và nháp OSM rác. Chưa kiểm nháp có nằm trong lịch trình mẫu (S15 thêm khi soạn được lịch trình); S06 xoá ảnh R2 của nháp bị xoá |
| 2026-10-08 | Đổi trạng thái địa điểm thêm ngoài sơ đồ cũ: active → closed, hidden → active (Hiện lại), hidden → closed; mọi chuyển sang active (xác minh, hiện lại, mở lại) kiểm `activationIssues`; chuyển trạng thái là `findOneAndUpdate` theo `status` và `updatedAt` (`PlaceStatusService`), bấm lại thao tác đã xong thì trả trạng thái hiện tại | Lát 1 chưa có báo cáo đóng cửa nên admin tự đánh dấu từ chỗ đang hiển thị; hai tab hay bấm hai lần không báo lỗi giả; chỗ công khai luôn đủ điều kiện kích hoạt |
| 2026-10-08 | "Đã xác minh" trong danh sách: `POST /v1/admin/places/:id/verify` `{ verifySource }` đặt `lastVerifiedAt` là lúc bấm; nháp (đủ điều kiện trừ nguồn xác nhận) và chỗ bị nghi ngờ thành active, `suspicionScore` về 0. "Cần xác minh lại" = active quá 90 ngày chưa xác minh hoặc chưa xác minh lần nào (`verificationStale`, `VERIFY_MAX_AGE_DAYS` trong contracts, S11 dùng lại) | Backlog S07; technical-design mục 7 dùng mốc 90 ngày |
| 2026-10-08 | Danh sách admin: `GET /v1/admin/cities/:city/places` trả mọi địa điểm chưa gộp (`AdminPlaceSummary`, kèm mã điều kiện kích hoạt còn thiếu); lọc, đếm tab, tìm không dấu, xếp làm trong trình duyệt; bộ lọc giữ trong query URL; thêm tab "Ẩn hoặc đã đóng"; chỗ bị nghi ngờ hiện nút "Xác minh" thay "Xem báo cáo" tới lát 3; router admin không hỏi lại phiên khi chỉ đổi query trên cùng trang | Vài trăm điểm mỗi thành phố nên lọc tức thì, không cần query API; quay lại từ form giữ bộ lọc; chỗ đã ẩn, đã đóng cần chỗ để tìm lại; gõ tìm không gọi `/auth/session` mỗi phím |
```

`docs/technical-design.md`:
- Mục 4, khối `sg_place`: thay

```text
    pl_active -->|"admin ẩn"| pl_hidden["hidden"]
```

bằng

```text
    pl_active -->|"admin ẩn"| pl_hidden["hidden"]
    pl_hidden -->|"admin hiện lại"| pl_active
    pl_active -->|"admin đánh dấu đóng"| pl_closed
    pl_hidden -->|"admin đánh dấu đóng"| pl_closed
    pl_closed -->|"admin mở lại"| pl_active
```

- Mục 4, đoạn sau sơ đồ: thêm câu cuối "Nháp không ẩn hay đóng mà xoá hẳn được (S07, chỉ khi còn là nháp); mọi chuyển sang `active` kiểm điều kiện kích hoạt."
- Mục 6, bảng **Quản trị**: thêm sau dòng `| GET | \`/admin/cities/:city/zones/suggest?lng=&lat=\` | Cụm gợi ý cho điểm ghim |` các dòng:

```markdown
| GET | `/admin/cities/:city/places` | Mọi địa điểm chưa gộp cho danh sách admin (S07), kèm mã điều kiện kích hoạt còn thiếu |
| POST | `/admin/places/:id/verify` | Body `{ verifySource }`; đặt `lastVerifiedAt`; nháp, chỗ bị nghi ngờ thành active (S07) |
| POST | `/admin/places/:id/status` | Body `{ action: hide \| unhide \| close \| reopen }` (S07) |
| DELETE | `/admin/places/:id` | Xoá hẳn, chỉ nháp (S07) |
```

`docs/ui-spec.md`, mục 12, dòng "Danh sách địa điểm": thay cột nội dung bằng "Tab trạng thái có số đếm (Tất cả, Nháp, Đang hiển thị, Bị nghi ngờ, Cần xác minh lại, Ẩn hoặc đã đóng); tìm theo tên và tên khác, không dấu; lọc cụm (cả "Chưa chọn cụm"), danh mục (tính cả danh mục phụ), nguồn xác nhận; bảng tên, danh mục, cụm, trạng thái, xác nhận, xác minh lần cuối, số ảnh, bấm Tên hoặc Xác minh lần cuối để xếp; nút chính theo trạng thái (Sửa, Hoàn thiện, Xác minh, Hiện lại, Mở lại; Xem báo cáo ở lát 3) và hộp thoại Thao tác khác (Xác minh, Ẩn khỏi web, Đã đóng cửa, Xoá nháp)".

`CLAUDE.md`, mục Trạng thái, dòng "Xong": thêm vào cuối (trước dấu chấm) `, S07 (danh sách \`/dia-diem\` trong admin: tab trạng thái có số đếm, tìm, lọc, xếp; Đã xác minh, ẩn, hiện lại, đã đóng cửa, mở lại, xoá hẳn nháp; chờ thử staging)`.

- [ ] **Step 2: Kiểm toàn bộ**

Run: `pnpm infra:up && pnpm turbo run lint typecheck test build --continue`
Expected: PASS mọi package. Nếu chỉ `@ranhduong/web#lint` lỗi ở `apps/web/prelaunch/.wrangler/verify-ui.mjs` (file local đã gitignore, không thuộc S07) thì ghi lại, không sửa trong S07.

- [ ] **Step 3: Thử trên trình duyệt**

Chạy `pnpm dev`, đăng nhập admin (runbook `docs/runbooks/admin-login.md`), mở `http://localhost:5174/dia-diem`. Dữ liệu thử đặt tên rõ là giả ("Quán Thử Giả Lập…").

Desktop 1280×800:
1. Thấy 6 tab có số, 4 ô lọc có nhãn, bảng đủ 8 cột; không lỗi trong console.
2. "Thêm địa điểm" → lưu nháp "Quán Thử Giả Lập Một" (chỉ tên, danh mục Cà phê) → quay lại danh sách: dòng "Nháp", nút "Hoàn thiện" mở form; "Thao tác khác" chỉ có "Xoá nháp" và "Mở form để sửa". Xoá nháp → hộp thoại hỏi lại → "Xoá hẳn": dòng biến mất, có thông báo "Đã xoá nháp…", số tab "Nháp" giảm.
3. Tạo nháp "Quán Thử Giả Lập Hai": ghim, dán giờ `T2-CN 07:00-22:00`, chưa chọn nguồn xác nhận, danh mục phụ Ăn uống. Danh sách: nút chính "Xác minh" → hộp thoại có hai lựa chọn của quán (Quán đã xác nhận, Chỉ dựa trên Facebook), nút "Đã xác minh" tắt khi chưa chọn → chọn "Chỉ dựa trên Facebook" → dòng thành "Đang hiển thị", Xác nhận "Chỉ dựa trên Facebook", Xác minh lần cuối "Hôm nay".
4. "Thao tác khác" → "Ẩn khỏi web" → xác nhận: chip "Đã ẩn", tab "Ẩn hoặc đã đóng" tăng; nút chính "Hiện lại" → về "Đang hiển thị". Làm tương tự "Đã đóng cửa" rồi "Mở lại".
5. Đặt ngày xác minh cũ: `docker compose exec mongo mongosh ranhduong --quiet --eval 'db.places.updateOne({ name: "Quán Thử Giả Lập Hai" }, { $set: { lastVerifiedAt: new Date(Date.now() - 100 * 86400000) } })'`, bấm "Thử lại" hoặc tải lại trang: chip "Cần xác minh lại" (màu vàng), tab "Cần xác minh lại" có 1, nút chính "Xác minh".
6. Gõ "quan thu gia lap hai" (không dấu) → ra đúng dòng; lọc Danh mục "Ăn uống" vẫn thấy (danh mục phụ); Cụm "Chưa chọn cụm" nếu chưa chọn cụm; URL có `?q=…&category=food`. Bấm tên mở form rồi Back: bộ lọc và từ khoá còn nguyên.
7. Bấm "Tên" hai lần: mũi tên ↑ rồi ↓, thứ tự đảo; bấm "Xác minh lần cuối": chỗ chưa xác minh lên đầu.
8. Bàn phím: Tab tới nút "Thao tác khác", Enter mở hộp thoại, Esc đóng, focus về lại nút.
9. Tắt API (Ctrl+C ở tiến trình API) rồi bấm một thao tác: hộp thoại báo "Chưa kết nối được máy chủ…", không đóng; bật lại API.

Điện thoại 390×844 (Chrome DevTools):
10. `document.documentElement.scrollWidth` bằng 390 (không cuộn ngang trang); tab và ô lọc xuống dòng; bảng cuộn ngang trong khung; hộp thoại vừa màn hình, nút cao từ 44px.

Dọn dữ liệu thử: xoá các nháp còn lại bằng nút "Xoá nháp"; chỗ đã kích hoạt thì `docker compose exec mongo mongosh ranhduong --quiet --eval 'db.places.deleteMany({ name: /^Quán Thử Giả Lập/ })'`.

- [ ] **Step 4: Commit**

```bash
git add docs/backlog.md docs/decisions.md docs/technical-design.md docs/ui-spec.md CLAUDE.md
git commit -m "docs: S07 record place list, verify and status rules"
```

- [ ] **Step 5: Báo chủ dự án**

Báo các commit, kết quả Step 2 và Step 3, những gì còn chờ (staging S02, điện thoại thật), và các việc đã ghi cho story sau: S06 xoá ảnh R2 khi xoá nháp; S11 trang công khai của chỗ đã ẩn, đã đóng cửa và cảnh báo 90 ngày dùng `verificationStale`; S15 chặn xoá nháp đang nằm trong lịch trình mẫu; gộp địa điểm sau S06, S08; "Xem báo cáo" ở lát 3.
