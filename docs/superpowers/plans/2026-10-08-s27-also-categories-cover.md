# S27 Danh mục phụ và mức mái che: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quán vừa cà phê vừa ăn uống hiện ở cả trang Cà phê lẫn trang Ăn uống (danh mục chính + tối đa 2 danh mục phụ); mục "Trong nhà hay ngoài trời" thành mức mái che ba mức (che hết, một phần, không che) để biết trời mưa có ngồi được không.

**Architecture:** Luật nằm ở `packages/contracts`: `alsoCategories` (tối đa 2, khác danh mục chính), `cover` (`full | partial | none`, thay `indoor`), hàm `servesCategory`, `rainSafe`, `hasOpenAir`, nhãn `COVER_LABEL`. API lọc danh sách theo danh mục chính hoặc phụ (`$or`), thẻ địa điểm có thêm `alsoCategories`, tìm không dấu so cả nhãn danh mục phụ. Web ghi "Cà phê, Ăn uống · Trung tâm" trên thẻ. Form admin có nhóm "Cũng phục vụ" và mục "Mái che". Tài liệu ghi luật cho các story sau (S11, S12, S15, S17, S21, S24).

**Tech Stack:** Zod 4, NestJS 12, Mongoose 9, Vitest 5 (MongoDB thật), Nuxt 4, Vue 3.

**Spec:** `docs/superpowers/specs/2026-10-08-also-categories-design.md` (chủ dự án duyệt 2026-10-08). Liên quan: `docs/technical-design.md` mục 3, 6, 7, 11; `docs/ui-spec.md` mục 4, 5, 7, 12; `docs/data-collection.md` mục 4, 5; `docs/product-spec.md` mục 4, 8; ADR 0010, 0011.

## Global Constraints

- TypeScript strict; không `any`, `@ts-ignore`, `as unknown as`.
- Kiểu dữ liệu qua API, form nằm trong `packages/contracts`; API validate bằng đúng schema đó (ADR 0011).
- Không bịa dữ liệu địa điểm: test chỉ dùng dữ liệu giả tên "Giả Lập".
- URL công khai không đổi (ADR 0010). Danh mục chính vẫn quyết định biểu tượng ghim, tem, loại JSON-LD đứng đầu.
- `alsoCategories`: tối đa 2, không lặp, không chứa danh mục chính; form chỉ đưa các danh mục công khai (`PUBLIC_CATEGORIES`) vào "Cũng phục vụ".
- `cover` để trống là "Chưa rõ"; chưa rõ thì không tính là trú mưa được, cũng không tính là có chỗ ngoài trời.
- Chữ hiển thị tiếng Việt theo ui-spec mục 3; chip bản đồ, liên kết chế độ mưa dùng chữ "Trú mưa được".
- Admin: token, class `rd-…`, vùng bấm 44px, `<label>` cho mọi ô chọn; làm cho 375px trước.
- Nhánh `feat/S27-also-categories` (tạo từ `feat/S05-place-form`). Commit theo Conventional Commits có `S27`. `git add` từng đường dẫn cụ thể; không add `.pnpm-store/`.
- Task 1 bỏ `indoor` khỏi contracts nên API và admin chỉ typecheck lại được sau Task 2 và Task 4; mỗi task chạy test, typecheck, lint của package mình; Task 5 chạy `pnpm turbo run lint typecheck test build` (cần `pnpm infra:up`).

## Review Focus

1. **Đổi danh mục chính sang đúng danh mục đang tích ở "Cũng phục vụ"** (ví dụ chính Cà phê, phụ Ăn uống, rồi đổi chính sang Ăn uống): form tự bỏ Ăn uống khỏi danh mục phụ, không để người nhập gặp lỗi lưu khó hiểu. Test ở Task 4 Step 1 (`usePlaceEditor` đổi danh mục chính).
2. **Lọc nhiều danh mục cùng lúc** (`category=cafe,food`, trang chủ): quán có cả hai danh mục chỉ hiện một lần. Test ở Task 2 Step 1 (HTTP danh sách).
3. **Dữ liệu cũ còn trường `indoor`** (chèn tay, import cũ): form vẫn mở, mái che hiện "Chưa rõ", không lỗi 500. Test ở Task 2 Step 1 (`toAdminPlace` với `indoor`).
4. **Mái che chưa rõ**: không được tính là trú mưa được (chế độ mưa không gợi ý chỗ chưa xác minh). Test ở Task 1 Step 1 (`rainSafe({})`).
5. **Tìm "an uong"**: ra quán có danh mục phụ ăn uống, nhưng không kéo theo quán chỉ là cà phê. Test ở Task 2 Step 1 (`searchPlaces`, HTTP `q=an uong`).

## Tiêu chí (spec) → bước kiểm

| Yêu cầu trong spec | Kiểm ở |
| --- | --- |
| `alsoCategories` tối đa 2, không lặp, khác danh mục chính | Task 1 (contracts), Task 4 (form báo lỗi đúng ô) |
| `servesCategory`, `rainSafe`, `hasOpenAir`, `COVER_LABEL` | Task 1 |
| `cover` thay `indoor` ở contracts, schema, form | Task 1, Task 2, Task 4 |
| Trang danh mục, API lọc theo danh mục chính hoặc phụ | Task 2 |
| Thẻ ghi "Cà phê, Ăn uống · Trung tâm" | Task 2 (`PlaceCard.alsoCategories`), Task 3 (`placeMeta`) |
| Tìm không dấu so nhãn danh mục phụ | Task 2 |
| Form "Cũng phục vụ" (tối đa 2, đổi chính thì bỏ khỏi phụ), "Mái che" 4 lựa chọn | Task 4, Task 5 Step 4 |
| Luật cho S07, S11, S12, S15, S17, S21, S24; cột Sheet `also_category`, `cover`; quy ước hai cơ sở | Task 5 Step 1 |
| Story S27 trong backlog, decisions, technical-design, ui-spec, product-spec, data-collection | Task 5 Step 1 |

## Ngoài phạm vi

- Ưu tiên quán có danh mục chính trên trang danh mục.
- Danh mục phụ `stay`, `shop` trong form (không có trang công khai ở lát 1).
- Chip "Trú mưa được", "Ngoài trời" trên bản đồ, chip mái che trên trang địa điểm, chế độ mưa, lịch trình, JSON-LD, import CSV: chỉ ghi luật vào tài liệu; code làm ở S12, S11, S24, S15, S17, S21.

## Cấu trúc file

```text
packages/contracts/src/
  enums.ts            PlaceCover                                                        (sửa)
  place.ts            AlsoCategories, alsoCategoriesIssue, Place (alsoCategories, cover), servesCategory,
                      rainSafe, hasOpenAir, PlaceCard.alsoCategories                    (sửa)
  place-admin.ts      PlaceEditInput, AdminPlace: alsoCategories, cover; bỏ indoor      (sửa)
  labels.ts           COVER_LABEL                                                       (sửa)
  place.test.ts, place-admin.test.ts                                                    (sửa)
apps/api/src/modules/places/
  schemas/place.schema.ts   alsoCategories, cover; bỏ indoor                           (sửa)
  place-edit.ts             EditRow, editUpdate, toAdminPlace                           (sửa)
  places.repository.ts      CARD_FIELDS, CardRow, listActive ($or)                      (sửa)
  place-listing.ts          ListedPlace.alsoCategories, searchPlaces, toPlaceCard        (sửa)
  place-edit.test.ts, place-listing.test.ts, places.controller.test.ts, place-editor.service.test.ts (sửa)
apps/web/app/entities/place/
  lib/place-meta.ts, lib/place-meta.test.ts                                             (mới)
  ui/RdPlaceCard.vue                                                                    (sửa)
apps/admin/src/widgets/place-editor/
  model/also-categories.ts, model/also-categories.test.ts                               (mới)
  model/form.ts, model/form.test.ts, model/use-place-editor.ts, model/use-place-editor.test.ts (sửa)
  ui/RdPlaceEditor.vue                                                                  (sửa)
docs/backlog.md, docs/decisions.md, docs/technical-design.md, docs/ui-spec.md,
docs/product-spec.md, docs/data-collection.md, CLAUDE.md                                (sửa)
```

## Bước 0: Chuẩn bị

- [ ] Nhánh `feat/S27-also-categories` đã có (tạo từ `feat/S05-place-form`, đã có commit spec). Kiểm và bật hạ tầng:

```bash
git switch feat/S27-also-categories
git status --short   # sạch (spec và plan đã commit)
pnpm install
pnpm infra:up
```

---

### Task 1: Contracts cho danh mục phụ và mức mái che

**Files:**
- Modify: `packages/contracts/src/enums.ts`, `place.ts`, `place-admin.ts`, `labels.ts`
- Test: `packages/contracts/src/place.test.ts`, `place-admin.test.ts`

**Interfaces:**
- Consumes: `PlaceCategory`, `PUBLIC_CATEGORIES` (đã có).
- Produces:
  - `PlaceCover` (Zod enum `'full' | 'partial' | 'none'`) và type cùng tên.
  - `MAX_ALSO_CATEGORIES = 2`; schema `AlsoCategories` (`z.array(PlaceCategory).max(2, …)`).
  - `alsoCategoriesIssue(category: PlaceCategory, alsoCategories: readonly PlaceCategory[]): string | null`.
  - `servesCategory(place: { category: PlaceCategory; alsoCategories?: readonly PlaceCategory[] }, c: PlaceCategory): boolean`.
  - `rainSafe(place: { cover?: PlaceCover }): boolean`, `hasOpenAir(place: { cover?: PlaceCover }): boolean`.
  - `Place.alsoCategories` (mặc định `[]`), `Place.cover` (tuỳ chọn), không còn `Place.indoor`.
  - `PlaceCard.alsoCategories?: PlaceCategory[]`.
  - `PlaceEditInput.alsoCategories` (mặc định `[]`, lỗi ở đường dẫn `alsoCategories`), `PlaceEditInput.cover?`; `AdminPlace.alsoCategories: PlaceCategory[]` (thiếu thì `[]`, để fixture và dữ liệu cũ vẫn đọc được), `AdminPlace.cover?`; không còn `indoor`.
  - `COVER_LABEL: Record<PlaceCover, string>`.

- [ ] **Step 1: Viết test (đỏ)**

`packages/contracts/src/place.test.ts`: thêm `hasOpenAir, rainSafe, servesCategory` vào import từ `./place.js`, thêm cuối file:

```ts
describe('danh mục phụ', () => {
  it('nháp có tối đa 2 danh mục phụ, không lặp, khác danh mục chính', () => {
    expect(Place.parse(DRAFT).alsoCategories).toEqual([]);
    expect(Place.safeParse({ ...DRAFT, alsoCategories: ['food'] }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, alsoCategories: ['food', 'activity', 'attraction'] }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, alsoCategories: ['cafe'] }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, alsoCategories: ['food', 'food'] }).success).toBe(false);
  });
  it('servesCategory: đúng với danh mục chính hoặc một danh mục phụ', () => {
    const place = { category: 'cafe', alsoCategories: ['food'] } as const;
    expect(servesCategory(place, 'cafe')).toBe(true);
    expect(servesCategory(place, 'food')).toBe(true);
    expect(servesCategory(place, 'attraction')).toBe(false);
    expect(servesCategory({ category: 'food' }, 'food')).toBe(true);
  });
});

describe('mức mái che', () => {
  it('chỉ nhận full, partial, none; trường indoor cũ bị bỏ', () => {
    expect(Place.safeParse({ ...DRAFT, cover: 'partial' }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, cover: 'mot-phan' }).success).toBe(false);
    expect(Place.parse({ ...DRAFT, indoor: true })).not.toHaveProperty('indoor');
  });
  it('rainSafe và hasOpenAir suy ra từ mức mái che; chưa rõ thì cả hai sai', () => {
    expect([rainSafe({ cover: 'full' }), hasOpenAir({ cover: 'full' })]).toEqual([true, false]);
    expect([rainSafe({ cover: 'partial' }), hasOpenAir({ cover: 'partial' })]).toEqual([true, true]);
    expect([rainSafe({ cover: 'none' }), hasOpenAir({ cover: 'none' })]).toEqual([false, true]);
    expect([rainSafe({}), hasOpenAir({})]).toEqual([false, false]);
  });
});
```

`packages/contracts/src/place-admin.test.ts`:
- Trong test `'nháp chỉ cần tên và danh mục; bỏ khoảng trắng thừa; mảng mặc định rỗng'`, thêm `alsoCategories: [],` vào object mong đợi (sau `aliases: [],`).
- Trong test `'giờ, toạ độ, cụm, thời gian tham quan phải đúng dạng'`, dòng cuối đổi `indoor: false` thành `cover: 'none'`.
- Trong test `AdminPlace` `'đọc được dữ liệu đã lưu nhưng sai …'` (`stored` không có `alsoCategories`), thêm dòng cuối: `expect(AdminPlace.parse(stored).alsoCategories).toEqual([]);`
- Thêm vào khối `describe('PlaceEditInput', …)`:

```ts
  it('danh mục phụ: tối đa 2, không lặp, khác danh mục chính; lỗi nằm ở alsoCategories', () => {
    const base = { name: 'Quán Giả Lập', category: 'cafe' };
    expect(PlaceEditInput.parse({ ...base, alsoCategories: ['food'] }).alsoCategories).toEqual(['food']);
    const same = PlaceEditInput.safeParse({ ...base, alsoCategories: ['cafe'] });
    expect(same.success).toBe(false);
    if (!same.success) expect(same.error.issues.map((i) => i.path.join('.'))).toEqual(['alsoCategories']);
    expect(PlaceEditInput.safeParse({ ...base, alsoCategories: ['food', 'activity', 'attraction'] }).success).toBe(false);
  });
  it('mức mái che thay cho trong nhà/ngoài trời', () => {
    expect(PlaceEditInput.parse({ name: 'Quán Giả Lập', category: 'cafe', cover: 'partial' }).cover).toBe('partial');
    expect(PlaceEditInput.safeParse({ name: 'Quán Giả Lập', category: 'cafe', cover: true }).success).toBe(false);
  });
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts test`
Expected: FAIL (`servesCategory`, `rainSafe`, `hasOpenAir` chưa export; `alsoCategories`, `cover` chưa có trong schema).

- [ ] **Step 3: Viết code**

`packages/contracts/src/enums.ts`, thêm cuối file:

```ts
/** Mức mái che (thay cho trong nhà/ngoài trời): full che hết; partial có cả chỗ che mưa và chỗ ngoài trời; none không chỗ che mưa. */
export const PlaceCover = z.enum(['full', 'partial', 'none']);
export type PlaceCover = z.infer<typeof PlaceCover>;
```

`packages/contracts/src/place.ts`:
- Import thêm `PlaceCover` từ `./enums.js`.
- Thêm ngay sau `PlaceIds`:

```ts
/** Số danh mục phụ tối đa của một địa điểm. */
export const MAX_ALSO_CATEGORIES = 2;

/** Danh mục phụ: quán phục vụ thêm loại khác (ví dụ cà phê có cơm trưa); danh mục chính vẫn quyết định ghim, tem. */
export const AlsoCategories = z.array(PlaceCategory).max(MAX_ALSO_CATEGORIES, `Tối đa ${MAX_ALSO_CATEGORIES} danh mục phụ`);

/** Lỗi của danh mục phụ so với danh mục chính; null là hợp lệ. */
export function alsoCategoriesIssue(category: PlaceCategory, alsoCategories: readonly PlaceCategory[]): string | null {
  if (alsoCategories.includes(category)) return 'Danh mục phụ không được trùng danh mục chính';
  if (new Set(alsoCategories).size !== alsoCategories.length) return 'Danh mục phụ bị lặp';
  return null;
}
```

- Trong `Place`: thêm `alsoCategories: AlsoCategories.default([]),` ngay sau `category: PlaceCategory,`; thay dòng `indoor: z.boolean().optional(),` bằng `cover: PlaceCover.optional(),`; thêm vào sau `})` đóng `z.object` (trước `export type Place`):

```ts
  .superRefine((place, ctx) => {
    const issue = alsoCategoriesIssue(place.category, place.alsoCategories);
    if (issue) ctx.addIssue({ code: 'custom', path: ['alsoCategories'], message: issue });
  });
```

(tức là `export const Place = z.object({ … }).superRefine(…);`).

- Thêm sau hàm `needsOwnerConfirmation`:

```ts
/** Địa điểm phục vụ danh mục `c`: là danh mục chính hoặc một danh mục phụ (trang danh mục, chỗ ăn trong lịch trình). */
export function servesCategory(place: { category: PlaceCategory; alsoCategories?: readonly PlaceCategory[] }, c: PlaceCategory): boolean {
  return place.category === c || (place.alsoCategories ?? []).includes(c);
}

/** Trời mưa vẫn có chỗ ngồi: che hết hoặc che một phần (chế độ mưa, chip "Trú mưa được"). Chưa rõ thì không tính. */
export function rainSafe(place: { cover?: PlaceCover }): boolean {
  return place.cover === 'full' || place.cover === 'partial';
}

/** Có chỗ ngồi ngoài trời: che một phần hoặc không che (chip "Ngoài trời"). Chưa rõ thì không tính. */
export function hasOpenAir(place: { cover?: PlaceCover }): boolean {
  return place.cover === 'partial' || place.cover === 'none';
}
```

- Trong `PlaceCard`, thêm sau `category: PlaceCategory,`:

```ts
  /** Danh mục phụ, chỉ có khi khác rỗng: thẻ ghi "Cà phê, Ăn uống". */
  alsoCategories: z.array(PlaceCategory).optional(),
```

`packages/contracts/src/place-admin.ts`:
- Import: thêm `PlaceCover` vào import từ `./enums.js`; đổi import từ `./place.js` thành `import { AlsoCategories, alsoCategoriesIssue, PlaceContact, PlacePhoto } from './place.js';`.
- Trong `PlaceEditInput`: thêm `alsoCategories: AlsoCategories.default([]),` sau `category: PlaceCategory,`; thay `indoor: z.boolean().optional(),` bằng `cover: PlaceCover.optional(),`; thêm `.superRefine` sau `z.object({ … })`:

```ts
  .superRefine((input, ctx) => {
    const issue = alsoCategoriesIssue(input.category, input.alsoCategories);
    if (issue) ctx.addIssue({ code: 'custom', path: ['alsoCategories'], message: issue });
  });
```

- Trong `AdminPlace`: thêm `alsoCategories: z.array(PlaceCategory).default([]),` sau `category: PlaceCategory,` (fixture `PLACE` trong `use-place-editor.test.ts` dựng bằng `AdminPlace.parse` không có trường này); thay `indoor: z.boolean().optional(),` bằng `cover: PlaceCover.optional(),`. Không thêm `superRefine` vào `AdminPlace`: schema này cố ý dễ dãi để form vẫn mở với dữ liệu sai.

`packages/contracts/src/labels.ts`: đổi import thành `import type { BestTime, PlaceCategory, PlaceCover, PlaceStatus, Transport } from './enums.js';` và thêm cuối file:

```ts
/** Chip mái che trên trang địa điểm. */
export const COVER_LABEL: Record<PlaceCover, string> = {
  full: 'Trong nhà',
  partial: 'Trong nhà và ngoài trời',
  none: 'Ngoài trời',
};
```

- [ ] **Step 4: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/contracts test && pnpm --filter @ranhduong/contracts typecheck && pnpm --filter @ranhduong/contracts lint && pnpm --filter @ranhduong/contracts build`
Expected: PASS. (API và admin còn dùng `indoor` nên chưa typecheck; Task 2 và Task 4 sửa.)

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src
git commit -m "feat: S27 add also categories and cover levels to contracts"
```

---

### Task 2: API lưu, lọc, tìm theo danh mục phụ và mức mái che

**Files:**
- Modify: `apps/api/src/modules/places/schemas/place.schema.ts`, `place-edit.ts`, `places.repository.ts`, `place-listing.ts`
- Test: `apps/api/src/modules/places/place-edit.test.ts`, `place-listing.test.ts`, `places.controller.test.ts`, `place-editor.service.test.ts`

**Interfaces:**
- Consumes: `PlaceCover`, `AlsoCategories`, `PlaceEditInput`, `AdminPlace`, `PlaceCard`, `CATEGORY_LABEL` (Task 1).
- Produces:
  - Mongoose `PlaceSchema`: `alsoCategories: [String]` (enum `PlaceCategory`, mặc định `[]`), `cover: String` (enum `PlaceCover`); không còn `indoor`.
  - `EditRow.alsoCategories?: PlaceCategory[]`, `EditRow.cover?: PlaceCover | null`; `editUpdate` ghi `alsoCategories`, `$set`/`$unset` `cover`; `toAdminPlace` trả `alsoCategories` (mặc định `[]`), `cover`.
  - `ListedPlace.alsoCategories: PlaceCategory[]`; `listActive` lọc `category` hoặc `alsoCategories`; `toPlaceCard` chỉ thêm `alsoCategories` khi khác rỗng; `searchPlaces` so cả nhãn danh mục phụ.

- [ ] **Step 1: Viết test (đỏ)**

`apps/api/src/modules/places/place-edit.test.ts`:
- Test đầu `editUpdate` (`'ghi trường có giá trị (kể cả false), $unset …'`): đổi tên thành `'ghi trường có giá trị, $unset trường tuỳ chọn để trống; contact bỏ ô trống'` (không còn trường đúng/sai); trong input thay `indoor: false,` bằng `cover: 'none',` và thêm `alsoCategories: ['food'],`; trong `toMatchObject` của `$set` thay `indoor: false,` bằng `cover: 'none', alsoCategories: ['food'],`. Danh sách `$unset` giữ nguyên.
- Test thứ hai (`'không có cụm thì $unset zoneId'`) thêm dòng: `expect($unset).toHaveProperty('cover', '');`
- Test `toAdminPlace`: thêm `alsoCategories: [],` vào object mong đợi (sau `category: 'cafe',`), và thêm test:

```ts
  it('document cũ còn trường indoor: bỏ qua, mái che là chưa rõ', () => {
    const legacy = {
      _id: new Types.ObjectId('0123456789abcdef01234567'),
      cityId: new Types.ObjectId(),
      status: 'draft' as const,
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập',
      category: 'cafe' as const,
      indoor: true,
      updatedAt: new Date('2026-10-08T03:00:00Z'),
    };
    const place = toAdminPlace(legacy, new Map());
    expect(place.cover).toBeUndefined();
    expect(place).not.toHaveProperty('indoor');
    expect(place.alsoCategories).toEqual([]);
  });
```

`apps/api/src/modules/places/place-listing.test.ts`:
- Builder `place`: thêm `alsoCategories: [],` sau `category: 'cafe',`.
- Thêm cuối file:

```ts
describe('danh mục phụ trên thẻ và khi tìm', () => {
  it('thẻ chỉ có alsoCategories khi khác rỗng', () => {
    expect(toPlaceCard(place({ alsoCategories: ['food'] }), new Map()).alsoCategories).toEqual(['food']);
    expect(toPlaceCard(place(), new Map())).not.toHaveProperty('alsoCategories');
  });
  it('tìm "an uong" ra quán có danh mục phụ ăn uống, không kéo theo quán chỉ là cà phê', () => {
    const list = [place({ slug: 'cafe-co-com', alsoCategories: ['food'] }), place({ slug: 'cafe-thuan' })];
    expect(searchPlaces(list, 'an uong').map((p) => p.slug)).toEqual(['cafe-co-com']);
  });
});
```

`apps/api/src/modules/places/places.controller.test.ts`: thêm vào khối `describe('GET /v1/cities/:city/places', …)`:

```ts
  it('danh mục phụ: trang Ăn uống có quán cà phê có đồ ăn, quán chỉ cà phê thì không; lọc nhiều danh mục không lặp; tìm "an uong"', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'cafe-co-com', category: 'cafe', alsoCategories: ['food'], verifySource: 'owner' }),
      fakePlaceDoc(cityId, { slug: 'cafe-thuan', category: 'cafe' }),
      fakePlaceDoc(cityId, { slug: 'quan-an', category: 'food' }),
    ]);
    const food = (await get(`/cities/${CITY}/places?category=food`)).body as PlaceListResponse;
    expect(food.items.map((p) => p.slug).sort()).toEqual(['cafe-co-com', 'quan-an']);
    expect(food.items.find((p) => p.slug === 'cafe-co-com')?.alsoCategories).toEqual(['food']);
    expect(slugs((await get(`/cities/${CITY}/places?category=cafe,food`)).body).sort()).toEqual(['cafe-co-com', 'cafe-thuan', 'quan-an']);
    const found = slugs((await get(`/cities/${CITY}/places?q=${encodeURIComponent('an uong')}`)).body);
    expect(found).toEqual(expect.arrayContaining(['cafe-co-com', 'quan-an']));
    expect(found).not.toContain('cafe-thuan');
  });
```

`apps/api/src/modules/places/place-editor.service.test.ts`: thêm vào khối `describe('update', …)`:

```ts
    it('lưu danh mục phụ và mức mái che; gửi lại không có thì xoá', async () => {
      const created = await editor.create(CITY, fakeEditInput({ alsoCategories: ['food'], cover: 'partial' }));
      expect(created).toMatchObject({ alsoCategories: ['food'], cover: 'partial' });
      const cleared = await editor.update(created.id, fakeEditInput());
      expect(cleared.alsoCategories).toEqual([]);
      expect(cleared.cover).toBeUndefined();
      expect(await dbDoc(created.id)).not.toHaveProperty('cover');
    });
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/api test`
Expected: FAIL (schema chưa có `alsoCategories`, `cover`; lọc chưa xét danh mục phụ; `toPlaceCard` chưa có `alsoCategories`).

- [ ] **Step 3: Viết code**

`apps/api/src/modules/places/schemas/place.schema.ts`: thêm `PlaceCover` vào import từ `@ranhduong/contracts`; thêm `alsoCategories: { type: [String], enum: PlaceCategory.options, default: [] },` ngay sau dòng `category`; thay dòng `indoor: { type: Boolean },` bằng `cover: { type: String, enum: PlaceCover.options },`.

`apps/api/src/modules/places/place-edit.ts`:
- Import type thêm `PlaceCover`.
- `EditRow`: thêm `alsoCategories?: PlaceCategory[];` sau `category: PlaceCategory;`; thay `indoor?: boolean | null;` bằng `cover?: PlaceCover | null;`.
- `editUpdate`: trong `set` thêm `alsoCategories: input.alsoCategories,` sau `category: input.category,`; trong `optional` thay `indoor: input.indoor,` bằng `cover: input.cover,`.
- `toAdminPlace`: thêm `alsoCategories: row.alsoCategories ?? [],` sau `category: row.category,`; thay `indoor: opt(row.indoor),` bằng `cover: opt(row.cover),`.

`apps/api/src/modules/places/places.repository.ts`:
- `CARD_FIELDS`: thêm `alsoCategories: 1,` sau `category: 1,`.
- `CardRow`: thêm `alsoCategories?: PlaceCategory[];` sau `category: PlaceCategory;`.
- Trong `listActive`, thay dòng lọc danh mục:

```ts
          // Danh mục chính hoặc một danh mục phụ (S27); $or trả mỗi địa điểm một lần.
          ...(filter.categories ? { $or: [{ category: { $in: filter.categories } }, { alsoCategories: { $in: filter.categories } }] } : {}),
```

- Trong `docs.map`, thêm `alsoCategories: d.alsoCategories ?? [],` sau `category: d.category,`.

`apps/api/src/modules/places/place-listing.ts`:
- `ListedPlace`: thêm `alsoCategories: PlaceCategory[];` sau `category: PlaceCategory;`.
- `searchPlaces`: thay biểu thức `matchScore(...)` bằng:

```ts
    .map((place) => {
      const labels = [place.category, ...place.alsoCategories].map((c) => CATEGORY_LABEL[c]);
      return { place, score: matchScore(q, place.name, [...place.aliases, ...labels]) };
    })
```

- `toPlaceCard`: thêm ngay sau `category: place.category,`:

```ts
    ...(place.alsoCategories.length > 0 ? { alsoCategories: place.alsoCategories } : {}),
```

- [ ] **Step 4: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/api test && pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/api lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/places
git commit -m "feat: S27 filter, search and edit places by also categories and cover"
```

---

### Task 3: Web ghi đủ danh mục trên thẻ địa điểm

**Files:**
- Create: `apps/web/app/entities/place/lib/place-meta.ts`, `place-meta.test.ts`
- Modify: `apps/web/app/entities/place/ui/RdPlaceCard.vue`

**Interfaces:**
- Consumes: `PlaceCard.alsoCategories?` (Task 1), `CATEGORY_LABEL`.
- Produces: `placeMeta(card: Pick<PlaceCard, 'category' | 'alsoCategories' | 'zoneName'>): string`.

- [ ] **Step 1: Viết test (đỏ)**

Tạo `apps/web/app/entities/place/lib/place-meta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { placeMeta } from './place-meta';

describe('placeMeta', () => {
  it('danh mục chính rồi danh mục phụ, rồi cụm', () => {
    expect(placeMeta({ category: 'cafe', alsoCategories: ['food'], zoneName: 'Trung tâm' })).toBe('Cà phê, Ăn uống · Trung tâm');
    expect(placeMeta({ category: 'food', zoneName: 'Phía Nam' })).toBe('Ăn uống · Phía Nam');
    expect(placeMeta({ category: 'attraction' })).toBe('Tham quan');
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/web test`
Expected: FAIL (`./place-meta` chưa có).

- [ ] **Step 3: Viết code**

Tạo `apps/web/app/entities/place/lib/place-meta.ts`:

```ts
import { CATEGORY_LABEL, type PlaceCard } from '@ranhduong/contracts';

/** Dòng meta của thẻ địa điểm: danh mục chính, danh mục phụ (S27), rồi cụm, ví dụ "Cà phê, Ăn uống · Trung tâm". */
export function placeMeta(card: Pick<PlaceCard, 'category' | 'alsoCategories' | 'zoneName'>): string {
  const categories = [card.category, ...(card.alsoCategories ?? [])].map((c) => CATEGORY_LABEL[c]).join(', ');
  return [categories, card.zoneName].filter(Boolean).join(' · ');
}
```

`apps/web/app/entities/place/ui/RdPlaceCard.vue`: đổi import đầu thành `import { openStatus, type PlaceCard } from '@ranhduong/contracts';`, thêm `import { placeMeta } from '../lib/place-meta';`, thay dòng `const meta = …` bằng:

```ts
const meta = computed(() => placeMeta(props.place));
```

- [ ] **Step 4: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/web test && pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web lint`
Expected: PASS. Nếu `web#lint` chỉ báo lỗi ở `apps/web/prelaunch/.wrangler/verify-ui.mjs` (file local đã gitignore, không thuộc S27) thì ghi lại và bỏ qua.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/entities/place
git commit -m "feat: S27 show also categories on place cards"
```

---

### Task 4: Form admin "Cũng phục vụ" và "Mái che"

**Files:**
- Create: `apps/admin/src/widgets/place-editor/model/also-categories.ts`, `also-categories.test.ts`
- Modify: `apps/admin/src/widgets/place-editor/model/form.ts`, `form.test.ts`, `use-place-editor.ts`, `use-place-editor.test.ts`, `ui/RdPlaceEditor.vue`

**Interfaces:**
- Consumes: `AlsoCategories`, `MAX_ALSO_CATEGORIES`, `PlaceCover`, `PUBLIC_CATEGORIES`, `CATEGORY_LABEL`, `AdminPlace.alsoCategories`, `AdminPlace.cover` (Task 1).
- Produces:
  - `PlaceFormState.alsoCategories: PlaceCategory[]`, `PlaceFormState.cover: '' | PlaceCover` (thay `indoor`).
  - `alsoCategoryChoices(primary: PlaceCategory | '', selected: readonly PlaceCategory[]): { value: PlaceCategory; label: string; disabled: boolean }[]`.
  - `withoutPrimary(also: readonly PlaceCategory[], primary: PlaceCategory | ''): PlaceCategory[]`.
  - `usePlaceEditor`: đổi danh mục chính thì bỏ danh mục đó khỏi `form.alsoCategories`.

- [ ] **Step 1: Viết test (đỏ)**

Tạo `apps/admin/src/widgets/place-editor/model/also-categories.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { alsoCategoryChoices, withoutPrimary } from './also-categories';

describe('alsoCategoryChoices', () => {
  it('các danh mục công khai trừ danh mục chính', () => {
    expect(alsoCategoryChoices('cafe', []).map((c) => c.value)).toEqual(['food', 'attraction', 'activity']);
    expect(alsoCategoryChoices('', []).map((c) => c.value)).toEqual(['cafe', 'food', 'attraction', 'activity']);
  });
  it('đã chọn đủ 2 thì các ô chưa chọn bị khoá, ô đã chọn vẫn bỏ được', () => {
    const choices = alsoCategoryChoices('cafe', ['food', 'activity']);
    expect(choices.filter((c) => c.disabled).map((c) => c.value)).toEqual(['attraction']);
  });
});

describe('withoutPrimary', () => {
  it('bỏ danh mục chính khỏi danh mục phụ', () => {
    expect(withoutPrimary(['food', 'activity'], 'food')).toEqual(['activity']);
    expect(withoutPrimary(['food'], '')).toEqual(['food']);
  });
});
```

`apps/admin/src/widgets/place-editor/model/form.test.ts`:
- Trong `PLACE`, thay `indoor: false,` bằng `cover: 'none',` và thêm `alsoCategories: ['food'],` sau `category: 'cafe',`.
- Trong test `'đọc địa điểm vào form rồi gửi lại ra đúng các trường'`, object `input` mong đợi: thay `indoor: false,` bằng `cover: 'none',` và thêm `alsoCategories: ['food'],` sau `category: 'cafe',`.
- Thêm vào khối `describe('formFromPlace và formToInput', …)`:

```ts
  it('mái che "Chưa rõ" thì không gửi cover; danh mục phụ trùng danh mục chính thì báo ở ô Cũng phục vụ', () => {
    const result = formToInput({ ...NAMED, cover: '' });
    expect(result.ok).toBe(true);
    expect(result.ok ? result.input.cover : 'lỗi').toBeUndefined();
    expect(formToInput({ ...NAMED, alsoCategories: ['cafe'] })).toMatchObject({
      ok: false,
      errors: { alsoCategories: 'Chọn tối đa 2 danh mục phụ, khác danh mục chính' },
    });
  });
```

`apps/admin/src/widgets/place-editor/model/use-place-editor.test.ts`: thêm `describe` mới cuối file:

```ts
describe('usePlaceEditor: danh mục phụ', () => {
  it('đổi danh mục chính sang đúng danh mục đang ở "Cũng phục vụ" thì bỏ nó khỏi danh mục phụ', async () => {
    const { editor } = await open(memoryStorage());
    editor.form.value.alsoCategories = ['food', 'activity'];
    editor.form.value.category = 'food';
    await vi.advanceTimersByTimeAsync(0);
    expect(editor.form.value.alsoCategories).toEqual(['activity']);
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/admin test`
Expected: FAIL (`./also-categories` chưa có; form chưa có `alsoCategories`, `cover`).

- [ ] **Step 3: Viết code**

Tạo `apps/admin/src/widgets/place-editor/model/also-categories.ts`:

```ts
import { CATEGORY_LABEL, MAX_ALSO_CATEGORIES, PUBLIC_CATEGORIES, type PlaceCategory } from '@ranhduong/contracts';

export interface AlsoCategoryChoice {
  value: PlaceCategory;
  label: string;
  /** Đã chọn đủ số danh mục phụ tối đa thì khoá các ô chưa chọn. */
  disabled: boolean;
}

/** Lựa chọn "Cũng phục vụ": danh mục công khai trừ danh mục chính (S27). */
export function alsoCategoryChoices(primary: PlaceCategory | '', selected: readonly PlaceCategory[]): AlsoCategoryChoice[] {
  return PUBLIC_CATEGORIES.filter((c) => c !== primary).map((value) => ({
    value,
    label: CATEGORY_LABEL[value],
    disabled: !selected.includes(value) && selected.length >= MAX_ALSO_CATEGORIES,
  }));
}

/** Bỏ danh mục chính khỏi danh mục phụ, dùng khi người nhập đổi danh mục chính. */
export function withoutPrimary(also: readonly PlaceCategory[], primary: PlaceCategory | ''): PlaceCategory[] {
  return also.filter((c) => c !== primary);
}
```

`apps/admin/src/widgets/place-editor/model/form.ts`:
- Import: thêm `PlaceCover` vào import từ `@ranhduong/contracts`.
- `PlaceFormState`: thêm `alsoCategories: z.array(PlaceCategory),` sau dòng `category`; thay `indoor: z.enum(['', 'indoor', 'outdoor']),` bằng `cover: z.union([PlaceCover, z.literal('')]),`.
- `FIELD_MESSAGE`: thay `indoor: 'Chọn lại trong nhà hay ngoài trời',` bằng hai dòng `alsoCategories: 'Chọn tối đa 2 danh mục phụ, khác danh mục chính',` và `cover: 'Chọn lại mái che',`.
- `PATH_FIELD`: thay `indoor: 'indoor',` bằng `alsoCategories: 'alsoCategories',` và `cover: 'cover',`.
- `emptyForm`: thêm `alsoCategories: [],` sau `category: '',`; thay `indoor: '',` bằng `cover: '',`.
- `formFromPlace`: thêm `alsoCategories: [...place.alsoCategories],` sau `category: place.category,`; thay dòng `indoor: …` bằng `cover: place.cover ?? '',`.
- `rawInput`: thêm `alsoCategories: form.alsoCategories,` sau dòng `category`; thay dòng `indoor: …` bằng `cover: form.cover || undefined,`.

`apps/admin/src/widgets/place-editor/model/use-place-editor.ts`: thêm `import { withoutPrimary } from './also-categories';` và thêm ngay trước khối "Kiểm trùng khi tên…":

```ts
  // Đổi danh mục chính thì bỏ danh mục đó khỏi "Cũng phục vụ" (S27), để không vướng lỗi khi lưu.
  watch(
    () => form.value.category,
    (category) => {
      if (category !== '' && form.value.alsoCategories.includes(category)) {
        form.value.alsoCategories = withoutPrimary(form.value.alsoCategories, category);
      }
    },
  );
```

(`category !== ''` thu hẹp kiểu về `PlaceCategory`, không cần ép kiểu.)

`apps/admin/src/widgets/place-editor/ui/RdPlaceEditor.vue`:
- Import thêm `import { alsoCategoryChoices } from '../model/also-categories';`.
- Thay hằng `INDOOR_OPTIONS` bằng:

```ts
const COVER_OPTIONS = [
  { value: '', label: 'Chưa rõ' },
  { value: 'full', label: 'Trong nhà hoặc có mái che hết' },
  { value: 'partial', label: 'Có cả chỗ che mưa và chỗ ngoài trời' },
  { value: 'none', label: 'Ngoài trời, không chỗ che mưa' },
] as const;
```

- Thêm computed sau `categoryOptions`:

```ts
const alsoOptions = computed(() => alsoCategoryChoices(form.value.category, form.value.alsoCategories));
```

- Ngay sau `</fieldset>` của "Danh mục" (trong section "Thông tin cơ bản"), thêm:

```vue
      <fieldset class="rd-field">
        <legend class="rd-field__label">Cũng phục vụ</legend>
        <div class="rd-choices">
          <label v-for="option in alsoOptions" :key="option.value" class="rd-choice">
            <input v-model="form.alsoCategories" type="checkbox" :value="option.value" :disabled="option.disabled" />{{ option.label }}
          </label>
        </div>
        <p class="rd-field__hint">Quán phục vụ thêm loại khác, ví dụ cà phê có cơm trưa; tối đa 2. Hai cơ sở riêng (giờ, menu khác) thì nhập thành hai địa điểm.</p>
        <p v-if="errors.alsoCategories" class="rd-field__error">{{ errors.alsoCategories }}</p>
      </fieldset>
```

- Thay cả `<fieldset>` "Trong nhà hay ngoài trời" bằng:

```vue
      <fieldset class="rd-field">
        <legend class="rd-field__label">Mái che</legend>
        <div class="options">
          <label v-for="option in COVER_OPTIONS" :key="option.value" class="rd-choice rd-choice--block">
            <input v-model="form.cover" type="radio" name="cover" :value="option.value" />{{ option.label }}
          </label>
        </div>
        <p class="rd-field__hint">Khu che mưa nhỏ (mưa là hết chỗ) thì ghi thêm vào ghi chú thực tế.</p>
      </fieldset>
```

- [ ] **Step 4: Chạy test, thấy xanh**

Run: `pnpm --filter @ranhduong/admin test && pnpm --filter @ranhduong/admin typecheck && pnpm --filter @ranhduong/admin lint && pnpm --filter @ranhduong/admin build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/widgets/place-editor
git commit -m "feat: S27 add also categories and cover to the place form"
```

---

### Task 5: Tài liệu, kiểm toàn bộ, thử form ở 375px

**Files:**
- Modify: `docs/backlog.md`, `docs/decisions.md`, `docs/technical-design.md`, `docs/ui-spec.md`, `docs/product-spec.md`, `docs/data-collection.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: mọi task trước.
- Produces: tài liệu khớp code và ghi luật cho các story sau.

- [ ] **Step 1: Cập nhật tài liệu**

`docs/backlog.md`:
- Thêm dòng sau dòng S26 trong bảng mục 4:

```markdown
| S27 | Nhập liệu | Danh mục phụ và mức mái che | Tối đa 2 danh mục phụ, khác danh mục chính; quán hiện ở trang của danh mục chính và phụ, thẻ ghi đủ danh mục, tìm không dấu theo cả danh mục phụ; mức mái che (che hết, một phần, không che) thay trong nhà/ngoài trời; form admin "Cũng phục vụ", "Mái che"; cột Sheet `also_category`, `cover` | 4 | P0 | Code xong (nhánh `feat/S27-also-categories` dựa trên S05, chưa mở PR) |
```

- Đổi "26 story, tổng khoảng 137 giờ; phần P0 khoảng 126 giờ" thành "27 story, tổng khoảng 141 giờ; phần P0 khoảng 130 giờ".
- Dòng S24: thay "chế độ mưa hiện liên kết quán trong nhà và chọn sẵn chip Trong nhà trên bản đồ" bằng "chế độ mưa hiện liên kết quán trú mưa được (mái che hết hoặc một phần, S27) và chọn sẵn chip Trú mưa được trên bản đồ".
- Dòng S07: thay "Lọc theo trạng thái, zone, danh mục;" bằng "Lọc theo trạng thái, zone, danh mục (tính cả danh mục phụ, S27);".
- Dòng S21: thay "tạo Place nháp với verifySource owner hoặc admin;" bằng "tạo Place nháp với verifySource owner hoặc admin; đọc cột `also_category`, `cover` (Sheet cũ có cột `indoor`: yes thành full, no thành none);".

`docs/decisions.md`: thêm vào cuối bảng:

```markdown
| 2026-10-08 | Địa điểm có danh mục chính (`category`) và tối đa 2 danh mục phụ (`alsoCategories`, khác danh mục chính); trang danh mục, lọc API, tìm không dấu, chỗ ăn trong lịch trình tính cả danh mục phụ (`servesCategory`); danh mục chính quyết định ghim, tem, loại JSON-LD đứng đầu | Chủ dự án chọn: quán vừa cà phê vừa ăn uống hiện ở cả hai trang và được chọn làm bữa; không đổi URL |
| 2026-10-08 | Mức mái che `cover` (`full`, `partial`, `none`, để trống là chưa rõ) thay `indoor`; `rainSafe` (full, partial) cho chế độ mưa và chip "Trú mưa được"; `hasOpenAir` (partial, none) cho chip "Ngoài trời"; khu che mưa nhỏ ghi vào ghi chú thực tế | Chủ dự án chọn: nhiều quán có cả khu che mưa và khu ngoài trời; câu khách cần trả lời là "mưa có ngồi được không" |
```

`docs/technical-design.md`:
- Mục 3, interface `Place`: thay `category: PlaceCategory; tags: string[];` bằng `category: PlaceCategory; alsoCategories: PlaceCategory[]; tags: string[];   // danh mục phụ, tối đa 2, khác category (S27)`; thay `indoor: boolean;` bằng `cover?: 'full' | 'partial' | 'none';` (giữ phần còn lại của dòng).
- Mục 6, dòng `GET /cities/:city/places`: thay "Lọc `category`," bằng "Lọc `category` (khớp danh mục chính hoặc danh mục phụ),".
- Mục 7, bảng: thay "13:00–17:00 ưu tiên `indoor`" bằng "13:00–17:00 ưu tiên `cover` full rồi partial".
- Mục 7, bước 9: thay "chọn quán `food`" bằng "chọn quán phục vụ ăn uống (`servesCategory(p, 'food')`)".
- Mục 11, gạch đầu dòng JSON-LD địa điểm: thêm vào cuối câu "; địa điểm có danh mục phụ thì `@type` là mảng theo thứ tự danh mục chính rồi phụ".

`docs/ui-spec.md`:
- Mục 4, "Thẻ địa điểm ngang": thay "tên, danh mục và khu vực" bằng "tên, danh mục (chính rồi phụ, ví dụ "Cà phê, Ăn uống") và khu vực".
- Mục 4, bảng chip, dòng `| Thuộc tính (Ngoài trời, Sống ảo…) | Nền \`--mist\` | Tags trên trang địa điểm, lịch trình |`: thay bằng `| Thuộc tính (mái che: Trong nhà, Trong nhà và ngoài trời, Ngoài trời; Sống ảo…) | Nền \`--mist\` | Tags và mức mái che (\`COVER_LABEL\`) trên trang địa điểm, lịch trình |`.
- Mục 5, bảng màn hình, dòng Bản đồ: thay "chip lọc (Cà phê, Đang mở, Trong nhà…)" bằng "chip lọc (Cà phê, Đang mở, Trú mưa được…)".
- Mục 7, "Chế độ mưa": thay "hiện liên kết \"Quán trong nhà gần bạn\" dưới ô thời tiết; bản đồ mở với chip \"Trong nhà\" chọn sẵn; điểm ngoài trời trong lịch trình buổi chiều có thêm gợi ý điểm trong nhà gần đó" bằng "hiện liên kết \"Quán trú mưa được gần bạn\" dưới ô thời tiết; bản đồ mở với chip \"Trú mưa được\" chọn sẵn (mái che hết hoặc một phần); điểm không có mái che trong lịch trình buổi chiều có thêm gợi ý điểm trú mưa được gần đó".
- Mục 12, dòng "Form địa điểm": thay "trong nhà hoặc ngoài trời" bằng "danh mục phụ (Cũng phục vụ), mái che (che hết, một phần, không)".
- Mục 12, bảng kiểm lịch trình: thay "Điểm ngoài trời buổi chiều trong lịch trình mùa mưa" bằng "Điểm không có mái che buổi chiều trong lịch trình mùa mưa".

`docs/product-spec.md`:
- Mục 4, bảng trường: thay dòng `| weather\_sensitivity | Ngoài trời / trong nhà |` bằng `| cover | Mái che: che hết / một phần / không che |`.
- Mục 8, bước 7: thay "ưu tiên điểm trong nhà buổi chiều" bằng "ưu tiên điểm trú mưa được (che hết, rồi một phần) buổi chiều".

`docs/data-collection.md`:
- Mục 4, bảng trường: thay dòng `| Trong nhà / ngoài trời | Ảnh không gian | Dùng cho phương án khi trời mưa |` bằng hai dòng:

```markdown
| Danh mục phụ | Menu, ảnh món | Quán phục vụ thêm loại khác (ví dụ cà phê có cơm trưa), tối đa 2. Hai cơ sở riêng (giờ, menu khác, khác chủ) thì ghi thành hai dòng |
| Mái che | Ảnh không gian | full: trong nhà hoặc che hết; partial: có cả chỗ che mưa và chỗ ngoài trời; none: ngoài trời, không chỗ che. Dùng cho phương án khi trời mưa |
```

- Mục 5, bảng cột: thêm sau dòng `category` dòng `| also_category | alsoCategories | Danh mục phụ, tối đa 2, cách nhau ;, khác category |`; thay dòng `| indoor | indoor | Dropdown: yes, no |` bằng `| cover | cover | Dropdown: full, partial, none |`.
- Mục 5, đoạn "Chuyển vào admin (story S21…)": thêm câu "Sheet cũ còn cột indoor thì yes thành cover full, no thành cover none."

`CLAUDE.md`, mục Trạng thái, dòng "Xong": thêm sau phần S05 `, S27 (danh mục phụ \`alsoCategories\` tối đa 2 và mức mái che \`cover\` thay \`indoor\`; lọc, thẻ, tìm, form admin; chờ thử staging)`.

- [ ] **Step 2: Kiểm toàn bộ**

Run: `pnpm infra:up && pnpm turbo run lint typecheck test build --continue`
Expected: PASS mọi package. Nếu chỉ `@ranhduong/web#lint` lỗi ở `apps/web/prelaunch/.wrangler/verify-ui.mjs` (file local đã gitignore) thì ghi lại, không sửa trong S27.

- [ ] **Step 3: Thử form trên trình duyệt ở 375px**

Chạy `pnpm dev`, đăng nhập admin (runbook `docs/runbooks/admin-login.md`), mở `/dia-diem/moi` ở chế độ 375×812:

1. "Cũng phục vụ" hiện Ăn uống, Tham quan, Hoạt động khi danh mục chính là Cà phê; tích Ăn uống và Hoạt động thì ô Tham quan bị khoá.
2. Đổi danh mục chính sang Ăn uống: Ăn uống tự bỏ khỏi "Cũng phục vụ", danh sách lựa chọn đổi theo.
3. "Mái che" có 4 lựa chọn dạng khối, chữ không bị cắt, vùng bấm từ 44px; không cuộn ngang.
4. Lưu nháp với tên "Quán Thử Giả Lập", danh mục Cà phê, phụ Ăn uống, mái che "Có cả chỗ che mưa và chỗ ngoài trời"; tải lại trang: các lựa chọn giữ nguyên.
5. Kích hoạt địa điểm đó (ghim, dán giờ, chọn nguồn xác nhận), mở web `http://localhost:3100/da-lat/an-uong`: quán hiện với dòng "Cà phê, Ăn uống · …"; xoá địa điểm thử khỏi DB local sau khi xong.

- [ ] **Step 4: Commit**

```bash
git add docs/backlog.md docs/decisions.md docs/technical-design.md docs/ui-spec.md docs/product-spec.md docs/data-collection.md CLAUDE.md
git commit -m "docs: S27 record also categories and cover rules"
```

- [ ] **Step 5: Báo chủ dự án**

Báo các commit, kết quả Step 2 và Step 3, những gì còn chờ (staging, điện thoại thật), và lưu ý các story sau (S11, S12, S15, S17, S21, S24) làm theo luật đã ghi trong tài liệu.
