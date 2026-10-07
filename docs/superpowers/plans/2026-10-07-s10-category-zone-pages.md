# S10 Trang danh mục và khu vực: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang danh mục `/da-lat/{ca-phe,an-uong,tham-quan,hoat-dong}` và trang khu vực `/da-lat/khu-vuc/{slug}` render SSR, lọc được theo thẻ (tags), phân trang bằng cursor, URL và cache đúng technical-design mục 11.

**Architecture:** API mở rộng `GET /v1/cities/:city/places` (S09) thêm `tags` (phải có đủ mọi thẻ), `zone` (slug cụm) và `cursor`; trả thêm `nextCursor` và `tags` (số chỗ theo thẻ, để vẽ chip lọc). Cursor là khoá xếp hạng "nổi bật" của chỗ cuối trang (`{owner}.{lastVerifiedAt}.{slug}`), nên dữ liệu đổi giữa hai lần tải cũng không trùng, không sót. Web thêm hai trang Nuxt dùng chung widget danh sách: chip thẻ là form GET (chạy không cần JS, bot không đi lan ra mọi tổ hợp thẻ), nút "Xem thêm" là link `?cursor=` (bot đi theo được tới từng địa điểm), có JS thì tải thêm và nối vào danh sách. Trang có `?tags=` hoặc `?cursor=` là `noindex, follow`; mọi biến thể cache SWR 1 giờ.

**Tech Stack:** Nuxt 4.5 (Nitro 2.13, vue-router 5), Vue 3.5, NestJS 12, Mongoose 9, Zod 4.6, Vitest 5, MongoDB 8.

**Spec:** `docs/backlog.md` S10 (*Lọc theo tags; phân trang cursor; URL đúng mục 11 tài liệu kỹ thuật*), `docs/technical-design.md` mục 3 (Place, index), 6 (API, quy ước cursor `?cursor=&limit=` tối đa 50), 11 (URL, cache, index), `docs/ui-spec.md` mục 3 (giọng văn), 4 (chip danh mục, thẻ địa điểm), 5 (trạng thái đang tải, rỗng, lỗi; desktop 2–3 cột), 11 (truy cập, hiệu năng), `docs/product-spec.md` mục cụm khu vực, `docs/data-collection.md` (tab "Tags"), ADR 0010, 0011. Nền S09: `docs/superpowers/plans/2026-10-07-s09-city-home.md`.

## Điều kiện trước khi bắt đầu

S10 dùng lại gần hết phần S09 làm (endpoint `/places`, `PlaceCard`, `RdPlaceList`, `RdCityHeader`, `useCity`, `page-status`). Ngày lập plan, nhánh `feat/S09-city-home` còn thiếu Task 13 (trang `/da-lat/tim-kiem`) và Task 14 (tài liệu, CI) của plan S09, và chưa merge vào `main`.

- Làm xong S09 Task 13–14 trước. Nếu S09 đã merge vào `main` thì tạo nhánh S10 từ `main`; nếu chưa thì tạo từ đầu nhánh `feat/S09-city-home` và mở PR S10 sau khi PR S09 đã merge (rebase lên `main` khi đó).
- Không có trang `tim-kiem.vue` thì S10 vẫn chạy: `/da-lat/tim-kiem` rơi vào `[category].vue`, không phải danh mục nên 404 như hiện tại.

## Quyết định khi lập plan (chủ dự án duyệt khi đọc plan)

Backlog chỉ ghi tiêu chí ngắn, nên các điểm sau được chọn theo tài liệu và lệ thường. Chủ dự án muốn khác thì sửa trước khi chạy plan.

1. **Nhiều thẻ là "và":** chọn "View đồi" + "Chill" thì chỉ hiện chỗ có cả hai thẻ (giống bộ lọc trên bản đồ). Kết quả rỗng thì có nút "Bỏ lọc".
2. **Chip thẻ lấy từ dữ liệu:** API trả các thẻ có trong danh mục/cụm đang xem kèm số chỗ, chip xếp nhiều chỗ trước. Tên tiếng Việt lấy từ `TAG_LABEL` trong `packages/contracts` (7 thẻ ví dụ trong tab "Tags" ở `docs/data-collection.md`: chill, view-doi, song-ao, gia-dinh, mao-hiem, an-sang, dac-san). Thẻ chưa có tên thì hiện slug (gạch nối thành khoảng trắng). Thêm thẻ vào tab "Tags" thì thêm tên vào `TAG_LABEL`. Danh sách thẻ quản lý trong admin để sau.
3. **Phân trang:** 20 chỗ mỗi trang, thứ tự "nổi bật" như trang chủ (quán đã xác nhận trước, rồi xác minh gần nhất). Nút "Xem thêm" là link `?cursor=…`: chưa có JS (hoặc bot, hoặc mở tab mới) thì sang trang sau, có nút "Về đầu danh sách"; có JS thì nối thêm vào danh sách, URL giữ nguyên, focus chuyển tới thẻ đầu tiên vừa thêm. Tìm theo từ khoá (`q`) chưa phân trang (S13).
4. **URL lọc:** `?tags=chill,view-doi` (dấu phẩy, sắp a-z) và `?cursor=…`. Hai loại này là `noindex, follow`; trang gốc vẫn index. Chip thẻ là nút trong form GET chứ không phải link, nên bot không đi lan ra mọi tổ hợp thẻ. Canonical, Open Graph, JSON-LD để S17.
5. **Trang khu vực** hiện mọi danh mục có trang công khai (cà phê, ăn uống, tham quan, hoạt động) trong cụm, cùng bộ lọc thẻ. Cụm không có trong thành phố thì 404 (cả API và web). Rỗng: "Khu này mình chưa ghi chép chỗ nào. Xem khu Trung tâm nhé?" (ui-spec mục 5).
6. **Liên kết giữa các trang:** trang danh mục có hàng chip danh mục (chip đang xem tô đậm) và khối "Theo khu vực" (link 4 cụm). Trang khu vực có khối "Theo khu vực". Hiện chưa có link nào trỏ tới trang khu vực, khối này giúp khách và Google tìm thấy chúng. Để tô chip đang xem, `packages/ui/src/components.css` thêm `[aria-current="page"]` vào kiểu "đang chọn" của `.rd-chip--filter` (NuxtLink tự gắn thuộc tính này).

## Global Constraints

- TypeScript strict ở mọi package, kể cả `noUncheckedIndexedAccess`. Không dùng `any`, `@ts-ignore`, không dùng `!` để bỏ kiểm null. Không nâng TypeScript lên 7.
- Kiểu dữ liệu đi qua API định nghĩa bằng Zod trong `packages/contracts`; API validate bằng đúng schema đó qua `ZodValidationPipe` (ADR 0011). Lỗi trả `{ code, message, details? }`: tham số sai là 400 `VALIDATION_FAILED`, thành phố hoặc cụm không có là 404 `NOT_FOUND`.
- Mọi truy vấn có `cityId`. Trang công khai chỉ hiện địa điểm `status = active` của thành phố đang `active`; trang danh mục, khu vực chỉ hiện `PUBLIC_CATEGORIES` (không có `stay`, `shop`).
- Không bịa dữ liệu địa điểm thật. Test và dữ liệu xem thử chỉ dùng tên có chữ "Giả Lập", toạ độ quanh `[0, 0]`, xoá sau khi xem.
- URL theo technical-design mục 11 và ADR 0010: `/{city}/ca-phe`, `/an-uong`, `/tham-quan`, `/hoat-dong`, `/{city}/khu-vuc/{zoneSlug}`. Không đổi, không xoá route công khai có sẵn. Hai trang mới cache SWR 1 giờ.
- Web: màu, font, bo góc, viền chỉ dùng biến trong `packages/ui/src/tokens.css`; class component dùng `rd-…` có sẵn; component Vue tên `Rd…`; `--accent` luôn đi với chữ `--ink`.
- Vùng bấm tối thiểu 44×44px (link nằm trong câu chữ được miễn). Dùng đúng thẻ `<a href>`/`NuxtLink`, `<button>`, `<form>`. Thiết kế cho 390px trước; từ 1024px nội dung tối đa 1200px, danh sách 3 cột.
- FSD trong `apps/web/app/`: `pages` → `widgets` → `features` → `entities` → `shared`. Chỉ import từ lớp thấp hơn, không import ngang hai slice cùng lớp.
- Chữ hiển thị viết tiếng Việt theo giọng văn ui-spec mục 3. Code, tên biến, tên file tiếng Anh; file kebab-case, component Vue PascalCase.
- Không thêm thư viện. Ghi quyết định mới vào `docs/decisions.md` (Task 8).
- Cổng local: web 3100, API 3101 (`docs/decisions.md` 2026-10-07).
- Nhánh `feat/S10-category-zone-pages`. Commit theo Conventional Commits có ID story (`feat: S10 …`). Chỉ `git add` đúng đường dẫn đã liệt kê; không thêm `.pnpm-store/` hay plan S04 đang chưa track.
- Trước mỗi commit, lint, typecheck, test của các package vừa sửa phải xanh. Task 8 chạy `pnpm turbo run lint typecheck test build` cho cả repo.

## Review Focus

1. **Dữ liệu đổi giữa hai lần bấm "Xem thêm".** Có chỗ mới được xác minh (nhảy lên đầu), chỗ ở cursor bị ẩn, chỗ khác bị sửa. Trang sau không được lặp chỗ đã hiện, không bỏ sót chỗ chưa hiện, không lỗi 500. Kiểm ở Task 3 (`pageByFeatured` với dữ liệu đổi), Task 4 (e2e: chèn và ẩn giữa hai lần gọi) và Task 5 (`appendUnique` bỏ chỗ trùng phía web).
2. **URL gõ tay hoặc cũ.** Ví dụ `?tags=View Đồi`, `?tags=a&tags=b`, 15 thẻ, `?tags=constructor`, cursor cũ hoặc bị cắt. Trang vẫn trả 200: phần sai bị bỏ qua, không gửi nguyên lên API để nhận 400 rồi thành trang lỗi. Chip của thẻ lạ không hiện chữ rác. Kiểm ở Task 2 (`tagLabel('constructor')`), Task 5 (`parseListingQuery`), Task 6 Step 8 (curl).
3. **Bot và index.** Trang gốc index và cache SWR 1 giờ; trang lọc và trang sau là `noindex, follow`; bot không đi lan ra mọi tổ hợp thẻ (chip là nút trong form, không phải link) nhưng vẫn đi theo "Xem thêm" tới từng địa điểm. Kiểm ở Task 5 (`isIndexableListing`), Task 6 Step 8 và Task 7 Step 5 (curl thẻ meta và header `cache-control`).
4. **Slug không tồn tại.** Cụm không có hoặc của thành phố khác, danh mục chưa có trang (`luu-tru`, `mua-sam`), slug tiếng Anh (`cafe`), `/da-lat/khu-vuc` không có slug, thành phố không có. Tất cả phải là 404 với `cache-control: no-store`, không phải 200 rỗng hay 500. Kiểm ở Task 2 (`categoryFromUrlSlug`), Task 4 (e2e cụm 404) và Task 7 Step 5 (curl).
5. **Mạng chập chờn khi tải thêm.** Bấm "Xem thêm" lúc mất mạng thì hiện câu báo lỗi, bấm lại được; bấm hai lần liền không nhân đôi thẻ; Ctrl+click mở tab mới với trang `?cursor=`; bấm "Thử lại" ở dải lỗi đầu trang thì danh sách cập nhật theo dữ liệu mới. Kiểm ở Task 5 (`appendUnique`), Task 6 (widget có `watch` theo dữ liệu trang, chặn bấm khi đang tải) và Task 6 Step 9 (trình duyệt, chế độ offline).

## Tiêu chí nghiệm thu → bước kiểm

| Tiêu chí S10 | Kiểm ở |
| --- | --- |
| Lọc theo tags | Task 1 (`tags` trong query), Task 3 (`hasAllTags`, `countTags`), Task 4 (e2e lọc "và", đếm thẻ), Task 5 (`parseListingQuery`, `tagChips`), Task 6 Step 8–9 (curl `?tags=`, bấm chip trên trình duyệt, có và không có JS), Task 7 Step 3 (trang khu vực) |
| Phân trang cursor | Task 1 (`PlaceCursor`), Task 3 (`pageByFeatured`), Task 4 (e2e đi hết trang, dữ liệu đổi giữa hai lần gọi), Task 6 Step 8 (đi theo link "Xem thêm"), Task 6 Step 9 (tải thêm có JS) |
| URL đúng mục 11 tài liệu kỹ thuật | Task 2 (`categoryFromUrlSlug`), Task 6 Step 8 và Task 7 Step 3 (4 trang danh mục, trang khu vực trả 200), Task 7 Step 5 (`s-maxage=3600` trên bản build; slug sai trả 404; trang lọc `noindex`), Task 8 (ghi `?tags=`, `?cursor=` vào technical-design mục 11) |
| DoD: logic có điều kiện có unit test | Task 1, 2 (contracts), Task 3 (API), Task 5 (web) |
| DoD: CI xanh | Task 8 Step 5 |
| DoD: thử trên staging và điện thoại thật | Chưa làm được vì S02 chưa xong. Task 6 Step 9 thử 390px trên DevTools; Task 8 ghi lại việc còn thiếu |

## Ngoài phạm vi S10

- Canonical, Open Graph, JSON-LD `ItemList`/`BreadcrumbList`, sitemap (S17). Xoá cache Cloudflare khi sửa dữ liệu (worker, sau S02).
- Chuẩn hoá cache key cho query lạ (mỗi URL khác query là một mục cache SWR của Nitro): xử lý ở S02 bằng Cloudflare cache rule và giới hạn bộ nhớ cache.
- Lọc "Đang mở", "Trong nhà", lọc theo cụm trên trang danh mục (chip lọc của bản đồ, S12). Lọc theo `bbox`, `near` (S12).
- Phân trang kết quả tìm kiếm, Atlas Search (S13). Danh sách curate `/da-lat/top/…` (S14).
- Quản lý danh sách thẻ trong admin; hiện số chỗ trên chip hay tổng số chỗ của trang.

## Cấu trúc file

```text
packages/contracts/src/
  place-cursor.ts        FeaturedKey, PlaceCursor (chuỗi ↔ khoá), encodePlaceCursor          (mới)
  place-cursor.test.ts                                                                         (mới)
  place.ts               PlaceListQuery + tags, zone, cursor; MAX_FILTER_TAGS; TagCount;
                         PlaceListResponse + nextCursor, tags (Task 4)                         (sửa)
  place.test.ts                                                                                (sửa)
  city.ts                + ZoneRef                                                             (sửa)
  labels.ts              + TAG_LABEL, tagLabel(), categoryFromUrlSlug()                        (sửa)
  labels.test.ts                                                                               (sửa)
  index.ts               export place-cursor                                                   (sửa)
apps/api/src/modules/
  places/place-listing.ts      + featuredKey, compareFeaturedKey, pageByFeatured, hasAllTags, countTags (sửa)
  places/place-listing.test.ts                                                                 (sửa)
  places/places.repository.ts  listActive(cityId, { categories, zoneId }), đọc thêm tags       (sửa)
  places/places.service.ts     list(): cụm, thẻ, cursor, đếm thẻ                               (sửa)
  places/places.controller.test.ts                                                             (sửa)
  cities/cities.repository.ts  + findZone()                                                    (sửa)
  cities/cities.service.ts     + resolveZone()                                                 (sửa)
packages/ui/src/components.css  .rd-chip--filter[aria-current="page"] tô như đang chọn         (sửa)
apps/web/
  vitest.config.ts                               alias ~ như Nuxt                              (sửa)
  nuxt.config.ts                                 routeRules SWR cho danh mục, khu vực          (sửa)
  app/assets/base.css                            + .visually-hidden                            (sửa)
  app/entities/place/api/places.ts               PlaceListParams + zone, tags, cursor; fetchPlacePage (sửa)
  app/entities/place/lib/listing-query.ts        đọc URL lọc, link, key, index, appendUnique   (mới)
  app/entities/place/lib/listing-query.test.ts                                                 (mới)
  app/features/place-tag-filter/lib/tag-chips.ts                                               (mới)
  app/features/place-tag-filter/lib/tag-chips.test.ts                                          (mới)
  app/features/place-tag-filter/ui/RdTagFilter.vue                                             (mới)
  app/widgets/place-listing/ui/RdPlaceListing.vue                                              (mới)
  app/widgets/zone-links/ui/RdZoneLinks.vue                                                    (mới)
  app/pages/[city]/[category].vue                                                              (mới)
  app/pages/[city]/khu-vuc/[zone].vue                                                          (mới)
  app/pages/[...slug].vue                        sửa comment (danh mục không còn 404)          (sửa)
docs/decisions.md, docs/technical-design.md, CLAUDE.md, docs/backlog.md (hỏi trước)            (sửa)
```

## Lệnh hay dùng

```bash
pnpm infra:up                                                     # MongoDB cho test tích hợp API
pnpm --filter @ranhduong/contracts exec vitest run src/<file>.test.ts
pnpm turbo run build --filter=@ranhduong/contracts                # API và web đọc contracts từ dist/
pnpm --filter @ranhduong/api exec vitest run src/modules/places
pnpm --filter @ranhduong/web exec vitest run
pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web lint
```

---

### Task 1: Contracts cho query lọc thẻ, cụm và cursor

**Files:**
- Create: `packages/contracts/src/place-cursor.ts`
- Create: `packages/contracts/src/place-cursor.test.ts`
- Modify: `packages/contracts/src/place.ts` (`PlaceListQuery`, thêm `MAX_FILTER_TAGS`, `TagCount`)
- Modify: `packages/contracts/src/place.test.ts`
- Modify: `packages/contracts/src/city.ts` (thêm `ZoneRef`)
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: `Slug`, `ObjectIdString` (`common.ts`), `PlaceCategory` (`enums.ts`).
- Produces:
  - `interface FeaturedKey { owner: boolean; verifiedAt: number | null; slug: string }`
  - `PlaceCursor`: Zod, input `string`, output `FeaturedKey`. Định dạng `{0|1}.{số mili giây | -}.{slug}`, ví dụ `1.1759622400000.quan-gia-lap`.
  - `encodePlaceCursor(key: FeaturedKey): string`
  - `MAX_FILTER_TAGS = 10`
  - `PlaceListQuery` output: `{ q?: string; category?: PlaceCategory[]; tags?: string[]; zone?: string; cursor?: FeaturedKey; limit: number }`; `cursor` đi cùng `q` thì lỗi ở path `['cursor']`.
  - `TagCount = { slug: string; count: number }` (Zod + type).
  - `ZoneRef = { id: string; slug: string; name: string }` (Zod + type).

- [ ] **Step 1: Tạo nhánh**

```bash
git switch main && git pull                      # hoặc: git switch feat/S09-city-home (xem "Điều kiện trước khi bắt đầu")
git switch -c feat/S10-category-zone-pages
```

- [ ] **Step 2: Viết test cho cursor**

Tạo `packages/contracts/src/place-cursor.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { encodePlaceCursor, PlaceCursor, type FeaturedKey } from './place-cursor.js';

describe('PlaceCursor', () => {
  it('ghi rồi đọc lại ra đúng khoá, kể cả chỗ chưa xác minh', () => {
    const keys: FeaturedKey[] = [
      { owner: true, verifiedAt: 1759622400000, slug: 'quan-gia-lap' },
      { owner: false, verifiedAt: null, slug: 'diem-gia-lap-2' },
      { owner: false, verifiedAt: 0, slug: 'a' },
    ];
    for (const key of keys) expect(PlaceCursor.parse(encodePlaceCursor(key))).toEqual(key);
  });

  it('định dạng {owner}.{mili giây | -}.{slug}', () => {
    expect(encodePlaceCursor({ owner: true, verifiedAt: 1759622400000, slug: 'quan-gia-lap' })).toBe('1.1759622400000.quan-gia-lap');
    expect(encodePlaceCursor({ owner: false, verifiedAt: null, slug: 'b' })).toBe('0.-.b');
  });

  it('từ chối chuỗi sai định dạng', () => {
    const invalid = [
      '',
      'abc',
      '2.-.a',
      '1.-.',
      '1..a',
      '1.-1.a',
      '1.01.a',
      '1.1.5.a',
      '1.-.Quan',
      '1.-.a_b',
      '1.1234567890123456.a',
      ' 1.-.a',
      '1.-.a\n',
    ];
    for (const s of invalid) expect(PlaceCursor.safeParse(s).success, JSON.stringify(s)).toBe(false);
  });
});
```

- [ ] **Step 3: Viết test cho query mới**

Trong `packages/contracts/src/place.test.ts`, sửa test đầu của `describe('PlaceListQuery')` và thêm 3 test vào cuối khối đó:

```ts
  it('mặc định 20 kết quả, không lọc, không từ khoá', () => {
    const query = PlaceListQuery.parse({});
    expect(query.limit).toBe(20);
    expect(query.q).toBeUndefined();
    expect(query.category).toBeUndefined();
    expect(query.tags).toBeUndefined();
    expect(query.zone).toBeUndefined();
    expect(query.cursor).toBeUndefined();
  });
```

```ts
  it('đọc nhiều thẻ cách nhau bằng dấu phẩy, tối đa 10 thẻ, mỗi thẻ là slug', () => {
    expect(PlaceListQuery.parse({ tags: 'view-doi,chill' }).tags).toEqual(['view-doi', 'chill']);
    expect(PlaceListQuery.parse({ tags: ' chill , ' }).tags).toEqual(['chill']);
    expect(PlaceListQuery.parse({ tags: ',' }).tags).toBeUndefined();
    const ten = Array.from({ length: 10 }, (_, i) => `the-${i}`).join(',');
    expect(PlaceListQuery.safeParse({ tags: ten }).success).toBe(true);
    for (const tags of [`${ten},the-10`, 'View-Doi', 'view doi', 'sống-ảo']) {
      expect(PlaceListQuery.safeParse({ tags }).success, tags).toBe(false);
    }
  });

  it('cụm là slug', () => {
    expect(PlaceListQuery.parse({ zone: 'trung-tam' }).zone).toBe('trung-tam');
    expect(PlaceListQuery.safeParse({ zone: 'Trung Tâm' }).success).toBe(false);
  });

  it('cursor đọc ra khoá xếp hạng; sai định dạng hoặc đi cùng từ khoá thì lỗi ở trường cursor', () => {
    expect(PlaceListQuery.parse({ cursor: '1.-.quan-gia-lap' }).cursor).toEqual({ owner: true, verifiedAt: null, slug: 'quan-gia-lap' });
    expect(PlaceListQuery.safeParse({ cursor: 'abc' }).success).toBe(false);
    const withQ = PlaceListQuery.safeParse({ q: 'gia lap', cursor: '1.-.quan-gia-lap' });
    expect(withQ.success).toBe(false);
    expect(withQ.error?.issues.map((issue) => issue.path)).toEqual([['cursor']]);
    // Từ khoá chỉ có khoảng trắng coi như không có, nên đi cùng cursor vẫn được.
    expect(PlaceListQuery.safeParse({ q: '   ', cursor: '1.-.quan-gia-lap' }).success).toBe(true);
  });
```

- [ ] **Step 4: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts exec vitest run src/place-cursor.test.ts src/place.test.ts`
Expected: FAIL. `place-cursor.test.ts` báo không tìm thấy `./place-cursor.js`; `place.test.ts` báo `tags`, `zone`, `cursor` không được đọc (giá trị `undefined` hoặc parse thành công khi lẽ ra phải lỗi).

- [ ] **Step 5: Tạo `packages/contracts/src/place-cursor.ts`**

```ts
import { z } from 'zod';

/**
 * Khoá xếp hạng "nổi bật" của một địa điểm: quán đã xác nhận trước, rồi xác minh gần nhất (chưa xác minh xếp cuối),
 * cùng hạng theo slug. Cursor phân trang là khoá của chỗ cuối trang trước; trang sau lấy các chỗ đứng sau khoá đó,
 * nên có chỗ mới thêm hay bị ẩn giữa hai lần gọi cũng không trùng, không sót (technical-design mục 6).
 */
export interface FeaturedKey {
  owner: boolean;
  /** lastVerifiedAt tính bằng mili giây; null khi chưa xác minh. */
  verifiedAt: number | null;
  slug: string;
}

// `{owner}.{verifiedAt | -}.{slug}`, ví dụ `1.1759622400000.ca-phe-gia-lap`. Slug không có dấu chấm nên tách được;
// tối đa 15 chữ số để Number() không mất chính xác.
const CURSOR_PATTERN = /^[01]\.(?:0|[1-9]\d{0,14}|-)\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Cursor trong query `?cursor=`, đọc ra FeaturedKey; sai định dạng thì báo lỗi. */
export const PlaceCursor = z
  .string()
  .regex(CURSOR_PATTERN, 'Cursor không hợp lệ')
  .transform((s): FeaturedKey => {
    const [owner, verifiedAt, slug = ''] = s.split('.');
    return { owner: owner === '1', verifiedAt: verifiedAt === '-' ? null : Number(verifiedAt), slug };
  });

/** Ngược lại của PlaceCursor. verifiedAt là Date.getTime() của ngày xác minh (số nguyên không âm). */
export function encodePlaceCursor(key: FeaturedKey): string {
  return `${key.owner ? 1 : 0}.${key.verifiedAt ?? '-'}.${key.slug}`;
}
```

- [ ] **Step 6: Sửa `PlaceListQuery` và thêm `TagCount` trong `packages/contracts/src/place.ts`**

Thêm import ở đầu file (cạnh các import có sẵn):

```ts
import { PlaceCursor } from './place-cursor.js';
```

Thay toàn bộ đoạn từ `const MAX_QUERY_LENGTH = 100;` tới hết khai báo `export type PlaceListQuery = …` bằng:

```ts
const MAX_QUERY_LENGTH = 100;

/** Số thẻ lọc tối đa trong một lần gọi (`tags=a,b`). */
export const MAX_FILTER_TAGS = 10;

/** Chuỗi nhiều giá trị cách nhau bằng dấu phẩy (`a,b`); rỗng hoặc chỉ có dấu phẩy thì coi như không có. */
function commaList<T extends z.ZodType<unknown, string>>(item: T) {
  return z
    .string()
    .optional()
    .transform((s) => {
      const parts = s?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];
      return parts.length > 0 ? parts : undefined;
    })
    .pipe(z.array(item).optional());
}

/** Query của GET /v1/cities/:city/places. */
export const PlaceListQuery = z
  .object({
    /** Từ khoá tìm không dấu; rỗng hoặc chỉ có khoảng trắng thì coi như không có. */
    q: z
      .string()
      .trim()
      .max(MAX_QUERY_LENGTH, `Từ khoá tối đa ${MAX_QUERY_LENGTH} ký tự`)
      .optional()
      .transform((s) => s || undefined),
    /** Một hoặc nhiều danh mục, cách nhau bằng dấu phẩy: `category=cafe,food`. */
    category: commaList(PlaceCategory),
    /** Một hoặc nhiều thẻ: `tags=view-doi,chill`; địa điểm phải có đủ mọi thẻ. */
    tags: commaList(Slug).refine((tags) => (tags?.length ?? 0) <= MAX_FILTER_TAGS, `Tối đa ${MAX_FILTER_TAGS} thẻ`),
    /** Slug cụm khu vực trong thành phố: `zone=trung-tam`. */
    zone: Slug.optional(),
    /** `nextCursor` của trang trước. */
    cursor: PlaceCursor.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .superRefine((query, ctx) => {
    // Kết quả tìm xếp theo độ khớp chứ không theo thứ tự nổi bật, nên chưa phân trang được (S13).
    if (query.q && query.cursor) {
      ctx.addIssue({ code: 'custom', path: ['cursor'], message: 'Tìm theo từ khoá chưa phân trang được' });
    }
  });
export type PlaceListQuery = z.infer<typeof PlaceListQuery>;

/** Một thẻ và số địa điểm có thẻ đó. */
export const TagCount = z.object({ slug: Slug, count: z.number().int().positive() });
export type TagCount = z.infer<typeof TagCount>;
```

`PlaceListResponse` giữ nguyên ở task này (Task 4 mới đổi, cùng lúc với API, để mọi commit đều typecheck xanh).

- [ ] **Step 7: Thêm `ZoneRef` vào `packages/contracts/src/city.ts`**

Thêm ngay dưới khai báo `export type CityRef = …`:

```ts
/** Cụm khu vực đã xác định, truyền giữa các module của API (id là ObjectId dạng chuỗi). */
export const ZoneRef = z.object({ id: ObjectIdString, slug: Slug, name: z.string().min(1) });
export type ZoneRef = z.infer<typeof ZoneRef>;
```

- [ ] **Step 8: Export file mới trong `packages/contracts/src/index.ts`**

Thêm dòng ngay trên `export * from './place.js';`:

```ts
export * from './place-cursor.js';
```

- [ ] **Step 9: Chạy test, thấy xanh; typecheck, lint, build contracts**

Run: `pnpm --filter @ranhduong/contracts exec vitest run && pnpm --filter @ranhduong/contracts typecheck && pnpm --filter @ranhduong/contracts lint && pnpm turbo run build --filter=@ranhduong/contracts`
Expected: PASS hết. Kiểm thêm API và web vẫn typecheck (query có thêm trường nhưng chưa ai dùng): `pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/web typecheck` → PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/contracts/src/place-cursor.ts packages/contracts/src/place-cursor.test.ts packages/contracts/src/place.ts packages/contracts/src/place.test.ts packages/contracts/src/city.ts packages/contracts/src/index.ts
git commit -m "feat: S10 add tag, zone and cursor params to place list query"
```

---

### Task 2: Tên thẻ và tra danh mục theo slug URL

**Files:**
- Modify: `packages/contracts/src/labels.ts`
- Modify: `packages/contracts/src/labels.test.ts`

**Interfaces:**
- Consumes: `PUBLIC_CATEGORIES`, `CATEGORY_URL_SLUG`, `PublicCategory` (đã có trong `labels.ts`).
- Produces:
  - `TAG_LABEL: Readonly<Record<string, string>>`
  - `tagLabel(slug: string): string`
  - `categoryFromUrlSlug(urlSlug: string): PublicCategory | undefined`

- [ ] **Step 1: Viết test**

Trong `packages/contracts/src/labels.test.ts`, sửa dòng import thành:

```ts
import {
  CATEGORY_LABEL,
  CATEGORY_URL_SLUG,
  categoryFromUrlSlug,
  formatTripLength,
  itineraryMeta,
  PUBLIC_CATEGORIES,
  TAG_LABEL,
  tagLabel,
} from './labels.js';
```

Thêm test này vào cuối khối `describe('danh mục', …)`:

```ts
  it('đọc danh mục từ slug URL; slug lạ hay danh mục chưa có trang thì không có', () => {
    for (const category of PUBLIC_CATEGORIES) expect(categoryFromUrlSlug(CATEGORY_URL_SLUG[category])).toBe(category);
    for (const slug of ['cafe', 'luu-tru', 'mua-sam', 'CA-PHE', '', 'constructor', 'khu-vuc', 'tim-kiem']) {
      expect(categoryFromUrlSlug(slug), slug).toBeUndefined();
    }
  });
```

Thêm khối mới ở cuối file:

```ts
describe('thẻ', () => {
  it('thẻ có trong TAG_LABEL hiện tên tiếng Việt; mọi khoá là slug hợp lệ', () => {
    expect(tagLabel('view-doi')).toBe('View đồi');
    expect(tagLabel('song-ao')).toBe('Sống ảo');
    for (const slug of Object.keys(TAG_LABEL)) expect(Slug.safeParse(slug).success, slug).toBe(true);
  });
  it('thẻ chưa có tên thì hiện slug, viết hoa chữ đầu; không lấy nhầm thuộc tính của Object', () => {
    expect(tagLabel('cho-dau-xe-rong')).toBe('Cho dau xe rong');
    expect(tagLabel('constructor')).toBe('Constructor');
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts exec vitest run src/labels.test.ts`
Expected: FAIL, `categoryFromUrlSlug`, `tagLabel`, `TAG_LABEL` chưa được export (`is not a function` / `undefined`).

- [ ] **Step 3: Thêm vào `packages/contracts/src/labels.ts`**

Thêm ngay dưới khai báo `CATEGORY_URL_SLUG`:

```ts
/** Danh mục của trang `/{city}/{slug}`; slug không phải danh mục công khai thì undefined. */
export function categoryFromUrlSlug(urlSlug: string): PublicCategory | undefined {
  return PUBLIC_CATEGORIES.find((category) => CATEGORY_URL_SLUG[category] === urlSlug);
}

/**
 * Tên hiển thị của thẻ. Thẻ được phép dùng nằm ở tab "Tags" của Google Sheet nhập liệu (docs/data-collection.md);
 * thêm thẻ vào tab đó thì thêm tên ở đây.
 */
export const TAG_LABEL: Readonly<Record<string, string>> = {
  chill: 'Chill',
  'view-doi': 'View đồi',
  'song-ao': 'Sống ảo',
  'gia-dinh': 'Gia đình',
  'mao-hiem': 'Mạo hiểm',
  'an-sang': 'Ăn sáng',
  'dac-san': 'Đặc sản',
};

/** Tên của thẻ; thẻ chưa có trong TAG_LABEL thì hiện slug, gạch nối thành khoảng trắng, viết hoa chữ đầu. */
export function tagLabel(slug: string): string {
  // Object.hasOwn: slug "constructor" không được lấy nhầm hàm của Object.prototype.
  if (Object.hasOwn(TAG_LABEL, slug)) return TAG_LABEL[slug] ?? slug;
  const words = slug.replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
```

- [ ] **Step 4: Chạy test, thấy xanh; typecheck, lint, build**

Run: `pnpm --filter @ranhduong/contracts exec vitest run && pnpm --filter @ranhduong/contracts typecheck && pnpm --filter @ranhduong/contracts lint && pnpm turbo run build --filter=@ranhduong/contracts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/labels.ts packages/contracts/src/labels.test.ts
git commit -m "feat: S10 add tag labels and category lookup by url slug"
```

---

### Task 3: Phân trang theo khoá nổi bật, lọc và đếm thẻ (hàm thuần trong API)

**Files:**
- Modify: `apps/api/src/modules/places/place-listing.ts`
- Modify: `apps/api/src/modules/places/place-listing.test.ts`
- Modify: `apps/api/src/modules/places/places.repository.ts` (đọc thêm `tags` để `ListedPlace` đủ trường)

**Interfaces:**
- Consumes: `FeaturedKey`, `PlaceCursor`, `encodePlaceCursor`, `TagCount` (Task 1).
- Produces (Task 4 dùng):
  - `ListedPlace` có thêm `tags: string[]`.
  - `featuredKey(place: ListedPlace): FeaturedKey`
  - `compareFeaturedKey(a: FeaturedKey, b: FeaturedKey): number`
  - `compareFeatured(a: ListedPlace, b: ListedPlace): number` (giữ tên và hành vi cũ)
  - `interface FeaturedPage { items: ListedPlace[]; nextCursor?: string }`
  - `pageByFeatured(places: ListedPlace[], after: FeaturedKey | undefined, limit: number): FeaturedPage`
  - `hasAllTags(place: ListedPlace, tags: readonly string[]): boolean`
  - `countTags(places: ListedPlace[]): TagCount[]`

- [ ] **Step 1: Viết test**

Trong `apps/api/src/modules/places/place-listing.test.ts`:

Sửa import đầu file thành:

```ts
import { PlaceCursor, type FeaturedKey } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import {
  cardNote,
  compareFeatured,
  countTags,
  featuredKey,
  hasAllTags,
  pageByFeatured,
  searchPlaces,
  toPlaceCard,
  type FeaturedPage,
  type ListedPlace,
} from './place-listing';
```

Thêm `tags: [],` vào object mặc định của hàm `place()` (ngay sau `aliases: [],`).

Thêm các khối sau vào cuối file:

```ts
describe('featuredKey', () => {
  it('khoá gồm đã xác nhận hay chưa, ngày xác minh (mili giây) và slug', () => {
    expect(featuredKey(place({ slug: 'a', verifySource: 'owner', lastVerifiedAt: new Date(1000) }))).toEqual({
      owner: true,
      verifiedAt: 1000,
      slug: 'a',
    });
    expect(featuredKey(place({ slug: 'b', verifySource: 'admin' }))).toEqual({ owner: false, verifiedAt: null, slug: 'b' });
  });
});

describe('pageByFeatured', () => {
  // Thứ tự nổi bật: a (owner, có ngày), b (owner, chưa xác minh), c (10/1), d (9/1), e (chưa xác minh).
  const all = [
    place({ slug: 'e' }),
    place({ slug: 'c', verifySource: 'admin', lastVerifiedAt: new Date('2026-10-01') }),
    place({ slug: 'a', verifySource: 'owner', lastVerifiedAt: new Date('2026-09-01') }),
    place({ slug: 'd', verifySource: 'admin', lastVerifiedAt: new Date('2026-09-01') }),
    place({ slug: 'b', verifySource: 'owner' }),
  ];
  const slugsOf = (page: FeaturedPage) => page.items.map((p) => p.slug);

  it('đi hết các trang theo nextCursor: không trùng, không sót, trang cuối không có nextCursor', () => {
    const seen: string[] = [];
    let after: FeaturedKey | undefined;
    for (let i = 0; i < 5; i++) {
      const page = pageByFeatured(all, after, 2);
      seen.push(...slugsOf(page));
      if (!page.nextCursor) break;
      after = PlaceCursor.parse(page.nextCursor);
    }
    expect(seen).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('nextCursor là khoá của chỗ cuối trang; vừa đủ một trang thì không có', () => {
    expect(pageByFeatured(all, undefined, 4).nextCursor).toBe(`0.${new Date('2026-09-01').getTime()}.d`);
    expect(pageByFeatured(all, undefined, 5).nextCursor).toBeUndefined();
    expect(pageByFeatured([], undefined, 5)).toEqual({ items: [] });
  });

  it('chỗ ở cursor bị ẩn, có chỗ mới chen vào trước hay sau cursor: trang sau vẫn tiếp đúng chỗ', () => {
    const first = pageByFeatured(all, undefined, 2);
    expect(slugsOf(first)).toEqual(['a', 'b']);
    const after = PlaceCursor.parse(first.nextCursor ?? '');
    const changed = [
      ...all.filter((p) => p.slug !== 'b'),
      // Mới xác minh, đứng trước cursor: khách đã qua chỗ này nên không hiện lại.
      place({ slug: 'aa', verifySource: 'owner', lastVerifiedAt: new Date('2026-10-05') }),
      // Đứng sau cursor: phải hiện.
      place({ slug: 'cc', verifySource: 'admin', lastVerifiedAt: new Date('2026-10-01') }),
    ];
    expect(slugsOf(pageByFeatured(changed, after, 10))).toEqual(['c', 'cc', 'd', 'e']);
  });

  it('cursor sau chỗ cuối cùng thì trang rỗng; không đổi thứ tự mảng đầu vào', () => {
    const before = all.map((p) => p.slug);
    expect(pageByFeatured(all, { owner: false, verifiedAt: null, slug: 'zzz' }, 2)).toEqual({ items: [] });
    pageByFeatured(all, undefined, 2);
    expect(all.map((p) => p.slug)).toEqual(before);
  });
});

describe('lọc và đếm thẻ', () => {
  const tagged = [
    place({ slug: 'a', tags: ['view-doi', 'chill'] }),
    place({ slug: 'b', tags: ['chill'] }),
    place({ slug: 'c', tags: ['chill', 'chill', 'an-sang'] }),
    place({ slug: 'd' }),
  ];
  const keep = (tags: string[]) => tagged.filter((p) => hasAllTags(p, tags)).map((p) => p.slug);

  it('hasAllTags: phải có đủ mọi thẻ; không lọc thẻ nào thì giữ hết', () => {
    expect(keep(['chill', 'view-doi'])).toEqual(['a']);
    expect(keep(['chill'])).toEqual(['a', 'b', 'c']);
    expect(keep([])).toEqual(['a', 'b', 'c', 'd']);
    expect(keep(['khong-ai-co'])).toEqual([]);
  });

  it('countTags: thẻ lặp trong một chỗ tính một lần; nhiều chỗ trước, bằng nhau theo slug', () => {
    expect(countTags(tagged)).toEqual([
      { slug: 'chill', count: 3 },
      { slug: 'an-sang', count: 1 },
      { slug: 'view-doi', count: 1 },
    ]);
    expect(countTags([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/places/place-listing.test.ts`
Expected: FAIL, `featuredKey`, `pageByFeatured`, `hasAllTags`, `countTags` chưa có (`is not a function`).

- [ ] **Step 3: Sửa `apps/api/src/modules/places/place-listing.ts`**

Sửa import đầu file thành:

```ts
import {
  CATEGORY_LABEL,
  encodePlaceCursor,
  needsOwnerConfirmation,
  type FeaturedKey,
  type OpeningSlot,
  type PlaceCard,
  type PlaceCategory,
  type TagCount,
  type VerifySource,
} from '@ranhduong/contracts';
import { matchScore } from '@ranhduong/geo';
```

Thêm `tags: string[];` vào `interface ListedPlace` (ngay sau `aliases: string[];`).

Thay hàm `compareFeatured` có sẵn bằng:

```ts
/** Khoá xếp hạng nổi bật của một địa điểm (cũng là nội dung cursor phân trang). */
export function featuredKey(place: ListedPlace): FeaturedKey {
  return { owner: place.verifySource === 'owner', verifiedAt: place.lastVerifiedAt?.getTime() ?? null, slug: place.slug };
}

/** Quán đã xác nhận trước, rồi xác minh gần nhất, chưa xác minh xếp cuối, cùng hạng theo slug. */
export function compareFeaturedKey(a: FeaturedKey, b: FeaturedKey): number {
  if (a.owner !== b.owner) return a.owner ? -1 : 1;
  const at = a.verifiedAt ?? Number.NEGATIVE_INFINITY;
  const bt = b.verifiedAt ?? Number.NEGATIVE_INFINITY;
  if (at !== bt) return bt > at ? 1 : -1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/** Thứ tự "nổi bật" của địa điểm (xem compareFeaturedKey). */
export function compareFeatured(a: ListedPlace, b: ListedPlace): number {
  return compareFeaturedKey(featuredKey(a), featuredKey(b));
}

export interface FeaturedPage {
  items: ListedPlace[];
  /** Khoá của chỗ cuối trang, chỉ có khi còn trang sau. */
  nextCursor?: string;
}

/**
 * Một trang theo thứ tự nổi bật, bắt đầu ngay sau `after` (khoá của chỗ cuối trang trước).
 * Không dựa vào vị trí trong mảng, nên chỗ ở cursor bị ẩn hay có chỗ mới chen vào thì trang sau vẫn không trùng, không sót.
 */
export function pageByFeatured(places: ListedPlace[], after: FeaturedKey | undefined, limit: number): FeaturedPage {
  const sorted = [...places].sort(compareFeatured);
  const start = after ? sorted.findIndex((place) => compareFeaturedKey(featuredKey(place), after) > 0) : 0;
  if (start === -1) return { items: [] };
  const items = sorted.slice(start, start + limit);
  const last = items.at(-1);
  return start + limit < sorted.length && last ? { items, nextCursor: encodePlaceCursor(featuredKey(last)) } : { items };
}

/** Địa điểm có đủ mọi thẻ cần lọc ("và"); không lọc thẻ nào thì luôn đúng. */
export function hasAllTags(place: ListedPlace, tags: readonly string[]): boolean {
  return tags.every((tag) => place.tags.includes(tag));
}

/** Số địa điểm theo từng thẻ (thẻ lặp trong một địa điểm tính một lần); nhiều chỗ trước, bằng nhau theo slug. */
export function countTags(places: ListedPlace[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const place of places) {
    for (const tag of new Set(place.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}
```

- [ ] **Step 4: Đọc thêm `tags` trong `apps/api/src/modules/places/places.repository.ts`**

Ba chỗ sửa, chưa đổi chữ ký `listActive` (Task 4 mới đổi):

Trong `CARD_FIELDS`, thêm `tags: 1,` ngay sau `aliases: 1,`.

Trong `interface CardRow`, thêm `tags?: string[];` ngay sau `aliases?: string[];`.

Trong `listActive`, phần `docs.map`, thêm `tags: d.tags ?? [],` ngay sau `aliases: d.aliases ?? [],`.

- [ ] **Step 5: Chạy test, thấy xanh; chạy cả module places, typecheck, lint**

Run: `pnpm infra:up && pnpm --filter @ranhduong/api exec vitest run src/modules/places && pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/api lint`
Expected: PASS hết, kể cả `places.controller.test.ts` của S09 (thứ tự nổi bật không đổi).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/places/place-listing.ts apps/api/src/modules/places/place-listing.test.ts apps/api/src/modules/places/places.repository.ts
git commit -m "feat: S10 page places by featured key and filter by tags"
```

---

### Task 4: `GET /v1/cities/:city/places` lọc cụm, thẻ và phân trang cursor

**Files:**
- Modify: `packages/contracts/src/place.ts` (`PlaceListResponse`)
- Modify: `packages/contracts/src/place.test.ts`
- Modify: `apps/api/src/modules/places/places.controller.test.ts`
- Modify: `apps/api/src/modules/cities/cities.repository.ts`
- Modify: `apps/api/src/modules/cities/cities.service.ts`
- Modify: `apps/api/src/modules/places/places.repository.ts`
- Modify: `apps/api/src/modules/places/places.service.ts`

**Interfaces:**
- Consumes: `PlaceListQuery`, `TagCount`, `ZoneRef` (Task 1); `pageByFeatured`, `hasAllTags`, `countTags`, `searchPlaces`, `toPlaceCard` (Task 3, S09).
- Produces:
  - `PlaceListResponse = { items: PlaceCard[]; nextCursor?: string; tags: TagCount[] }`.
  - `GET /v1/cities/:city/places?category=&tags=&zone=&cursor=&limit=&q=`: `zone` không có trong thành phố thì 404 `NOT_FOUND` ("Không tìm thấy khu vực"); `tags` của phản hồi đếm trên tập đã lọc thành phố, danh mục, cụm (chưa lọc thẻ, từ khoá); có `q` thì không có `nextCursor`.
  - `CitiesService.resolveZone(cityId: string, slug: string): Promise<ZoneRef>`.
  - `PlacesRepository.listActive(cityId: string, filter?: { categories?: PlaceCategory[]; zoneId?: string }): Promise<ListedPlace[]>`.

- [ ] **Step 1: Viết test cho response mới (contracts)**

Trong `packages/contracts/src/place.test.ts`, thêm `PlaceListResponse` vào import từ `./place.js`, rồi thêm khối ở cuối file:

```ts
describe('PlaceListResponse', () => {
  it('nextCursor không bắt buộc; thẻ có số đếm dương', () => {
    expect(PlaceListResponse.safeParse({ items: [], tags: [] }).success).toBe(true);
    expect(PlaceListResponse.safeParse({ items: [], tags: [{ slug: 'chill', count: 2 }], nextCursor: '0.-.a' }).success).toBe(true);
    expect(PlaceListResponse.safeParse({ items: [] }).success).toBe(false);
    expect(PlaceListResponse.safeParse({ items: [], tags: [{ slug: 'chill', count: 0 }] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Viết test e2e cho endpoint**

Trong `apps/api/src/modules/places/places.controller.test.ts`, thêm các test sau vào trong `describe('GET /v1/cities/:city/places')`, ngay trước test `'thành phố không có hoặc đang tắt thì 404 NOT_FOUND'`:

```ts
  it('lọc theo cụm, kết hợp được với danh mục; cụm không có hoặc của thành phố khác thì 404 NOT_FOUND', async () => {
    const zoneB = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-b' });
    if (!zoneB) throw new Error('Thiếu cụm giả lập B');
    await t.conn.collection('zones').insertOne({
      cityId: new Types.ObjectId(),
      slug: 'cum-cua-thanh-pho-khac',
      name: 'Cụm Giả Lập Khác',
      area: { type: 'Polygon', coordinates: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]] },
    });
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'o-cum-a', zoneId: zoneAId }),
      fakePlaceDoc(cityId, { slug: 'o-cum-a-an', zoneId: zoneAId, category: 'food' }),
      fakePlaceDoc(cityId, { slug: 'o-cum-b', zoneId: zoneB._id }),
      fakePlaceDoc(cityId, { slug: 'chua-co-cum' }),
    ]);
    expect(slugs((await get(`/cities/${CITY}/places?zone=cum-gia-lap-a`)).body)).toEqual(['o-cum-a', 'o-cum-a-an']);
    expect(slugs((await get(`/cities/${CITY}/places?zone=cum-gia-lap-a&category=food`)).body)).toEqual(['o-cum-a-an']);
    for (const zone of ['khong-co', 'cum-cua-thanh-pho-khac']) {
      const { status, body } = await get(`/cities/${CITY}/places?zone=${zone}`);
      expect(status, zone).toBe(404);
      expect(body, zone).toMatchObject({ code: 'NOT_FOUND' });
    }
  });

  it('lọc nhiều thẻ (phải có đủ mọi thẻ); kèm số chỗ theo thẻ của cả danh mục, trước khi lọc thẻ', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'co-ca-hai', tags: ['view-doi', 'chill'] }),
      fakePlaceDoc(cityId, { slug: 'chi-chill', tags: ['chill', 'chill'] }),
      fakePlaceDoc(cityId, { slug: 'khong-the' }),
      fakePlaceDoc(cityId, { slug: 'quan-an', category: 'food', tags: ['dac-san'] }),
      fakePlaceDoc(cityId, { slug: 'nhap', status: 'draft', tags: ['chill'] }),
    ]);
    const { body } = await get(`/cities/${CITY}/places?category=cafe&tags=chill,view-doi`);
    expect(slugs(body)).toEqual(['co-ca-hai']);
    expect((body as PlaceListResponse).tags).toEqual([
      { slug: 'chill', count: 2 },
      { slug: 'view-doi', count: 1 },
    ]);
    expect(slugs((await get(`/cities/${CITY}/places?category=cafe&tags=chill`)).body)).toEqual(['chi-chill', 'co-ca-hai']);
    expect(slugs((await get(`/cities/${CITY}/places?tags=khong-ai-co`)).body)).toEqual([]);
  });

  it('phân trang cursor: đi hết trang không trùng, không sót; chỗ mới chen vào và chỗ ở cursor bị ẩn giữa hai lần gọi', async () => {
    // Thứ tự nổi bật: trang-a (xác minh 10/10) … trang-e (6/10).
    await places().insertMany(
      ['a', 'b', 'c', 'd', 'e'].map((s, i) =>
        fakePlaceDoc(cityId, { slug: `trang-${s}`, verifySource: 'admin', lastVerifiedAt: new Date(Date.UTC(2026, 9, 10 - i)) }),
      ),
    );
    const first = (await get(`/cities/${CITY}/places?limit=2`)).body as PlaceListResponse;
    expect(slugs(first)).toEqual(['trang-a', 'trang-b']);
    expect(first.nextCursor).toEqual(expect.any(String));

    // Giữa hai lần bấm "Xem thêm": một chỗ mới xác minh (đứng đầu danh sách), chỗ ở cursor bị ẩn.
    await places().insertOne(
      fakePlaceDoc(cityId, { slug: 'moi-xac-minh', verifySource: 'admin', lastVerifiedAt: new Date(Date.UTC(2026, 9, 11)) }),
    );
    await places().updateOne({ cityId: new Types.ObjectId(cityId), slug: 'trang-b' }, { $set: { status: 'hidden' } });

    const second = (await get(`/cities/${CITY}/places?limit=2&cursor=${first.nextCursor ?? ''}`)).body as PlaceListResponse;
    expect(slugs(second)).toEqual(['trang-c', 'trang-d']);
    const third = (await get(`/cities/${CITY}/places?limit=2&cursor=${second.nextCursor ?? ''}`)).body as PlaceListResponse;
    expect(slugs(third)).toEqual(['trang-e']);
    expect(third.nextCursor).toBeUndefined();
  });
```

Sửa test `'tham số sai thì 400 VALIDATION_FAILED kèm chỗ sai'`, thay mảng chuỗi query trong vòng `for` bằng:

```ts
    const elevenTags = Array.from({ length: 11 }, (_, i) => `the-${i}`).join(',');
    for (const qs of [
      'limit=0',
      'limit=51',
      'limit=abc',
      'category=bar',
      `q=${'a'.repeat(101)}`,
      'tags=View-Doi',
      `tags=${elevenTags}`,
      // Express gộp khoá lặp thành mảng; API chỉ nhận một chuỗi cách nhau dấu phẩy.
      'tags=chill&tags=view-doi',
      'zone=Trung%20Tam',
      'cursor=abc',
      'cursor=2.-.a',
      'q=gia&cursor=1.-.a',
    ]) {
```

(giữ nguyên thân vòng `for` và dòng kiểm `/cities/Da%20Lat/places` sau đó).

- [ ] **Step 3: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts exec vitest run src/place.test.ts; pnpm --filter @ranhduong/api exec vitest run src/modules/places/places.controller.test.ts`
Expected: FAIL. Contracts: `PlaceListResponse.safeParse({ items: [] })` vẫn thành công. API: lọc cụm trả cả 4 chỗ thay vì 2, cụm lạ trả 200 thay vì 404; `tags` không có trong phản hồi; `nextCursor` không có.

- [ ] **Step 4: Đổi `PlaceListResponse` trong `packages/contracts/src/place.ts`**

Thay dòng `export const PlaceListResponse = z.object({ items: z.array(PlaceCard) });` bằng (đặt sau khai báo `TagCount`):

```ts
export const PlaceListResponse = z.object({
  items: z.array(PlaceCard),
  /** Có khi còn trang sau: gửi lại trong `cursor`. Không có khi tìm theo từ khoá. */
  nextCursor: z.string().optional(),
  /** Thẻ của các địa điểm khớp thành phố, danh mục, cụm (trước khi lọc thẻ, từ khoá, phân trang); nhiều chỗ trước. */
  tags: z.array(TagCount),
});
```

Build contracts: `pnpm turbo run build --filter=@ranhduong/contracts`.

- [ ] **Step 5: Thêm `findZone` vào `apps/api/src/modules/cities/cities.repository.ts`**

Thêm phương thức cuối class:

```ts
  /** Cụm theo slug trong một thành phố; null nếu không có. */
  async findZone(cityId: string, slug: string): Promise<{ id: string; slug: string; name: string } | null> {
    const doc = await this.zones.findOne({ cityId: new Types.ObjectId(cityId), slug }, { slug: 1, name: 1 }).lean();
    return doc ? { id: doc._id.toString(), slug: doc.slug, name: doc.name } : null;
  }
```

- [ ] **Step 6: Thêm `resolveZone` vào `apps/api/src/modules/cities/cities.service.ts`**

Sửa import contracts thành:

```ts
import { CityPublic, CitySeed, type CityRef, type CitySeedResult, type ZoneRef } from '@ranhduong/contracts';
```

Thêm phương thức ngay dưới `resolveCity`:

```ts
  /** Cụm theo slug trong thành phố; không có thì 404 NOT_FOUND. */
  async resolveZone(cityId: string, slug: string): Promise<ZoneRef> {
    const zone = await this.repo.findZone(cityId, slug);
    if (!zone) throw new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy khu vực');
    return zone;
  }
```

- [ ] **Step 7: Đổi `listActive` trong `apps/api/src/modules/places/places.repository.ts`**

Thêm ngay trên `@Injectable()`:

```ts
/** Lọc trong DB; thẻ, từ khoá, phân trang lọc trong bộ nhớ ở PlacesService. */
export interface ListFilter {
  categories?: PlaceCategory[];
  zoneId?: string;
}
```

Thay chữ ký và câu `find` của `listActive`:

```ts
  async listActive(cityId: string, filter: ListFilter = {}): Promise<ListedPlace[]> {
    const docs = await this.places
      .find(
        {
          cityId: new Types.ObjectId(cityId),
          status: 'active',
          ...(filter.categories ? { category: { $in: filter.categories } } : {}),
          ...(filter.zoneId ? { zoneId: new Types.ObjectId(filter.zoneId) } : {}),
        },
        CARD_FIELDS,
      )
      .lean<CardRow[]>();
```

(phần `return docs.map(…)` giữ nguyên như Task 3.)

- [ ] **Step 8: Viết lại `list` trong `apps/api/src/modules/places/places.service.ts`**

Sửa import:

```ts
import { countTags, hasAllTags, pageByFeatured, searchPlaces, toPlaceCard, type ListedPlace } from './place-listing';
```

Thay phương thức `list`:

```ts
  /**
   * GET /v1/cities/:city/places. Lọc thành phố, danh mục, cụm trong DB; thẻ, từ khoá, phân trang trong bộ nhớ
   * (vài trăm điểm mỗi thành phố). `tags` đếm trên tập chưa lọc thẻ để trang danh mục luôn hiện đủ chip.
   * Có từ khoá thì xếp theo độ khớp, không phân trang; không có thì theo thứ tự nổi bật, phân trang bằng cursor.
   */
  async list(citySlug: string, query: PlaceListQuery): Promise<PlaceListResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const zone = query.zone ? await this.cities.resolveZone(city.id, query.zone) : undefined;
    const [places, zoneNames] = await Promise.all([
      this.repo.listActive(city.id, { categories: query.category, zoneId: zone?.id }),
      this.cities.zoneNames(city.id),
    ]);
    const wanted = query.tags ?? [];
    const filtered = places.filter((place) => hasAllTags(place, wanted));
    const toCard = (place: ListedPlace) => toPlaceCard(place, zoneNames);
    const tags = countTags(places);
    if (query.q) return { items: searchPlaces(filtered, query.q).slice(0, query.limit).map(toCard), tags };
    const page = pageByFeatured(filtered, query.cursor, query.limit);
    return { items: page.items.map(toCard), nextCursor: page.nextCursor, tags };
  }
```

- [ ] **Step 9: Chạy test, thấy xanh; toàn bộ test API, typecheck, lint, build**

Run: `pnpm --filter @ranhduong/contracts exec vitest run && pnpm --filter @ranhduong/api test && pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/api lint && pnpm turbo run build --filter=@ranhduong/api`
Expected: PASS hết, kể cả các test S09 (trang chủ vẫn nhận `items`; có thêm `nextCursor`, `tags` không ảnh hưởng).

Kiểm web vẫn typecheck với response mới: `pnpm --filter @ranhduong/web typecheck` → PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/contracts/src/place.ts packages/contracts/src/place.test.ts apps/api/src/modules/places/places.controller.test.ts apps/api/src/modules/cities/cities.repository.ts apps/api/src/modules/cities/cities.service.ts apps/api/src/modules/places/places.repository.ts apps/api/src/modules/places/places.service.ts
git commit -m "feat: S10 filter place list by zone and tags with cursor pages"
```

---

### Task 5: Hàm thuần của web: đọc URL lọc, link trang, mô hình chip thẻ

**Files:**
- Modify: `apps/web/vitest.config.ts`
- Modify: `apps/web/app/entities/place/api/places.ts` (chỉ `PlaceListParams`)
- Create: `apps/web/app/entities/place/lib/listing-query.ts`
- Create: `apps/web/app/entities/place/lib/listing-query.test.ts`
- Create: `apps/web/app/features/place-tag-filter/lib/tag-chips.ts`
- Create: `apps/web/app/features/place-tag-filter/lib/tag-chips.test.ts`

**Interfaces:**
- Consumes: `MAX_FILTER_TAGS`, `PlaceCursor`, `Slug`, `PlaceCard`, `TagCount`, `tagLabel` (contracts).
- Produces (Task 6, 7 dùng):
  - `PlaceListParams = { q?: string; category?: string; zone?: string; tags?: string; cursor?: string; limit?: number }` (trong `entities/place/api/places.ts`).
  - Trong `entities/place/lib/listing-query.ts`:
    - `LISTING_PAGE_SIZE = 20`
    - `interface ListingFilter { tags: string[]; cursor?: string }`
    - `parseListingQuery(query: Record<string, string | null | (string | null)[] | undefined>): ListingFilter`
    - `toggleTag(tags: readonly string[], tag: string): string[]`
    - `listingHref(path: string, tags: readonly string[], cursor?: string): string`
    - `isIndexableListing(filter: ListingFilter): boolean`
    - `listingApiParams(filter: ListingFilter): Pick<PlaceListParams, 'tags' | 'cursor'>`
    - `placeListKey(citySlug: string, params: PlaceListParams): string`
    - `appendUnique(shown: readonly PlaceCard[], more: readonly PlaceCard[]): PlaceCard[]`
  - Trong `features/place-tag-filter/lib/tag-chips.ts`: `interface TagChip { slug: string; label: string; pressed: boolean; value: string }`, `tagChips(available: readonly TagCount[], selected: readonly string[]): TagChip[]`.

- [ ] **Step 1: Thêm alias `~` cho Vitest**

Lib của lớp `features` cần import lib của `entities` bằng `~/…` như trong Nuxt. Thay nội dung `apps/web/vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Chỉ test hàm thuần trong app/**/lib (không dùng auto-import của Nuxt). Component kiểm bằng typecheck và trình duyệt.
// Alias `~` trỏ vào app/ giống Nuxt 4, để lib ở lớp trên import được lib ở lớp dưới.
export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  test: { include: ['app/**/*.test.ts'] },
});
```

- [ ] **Step 2: Mở rộng `PlaceListParams` trong `apps/web/app/entities/place/api/places.ts`**

Thay khai báo `PlaceListParams`:

```ts
/** Query của GET /cities/:city/places; category, tags là chuỗi cách nhau bằng dấu phẩy. */
export interface PlaceListParams {
  q?: string;
  category?: string;
  zone?: string;
  tags?: string;
  cursor?: string;
  limit?: number;
}
```

- [ ] **Step 3: Viết test cho `listing-query`**

Tạo `apps/web/app/entities/place/lib/listing-query.test.ts`:

```ts
import type { PlaceCard } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import {
  appendUnique,
  isIndexableListing,
  listingApiParams,
  listingHref,
  parseListingQuery,
  placeListKey,
  toggleTag,
} from './listing-query';

describe('parseListingQuery', () => {
  it('không có gì thì không lọc, trang đầu', () => {
    expect(parseListingQuery({})).toEqual({ tags: [] });
  });
  it('thẻ cách nhau dấu phẩy hoặc lặp khoá; bỏ trùng, sắp a-z', () => {
    expect(parseListingQuery({ tags: 'view-doi,chill' })).toEqual({ tags: ['chill', 'view-doi'] });
    expect(parseListingQuery({ tags: ['view-doi', 'chill,view-doi', null] })).toEqual({ tags: ['chill', 'view-doi'] });
    expect(parseListingQuery({ tags: ' chill , ,' })).toEqual({ tags: ['chill'] });
  });
  it('bỏ thẻ sai định dạng và phần quá 10 thẻ thay vì báo lỗi', () => {
    expect(parseListingQuery({ tags: 'View-Doi,sống-ảo,a b,chill,<script>' })).toEqual({ tags: ['chill'] });
    const many = Array.from({ length: 15 }, (_, i) => `the-${String(i).padStart(2, '0')}`).join(',');
    expect(parseListingQuery({ tags: many }).tags).toHaveLength(10);
  });
  it('giữ cursor đúng định dạng, bỏ cursor sai hoặc rỗng; lặp khoá thì lấy cái đầu', () => {
    expect(parseListingQuery({ cursor: '1.-.quan-gia-lap' })).toEqual({ tags: [], cursor: '1.-.quan-gia-lap' });
    for (const cursor of ['abc', '', '9.9.9', null]) expect(parseListingQuery({ cursor }), String(cursor)).toEqual({ tags: [] });
    expect(parseListingQuery({ cursor: ['1.-.a', '0.-.b'] })).toEqual({ tags: [], cursor: '1.-.a' });
  });
});

describe('thẻ, đường dẫn, index', () => {
  it('toggleTag bật hoặc tắt một thẻ, kết quả sắp a-z, không sửa mảng cũ', () => {
    const tags = ['view-doi'];
    expect(toggleTag(tags, 'chill')).toEqual(['chill', 'view-doi']);
    expect(toggleTag(['chill', 'view-doi'], 'chill')).toEqual(['view-doi']);
    expect(tags).toEqual(['view-doi']);
  });
  it('listingHref ghép thẻ và cursor; không có gì thì là đường dẫn gốc', () => {
    expect(listingHref('/da-lat/ca-phe', [])).toBe('/da-lat/ca-phe');
    expect(listingHref('/da-lat/ca-phe', ['chill', 'view-doi'])).toBe('/da-lat/ca-phe?tags=chill,view-doi');
    expect(listingHref('/da-lat/ca-phe', ['chill'], '1.-.quan-gia-lap')).toBe('/da-lat/ca-phe?tags=chill&cursor=1.-.quan-gia-lap');
    expect(listingHref('/da-lat/ca-phe', [], '0.-.a')).toBe('/da-lat/ca-phe?cursor=0.-.a');
  });
  it('chỉ trang gốc (không lọc thẻ, trang đầu) được index', () => {
    expect(isIndexableListing({ tags: [] })).toBe(true);
    expect(isIndexableListing({ tags: ['chill'] })).toBe(false);
    expect(isIndexableListing({ tags: [], cursor: '0.-.a' })).toBe(false);
  });
  it('query API và key useFetch theo bộ lọc', () => {
    expect(listingApiParams({ tags: [] })).toEqual({ tags: undefined, cursor: undefined });
    expect(listingApiParams({ tags: ['chill', 'view-doi'], cursor: '0.-.a' })).toEqual({ tags: 'chill,view-doi', cursor: '0.-.a' });
    expect(placeListKey('da-lat', { category: 'cafe', tags: 'chill', limit: 20 })).toBe('places:da-lat::cafe::chill::20');
    expect(placeListKey('da-lat', { category: 'cafe', limit: 20 })).not.toBe(
      placeListKey('da-lat', { category: 'cafe', limit: 20, cursor: '0.-.a' }),
    );
  });
});

describe('appendUnique', () => {
  const card = (slug: string): PlaceCard => ({ slug, name: `Quán Giả Lập ${slug}`, category: 'cafe', openingHours: [], unconfirmed: true });
  it('nối trang mới vào cuối, bỏ chỗ đã hiện', () => {
    expect(appendUnique([card('a'), card('b')], [card('b'), card('c')]).map((p) => p.slug)).toEqual(['a', 'b', 'c']);
    expect(appendUnique([], [card('a')]).map((p) => p.slug)).toEqual(['a']);
  });
});
```

- [ ] **Step 4: Viết test cho `tag-chips`**

Tạo `apps/web/app/features/place-tag-filter/lib/tag-chips.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tagChips } from './tag-chips';

describe('tagChips', () => {
  const available = [
    { slug: 'chill', count: 5 },
    { slug: 'view-doi', count: 2 },
  ];
  it('chưa chọn gì: mỗi chip chọn đúng thẻ của nó', () => {
    expect(tagChips(available, [])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: false, value: 'chill' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'view-doi' },
    ]);
  });
  it('đang chọn: bấm chip đã chọn thì bỏ thẻ đó, bấm chip khác thì thêm vào bộ đang chọn', () => {
    expect(tagChips(available, ['chill'])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: true, value: '' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'chill,view-doi' },
    ]);
  });
  it('thẻ đang chọn mà không còn chỗ nào có vẫn hiện ở cuối để bỏ chọn được', () => {
    expect(tagChips(available, ['khong-con'])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: false, value: 'chill,khong-con' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'khong-con,view-doi' },
      { slug: 'khong-con', label: 'Khong con', pressed: true, value: '' },
    ]);
  });
  it('không có thẻ nào thì không có chip', () => {
    expect(tagChips([], [])).toEqual([]);
  });
});
```

- [ ] **Step 5: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/web exec vitest run`
Expected: FAIL, không tìm thấy `./listing-query` và `./tag-chips`.

- [ ] **Step 6: Tạo `apps/web/app/entities/place/lib/listing-query.ts`**

```ts
import { MAX_FILTER_TAGS, PlaceCursor, Slug, type PlaceCard } from '@ranhduong/contracts';
import type { PlaceListParams } from '../api/places';

/** Số chỗ mỗi trang trên trang danh mục và khu vực. */
export const LISTING_PAGE_SIZE = 20;

/** Bộ lọc của trang danh sách đọc từ URL: thẻ (sắp a-z, không lặp) và cursor trang sau. */
export interface ListingFilter {
  tags: string[];
  cursor?: string;
}

type QueryValue = string | null | (string | null)[] | undefined;

const strings = (value: QueryValue): string[] =>
  (Array.isArray(value) ? value : [value]).filter((s): s is string => typeof s === 'string');

/**
 * Đọc `?tags=a,b&cursor=…` (nhận cả `?tags=a&tags=b` gõ tay). Thẻ sai định dạng, phần quá số thẻ tối đa và cursor sai
 * bị bỏ qua: URL gõ tay hay cursor cũ vẫn ra trang, thay vì gửi nguyên lên API để nhận 400.
 */
export function parseListingQuery(query: Record<string, QueryValue>): ListingFilter {
  const tags = [...new Set(strings(query.tags).flatMap((s) => s.split(',')).map((s) => s.trim()))]
    .filter((tag) => Slug.safeParse(tag).success)
    .sort()
    .slice(0, MAX_FILTER_TAGS);
  const cursor = strings(query.cursor)[0];
  return cursor !== undefined && PlaceCursor.safeParse(cursor).success ? { tags, cursor } : { tags };
}

/** Bật hoặc tắt một thẻ; kết quả sắp a-z để mỗi tổ hợp thẻ chỉ có một URL. */
export function toggleTag(tags: readonly string[], tag: string): string[] {
  return (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]).sort();
}

/** Đường dẫn trang danh sách kèm thẻ và cursor. Slug và cursor chỉ gồm a-z, 0-9, `-`, `.` nên không cần mã hoá. */
export function listingHref(path: string, tags: readonly string[], cursor?: string): string {
  const params = [...(tags.length ? [`tags=${tags.join(',')}`] : []), ...(cursor ? [`cursor=${cursor}`] : [])];
  return params.length ? `${path}?${params.join('&')}` : path;
}

/** Chỉ trang gốc (không lọc thẻ, trang đầu) cho Google index; trang lọc và trang sau là noindex, follow. */
export function isIndexableListing(filter: ListingFilter): boolean {
  return filter.tags.length === 0 && filter.cursor === undefined;
}

/** Phần query API ứng với bộ lọc trên URL. */
export function listingApiParams(filter: ListingFilter): Pick<PlaceListParams, 'tags' | 'cursor'> {
  return { tags: filter.tags.length ? filter.tags.join(',') : undefined, cursor: filter.cursor };
}

/** Key của useFetch: mỗi bộ tham số một key, để SSR và lần hydrate dùng chung dữ liệu đã tải. */
export function placeListKey(citySlug: string, params: PlaceListParams): string {
  return ['places', citySlug, params.q, params.category, params.zone, params.tags, params.cursor, params.limit]
    .map((part) => part ?? '')
    .join(':');
}

/** Nối trang vừa tải vào danh sách đang hiện, bỏ chỗ đã có (dữ liệu đổi giữa hai lần tải). */
export function appendUnique(shown: readonly PlaceCard[], more: readonly PlaceCard[]): PlaceCard[] {
  const seen = new Set(shown.map((place) => place.slug));
  return [...shown, ...more.filter((place) => !seen.has(place.slug))];
}
```

- [ ] **Step 7: Tạo `apps/web/app/features/place-tag-filter/lib/tag-chips.ts`**

```ts
import { tagLabel, type TagCount } from '@ranhduong/contracts';
import { toggleTag } from '~/entities/place/lib/listing-query';

export interface TagChip {
  slug: string;
  label: string;
  pressed: boolean;
  /** Giá trị `tags` sau khi bấm chip: thêm thẻ này nếu chưa chọn, bỏ nếu đang chọn; rỗng là bỏ lọc. */
  value: string;
}

/**
 * Chip lọc thẻ: các thẻ có trong danh mục hoặc cụm (nhiều chỗ trước), rồi các thẻ đang chọn mà không còn chỗ nào có,
 * để luôn bỏ chọn được. Bấm chip không làm chip đổi chỗ.
 */
export function tagChips(available: readonly TagCount[], selected: readonly string[]): TagChip[] {
  const known = new Set(available.map((tag) => tag.slug));
  const slugs = [...available.map((tag) => tag.slug), ...selected.filter((slug) => !known.has(slug))];
  return slugs.map((slug) => ({
    slug,
    label: tagLabel(slug),
    pressed: selected.includes(slug),
    value: toggleTag(selected, slug).join(','),
  }));
}
```

- [ ] **Step 8: Chạy test, thấy xanh; typecheck, lint**

Run: `pnpm --filter @ranhduong/web exec vitest run && pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web lint`
Expected: PASS hết.

- [ ] **Step 9: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/app/entities/place/api/places.ts apps/web/app/entities/place/lib/listing-query.ts apps/web/app/entities/place/lib/listing-query.test.ts apps/web/app/features/place-tag-filter/lib/tag-chips.ts apps/web/app/features/place-tag-filter/lib/tag-chips.test.ts
git commit -m "feat: S10 add listing url helpers and tag chip model to web"
```

---

### Task 6: Trang danh mục `/[city]/[category]`

**Files:**
- Modify: `packages/ui/src/components.css` (dòng `.rd-chip--filter[aria-pressed="true"]`)
- Modify: `apps/web/app/assets/base.css`
- Modify: `apps/web/app/entities/place/api/places.ts` (thêm `fetchPlacePage`)
- Create: `apps/web/app/features/place-tag-filter/ui/RdTagFilter.vue`
- Create: `apps/web/app/widgets/place-listing/ui/RdPlaceListing.vue`
- Create: `apps/web/app/widgets/zone-links/ui/RdZoneLinks.vue`
- Create: `apps/web/app/pages/[city]/[category].vue`
- Modify: `apps/web/nuxt.config.ts` (`routeRules`)
- Modify: `apps/web/app/pages/[...slug].vue` (comment)

**Interfaces:**
- Consumes: Task 5 (toàn bộ `listing-query`, `tagChips`, `PlaceListParams`); S09: `useCity`, `usePlaceList`, `RdPlaceList`, `RdCityHeader`, `RdCategoryChips`, `RdErrorBanner`, `throwIfNotFound`, `markUnavailableOnServer`, `useClientNow`, `useApiBase`, `API_TIMEOUT_MS`; contracts: `CATEGORY_LABEL`, `categoryFromUrlSlug`, `Slug`, `PlaceCard`, `PlaceListResponse`, `TagCount`.
- Produces (Task 7 dùng):
  - `fetchPlacePage(apiBase: string, citySlug: string, params: PlaceListParams): Promise<PlaceListResponse>`.
  - `RdTagFilter` props `{ action: string; tags: TagCount[]; selected: string[] }`.
  - `RdPlaceListing` props `{ citySlug: string; basePath: string; params: PlaceListParams; page: PlaceListResponse | null; tags: string[]; paged: boolean; failed: boolean; now: Date | null }`, slot `empty`.
  - `RdZoneLinks` props `{ citySlug: string; zones: { slug: string; name: string }[] }`.
  - Class toàn cục `.visually-hidden` trong `base.css`.
  - Route `/:city/{ca-phe,an-uong,tham-quan,hoat-dong}` cache SWR 1 giờ.

- [ ] **Step 1: Kiểu "đang chọn" cho chip là link trang hiện tại**

Trong `packages/ui/src/components.css`, thay dòng

```css
.rd-chip--filter[aria-pressed="true"] { background: var(--ink); color: var(--paper-raised); border-color: var(--ink); }
```

bằng

```css
/* Đang chọn: nút lọc (aria-pressed) hoặc link tới trang đang xem (NuxtLink tự gắn aria-current="page"). */
.rd-chip--filter[aria-pressed="true"], .rd-chip--filter[aria-current="page"] { background: var(--ink); color: var(--paper-raised); border-color: var(--ink); }
```

Thêm vào cuối `apps/web/app/assets/base.css`:

```css
/* Chỉ cho trình đọc màn hình, ví dụ tiêu đề mục danh sách. */
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
```

- [ ] **Step 2: Thêm `fetchPlacePage` vào `apps/web/app/entities/place/api/places.ts`**

Thêm cuối file:

```ts
/** Tải một trang trên trình duyệt (nút "Xem thêm"); apiBase lấy bằng useApiBase() lúc setup của component. */
export function fetchPlacePage(apiBase: string, citySlug: string, params: PlaceListParams): Promise<PlaceListResponse> {
  return $fetch<PlaceListResponse>(`/cities/${citySlug}/places`, { baseURL: apiBase, query: params, timeout: API_TIMEOUT_MS });
}
```

- [ ] **Step 3: Tạo `apps/web/app/features/place-tag-filter/ui/RdTagFilter.vue`**

```vue
<script setup lang="ts">
import type { TagCount } from '@ranhduong/contracts';
import { computed } from 'vue';
import { tagChips } from '../lib/tag-chips';

const props = defineProps<{ action: string; tags: TagCount[]; selected: string[] }>();
const chips = computed(() => tagChips(props.tags, props.selected));

/**
 * Form GET thường: chưa có JS thì trình duyệt tự gửi `?tags=…` (mỗi nút mang sẵn giá trị sau khi bật/tắt thẻ).
 * Có JS thì chuyển trang bằng router, không tải lại cả trang, và bỏ `tags` rỗng khỏi URL.
 * Bot không gửi form, nên không đi lan ra mọi tổ hợp thẻ.
 */
async function onSubmit(event: SubmitEvent): Promise<void> {
  const button = event.submitter;
  if (!(button instanceof HTMLButtonElement)) return;
  event.preventDefault();
  await navigateTo(button.value ? { path: props.action, query: { tags: button.value } } : props.action);
}
</script>

<template>
  <form v-if="chips.length" method="get" :action="action" aria-label="Lọc theo thẻ" @submit="onSubmit">
    <ul class="chips">
      <li v-for="chip in chips" :key="chip.slug">
        <!-- Nhãn để cùng dòng với thẻ: xuống dòng thì HTML có khoảng trắng thừa quanh chữ. -->
        <button class="rd-chip rd-chip--filter" type="submit" name="tags" :value="chip.value" :aria-pressed="chip.pressed">{{ chip.label }}</button>
      </li>
    </ul>
  </form>
</template>

<style scoped>
/* 390px: một hàng cuộn ngang tràn sát mép màn hình, chip đầu vẫn thẳng lề trang; từ 768px xuống dòng. */
.chips { list-style: none; margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5) var(--space-1); display: flex; gap: var(--space-2); overflow-x: auto; scroll-padding-inline: var(--space-5); }
.chips li { flex: 0 0 auto; }
@media (min-width: 768px) { .chips { flex-wrap: wrap; overflow-x: visible; margin: 0; padding: 0; } }
</style>
```

- [ ] **Step 4: Tạo `apps/web/app/widgets/place-listing/ui/RdPlaceListing.vue`**

```vue
<script setup lang="ts">
import type { PlaceCard, PlaceListResponse } from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { fetchPlacePage, type PlaceListParams } from '~/entities/place/api/places';
import { appendUnique, listingHref } from '~/entities/place/lib/listing-query';
import RdPlaceList from '~/entities/place/ui/RdPlaceList.vue';
import { useApiBase } from '~/shared/api/client';

const props = defineProps<{
  citySlug: string;
  /** Đường dẫn trang gốc, ví dụ /da-lat/ca-phe. */
  basePath: string;
  /** Query API của trang đang xem (danh mục hoặc cụm, thẻ, cursor, limit). */
  params: PlaceListParams;
  page: PlaceListResponse | null;
  /** Thẻ đang lọc, đọc từ URL. */
  tags: string[];
  /** Đang xem trang sau (URL có cursor). */
  paged: boolean;
  failed: boolean;
  now: Date | null;
}>();

const apiBase = useApiBase();
const items = ref<PlaceCard[]>(props.page?.items ?? []);
const nextCursor = ref(props.page?.nextCursor);
const loading = ref(false);
const loadFailed = ref(false);
const listEl = ref<HTMLElement | null>(null);

// Bấm "Thử lại" ở dải lỗi đầu trang thì trang tải lại dữ liệu: bắt đầu lại từ trang mới nhận.
watch(
  () => props.page,
  (page) => {
    items.value = page?.items ?? [];
    nextCursor.value = page?.nextCursor;
    loadFailed.value = false;
  },
);

const nextHref = computed(() => (nextCursor.value ? listingHref(props.basePath, props.tags, nextCursor.value) : undefined));
const firstHref = computed(() => listingHref(props.basePath, props.tags));

/**
 * Có JS: tải trang sau và nối vào danh sách, URL giữ nguyên. Chưa có JS, hoặc mở tab mới (Ctrl, Cmd, Shift, chuột giữa),
 * thì để trình duyệt đi theo link `?cursor=`.
 */
async function loadMore(event: MouseEvent): Promise<void> {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (loading.value || !nextCursor.value) return;
  loading.value = true;
  loadFailed.value = false;
  const firstNew = items.value.length;
  try {
    const more = await fetchPlacePage(apiBase, props.citySlug, { ...props.params, cursor: nextCursor.value });
    items.value = appendUnique(items.value, more.items);
    nextCursor.value = more.nextCursor;
    await nextTick();
    // Đưa focus tới thẻ đầu tiên vừa thêm, để bàn phím và trình đọc màn hình đi tiếp từ đó.
    listEl.value?.querySelectorAll<HTMLAnchorElement>('a.rd-place')[firstNew]?.focus();
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="listing" aria-labelledby="place-listing-title">
    <h2 id="place-listing-title" class="visually-hidden">Danh sách địa điểm</h2>
    <div v-if="items.length" ref="listEl">
      <RdPlaceList :places="items" :city-slug="citySlug" :now="now" />
    </div>
    <p v-else-if="failed" class="empty-note">Chưa tải được danh sách, bấm Thử lại ở đầu trang nhé.</p>
    <div v-else-if="tags.length" class="listing__empty">
      <p class="empty-note">Chưa có chỗ nào có đủ các thẻ đã chọn.</p>
      <NuxtLink class="rd-btn rd-btn--outline" :to="basePath">Bỏ lọc</NuxtLink>
    </div>
    <p v-else-if="paged" class="empty-note">Hết danh sách rồi.</p>
    <slot v-else name="empty" />

    <ul v-if="loading" class="listing__skeleton" aria-hidden="true">
      <li v-for="n in 2" :key="n" class="rd-place">
        <div class="rd-place__thumb" />
        <div class="rd-place__body">
          <span class="skeleton-bar" />
          <span class="skeleton-bar skeleton-bar--short" />
        </div>
      </li>
    </ul>

    <div v-if="nextHref || paged" class="listing__more">
      <a v-if="nextHref" class="rd-btn rd-btn--outline" :href="nextHref" :aria-busy="loading" @click="loadMore">
        {{ loading ? 'Đang tải…' : 'Xem thêm' }}
      </a>
      <p v-if="loadFailed" class="empty-note" role="alert">Chưa tải thêm được, có thể mạng đang chập chờn. Bấm Xem thêm lần nữa nhé.</p>
      <NuxtLink v-if="paged" class="listing__first" :to="firstHref">Về đầu danh sách</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.listing { display: flex; flex-direction: column; gap: var(--space-4); }
.listing__empty { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); }
.listing__more { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
.listing__first { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; }
/* Khung xương tĩnh (không nhấp nháy) nên không cần xét prefers-reduced-motion. */
.listing__skeleton { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
.skeleton-bar { display: block; height: 14px; border-radius: var(--radius-thumb); background: var(--mist); }
.skeleton-bar--short { width: 60%; }
</style>
```

- [ ] **Step 5: Tạo `apps/web/app/widgets/zone-links/ui/RdZoneLinks.vue`**

```vue
<script setup lang="ts">
// Link tới các trang khu vực; NuxtLink tự gắn aria-current="page" cho cụm đang xem (tô như chip đang chọn).
defineProps<{ citySlug: string; zones: { slug: string; name: string }[] }>();
</script>

<template>
  <nav v-if="zones.length" class="zones" aria-labelledby="zone-links-title">
    <h2 id="zone-links-title" class="section-title">Theo khu vực</h2>
    <ul class="zones__list">
      <li v-for="zone in zones" :key="zone.slug">
        <NuxtLink class="rd-chip rd-chip--filter" :to="`/${citySlug}/khu-vuc/${zone.slug}`">{{ zone.name }}</NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.zones { display: flex; flex-direction: column; gap: var(--space-3); }
.zones__list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.zones__list a { text-decoration: none; }
</style>
```

- [ ] **Step 6: Tạo `apps/web/app/pages/[city]/[category].vue`**

```vue
<script setup lang="ts">
import { CATEGORY_LABEL, categoryFromUrlSlug, Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList, type PlaceListParams } from '~/entities/place/api/places';
import {
  isIndexableListing,
  LISTING_PAGE_SIZE,
  listingApiParams,
  parseListingQuery,
  placeListKey,
} from '~/entities/place/lib/listing-query';
import RdTagFilter from '~/features/place-tag-filter/ui/RdTagFilter.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCategoryChips from '~/widgets/category-chips/ui/RdCategoryChips.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdPlaceListing from '~/widgets/place-listing/ui/RdPlaceListing.vue';
import RdZoneLinks from '~/widgets/zone-links/ui/RdZoneLinks.vue';

definePageMeta({
  // Chỉ 4 danh mục công khai (CATEGORY_URL_SLUG); slug khác (luu-tru, cafe, khu-vuc, dia-diem…) là 404, không gọi API.
  // Trang tĩnh cùng cấp (tim-kiem.vue, ban-do.vue…) được Vue Router ưu tiên hơn route động này.
  validate: (route) =>
    Slug.safeParse(route.params.city).success && categoryFromUrlSlug(String(route.params.category)) !== undefined,
  // Đổi thẻ hay sang trang sau thì dựng lại trang; cùng đường dẫn nên router giữ nguyên vị trí cuộn.
  key: (route) => route.fullPath,
});

const route = useRoute();
const citySlug = String(route.params.city);
const categorySlug = String(route.params.category);
const category = categoryFromUrlSlug(categorySlug);
if (!category) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });

const basePath = `/${citySlug}/${categorySlug}`;
const filter = parseListingQuery(route.query);
const params: PlaceListParams = { category, ...listingApiParams(filter), limit: LISTING_PAGE_SIZE };
const [city, list] = await Promise.all([useCity(citySlug), usePlaceList(citySlug, params, placeListKey(citySlug, params))]);
throwIfNotFound(city.error.value);
throwIfNotFound(list.error.value);

const listFailed = computed(() => Boolean(list.error.value));
const loadFailed = computed(() => Boolean(city.error.value) || listFailed.value);
markUnavailableOnServer(loadFailed.value);

const label = CATEGORY_LABEL[category];
const cityName = computed(() => city.data.value?.name ?? '');
const title = computed(() => (cityName.value ? `${label} ở ${cityName.value}` : label));
const page = computed(() => list.data.value ?? null);
const availableTags = computed(() => page.value?.tags ?? []);
const zones = computed(() => city.data.value?.zones ?? []);
const now = useClientNow();

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh()]);
}

useSeoMeta({
  title: () => `${title.value} · Rành Đường`,
  description: () =>
    `${title.value}: những chỗ người rành đường đã ghé, kèm giờ mở cửa, ghi chú thực tế và chỉ đường. Chỗ nào cũng được hỏi lại trước khi lên đây.`,
  // Trang lọc thẻ và trang sau không index (technical-design mục 11); bot vẫn đi theo link tới từng địa điểm.
  robots: isIndexableListing(filter) ? undefined : 'noindex, follow',
});
</script>

<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" />
    <main class="main">
      <RdErrorBanner v-if="loadFailed" message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
      <section class="intro">
        <h1 class="page-title">{{ title }}</h1>
        <p class="lead">Ghi chép của người rành đường. Chỗ nào cũng được hỏi lại trước khi lên đây.</p>
      </section>
      <RdCategoryChips :city-slug="citySlug" />
      <RdTagFilter :action="basePath" :tags="availableTags" :selected="filter.tags" />
      <RdPlaceListing
        :city-slug="citySlug"
        :base-path="basePath"
        :params="params"
        :page="page"
        :tags="filter.tags"
        :paged="filter.cursor !== undefined"
        :failed="listFailed"
        :now="now"
      >
        <template #empty>
          <p class="empty-note">Mục này mình chưa ghi chép chỗ nào. Ghé lại sau vài hôm nhé.</p>
        </template>
      </RdPlaceListing>
      <RdZoneLinks :city-slug="citySlug" :zones="zones" />
    </main>
  </div>
</template>

<style scoped>
.main { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-6); }
.intro { display: flex; flex-direction: column; gap: var(--space-3); }
</style>
```

- [ ] **Step 7: Cache SWR cho trang danh mục; sửa comment trang 404**

Trong `apps/web/nuxt.config.ts`, khối `routeRules`, thêm ngay dưới dòng `'/:city': { swr: 3600 },`:

```ts
    // Trang danh mục: SWR 1 giờ, kể cả bản có ?tags= hay ?cursor= (Nitro cache theo cả query).
    // Giữ khớp CATEGORY_URL_SLUG trong contracts: nuxt.config không import được contracts vì lúc postinstall chưa build.
    '/:city/ca-phe': { swr: 3600 },
    '/:city/an-uong': { swr: 3600 },
    '/:city/tham-quan': { swr: 3600 },
    '/:city/hoat-dong': { swr: 3600 },
```

Trong `apps/web/app/pages/[...slug].vue`, đổi dòng comment đầu:

```ts
// Đường dẫn chưa có trang (ví dụ danh mục trước S10, bản đồ trước S12) trả 404 qua error.vue,
```

thành:

```ts
// Đường dẫn chưa có trang (ví dụ địa điểm trước S11, bản đồ trước S12) trả 404 qua error.vue,
```

Chạy: `pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web lint && pnpm --filter @ranhduong/web exec vitest run`
Expected: PASS.

- [ ] **Step 8: Thử SSR với dữ liệu giả (chạy local, không commit dữ liệu)**

```bash
pnpm infra:up
pnpm seed
pnpm dev
```

Ở terminal khác, thêm dữ liệu giả: 25 quán cà phê ở Trung tâm (3 quán đã xác nhận; quán số lẻ có thêm thẻ `view-doi`), 1 quán ăn, 1 điểm tham quan ở Phía Nam, 1 bản nháp. Tên đều có "Giả Lập", toạ độ `[0, 0]`; xoá ở Task 7 Step 6.

```bash
docker compose exec -T mongo mongosh ranhduong --quiet <<'JS'
const city = db.cities.findOne({ slug: 'da-lat' });
if (!city) throw new Error('Chưa seed Đà Lạt: chạy pnpm seed');
const zoneId = (slug) => db.zones.findOne({ cityId: city._id, slug })._id;
const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '07:00', close: '22:00' }));
const place = (slug, name, category, extra) => ({
  cityId: city._id, zoneId: zoneId('trung-tam'), slug, slugHistory: [], name, aliases: [], nameNorm: '', category, tags: [],
  location: { type: 'Point', coordinates: [0, 0] }, checkinRadiusM: 100, openingHours: hours, bestTime: [], transport: [],
  photos: [], status: 'active', suspicionScore: 0, source: 'admin', vipTier: 'free', ratingCount: 0,
  createdAt: new Date(), updatedAt: new Date(), ...extra,
});
const cafes = Array.from({ length: 25 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return place(`gia-lap-cafe-${n}`, `Quán Giả Lập Cà Phê ${n}`, 'cafe', {
    verifySource: i < 3 ? 'owner' : 'admin',
    lastVerifiedAt: new Date(Date.UTC(2026, 9, 1, i)),
    tags: i % 2 === 0 ? ['chill', 'view-doi'] : ['chill'],
  });
});
db.places.insertMany([
  ...cafes,
  place('gia-lap-an-01', 'Quán Giả Lập Ăn Uống 01', 'food', { verifySource: 'owner', tags: ['an-sang'] }),
  place('gia-lap-tham-quan-01', 'Điểm Giả Lập Tham Quan 01', 'attraction', { zoneId: zoneId('phia-nam'), verifySource: 'admin', tags: ['view-doi'] }),
  place('gia-lap-nhap-01', 'Quán Giả Lập Nháp 01', 'cafe', { status: 'draft', tags: ['chill'] }),
]);
print('Đã thêm 28 chỗ giả.');
JS
```

Thứ tự nổi bật của cà phê: 03, 02, 01 (đã xác nhận, xác minh muộn trước), rồi 25, 24, …, 04. Trang 1 có 03…09, trang 2 có 08…04. Thẻ `view-doi` có ở các quán số lẻ (01, 03, …, 25): 13 quán.

Kiểm HTML render từ server (curl không chạy JS):

```bash
page() { curl -s "http://localhost:3100$1" -o /tmp/s10.html -w "%{http_code} $1\n"; }
has() { for s in "$@"; do grep -q -- "$s" /tmp/s10.html && echo "có: $s" || echo "THIẾU: $s"; done; }
hasnt() { for s in "$@"; do grep -q -- "$s" /tmp/s10.html && echo "KHÔNG ĐƯỢC CÓ: $s" || echo "đúng, không có: $s"; done; }

page /da-lat/ca-phe
has 'Cà phê ở Đà Lạt' 'Quán Giả Lập Cà Phê 03' 'Quán Giả Lập Cà Phê 09' '>Chill' '>View đồi' 'aria-pressed="false"' \
  'Xem thêm' 'href="/da-lat/ca-phe?cursor=' 'Theo khu vực' 'href="/da-lat/khu-vuc/trung-tam"' 'Danh sách địa điểm'
hasnt 'Quán Giả Lập Cà Phê 08' 'Quán Giả Lập Ăn Uống 01' 'Quán Giả Lập Nháp 01' 'noindex' 'Về đầu danh sách' 'Đang mở'
grep -o '<a[^>]*aria-current="page"[^>]*>[^<]*' /tmp/s10.html

NEXT=$(grep -o 'href="/da-lat/ca-phe?cursor=[^"]*"' /tmp/s10.html | head -1 | sed 's/^href="//; s/"$//')
page "$NEXT"
has 'Quán Giả Lập Cà Phê 08' 'Quán Giả Lập Cà Phê 04' 'Về đầu danh sách' 'content="noindex, follow"'
hasnt 'Quán Giả Lập Cà Phê 03' 'Xem thêm'

page '/da-lat/ca-phe?tags=view-doi'
has 'Quán Giả Lập Cà Phê 01' 'Quán Giả Lập Cà Phê 25' 'aria-pressed="true"' 'content="noindex, follow"'
hasnt 'Quán Giả Lập Cà Phê 02' 'Xem thêm'

page '/da-lat/ca-phe?tags=view-doi,an-sang'
has 'Chưa có chỗ nào có đủ các thẻ đã chọn' 'Bỏ lọc' '>Ăn sáng'

page '/da-lat/ca-phe?tags=View%20%C4%90%E1%BB%93i&cursor=abc'
has 'Quán Giả Lập Cà Phê 03'
page '/da-lat/ca-phe?tags=constructor'
has '>Constructor' 'Chưa có chỗ nào có đủ các thẻ đã chọn'

page /da-lat/an-uong;    has 'Ăn uống ở Đà Lạt' 'Quán Giả Lập Ăn Uống 01'
page /da-lat/tham-quan;  has 'Tham quan ở Đà Lạt' 'Điểm Giả Lập Tham Quan 01'
page /da-lat/hoat-dong;  has 'Hoạt động ở Đà Lạt' 'Mục này mình chưa ghi chép chỗ nào'
page /da-lat;            has 'Chỗ dân ở đây hay ngồi'
for p in /da-lat/luu-tru /da-lat/mua-sam /da-lat/cafe /ha-noi/ca-phe; do page "$p"; done
```

Expected:
- Mọi dòng `page` in `200` cùng đường dẫn, trừ vòng cuối in `404` cho cả 4 đường dẫn.
- Mọi dòng kiểm bắt đầu bằng "có:" hoặc "đúng, không có:".
- Lệnh `grep -o … aria-current` in đúng một link, kết thúc bằng `>Cà phê`.
- Trang `?tags=View%20Đồi&cursor=abc` ra trang đầu không lọc (thẻ và cursor sai bị bỏ qua), không phải trang lỗi.
- "Đang mở" không có trong HTML vì trạng thái mở cửa chỉ tính trên trình duyệt.

- [ ] **Step 9: Xem trên trình duyệt ở 390px rồi desktop**

Mở http://localhost:3100/da-lat/ca-phe trong Chrome, DevTools khung 390×844, và kiểm:

- Thứ tự từ trên xuống: header · "Cà phê ở Đà Lạt" · đoạn dẫn · 4 chip danh mục (Cà phê tô nền `--ink`) · hàng chip thẻ (Chill, View đồi) · 20 thẻ quán · nút "Xem thêm" · "Theo khu vực" với 4 chip cụm. Trang không có thanh cuộn ngang; hàng chip thẻ cuộn ngang được khi hẹp.
- Bấm chip "View đồi": URL thành `/da-lat/ca-phe?tags=view-doi`, chip tô nền `--ink`, còn 13 quán, vị trí cuộn giữ nguyên, tab Network không có request tải lại document. Bấm lại: về `/da-lat/ca-phe`.
- Bấm "Xem thêm": nút đổi thành "Đang tải…" kèm 2 khung xương (ở local có thể chỉ thoáng qua; bật Network → Slow 4G để thấy rõ), rồi thêm 5 quán (08…04). URL không đổi, nút biến mất, focus nằm ở thẻ "Quán Giả Lập Cà Phê 08".
- Tải lại trang. DevTools → Network → Offline, bấm "Xem thêm": hiện câu "Chưa tải thêm được…", nút vẫn còn. Bật lại Online, bấm lần nữa: tải được. Bấm nhanh hai lần liên tiếp: không có thẻ trùng.
- Ctrl+click (Cmd+click trên Mac) "Xem thêm": mở tab mới ở `?cursor=…`, có "Về đầu danh sách".
- Tắt JavaScript (DevTools → Settings → Debugger → Disable JavaScript), tải lại: bấm chip "View đồi" vẫn lọc được (URL có `tags=view-doi`, dấu phẩy có thể thành `%2C`); bấm "Xem thêm" sang trang `?cursor=`. Bật lại JavaScript.
- Tab đi qua: logo, chip danh mục, chip thẻ, các thẻ quán, "Xem thêm", chip cụm; chỗ nào cũng có vòng focus, vùng bấm không nhỏ hơn 44px.
- Console không có cảnh báo `Hydration` và không có lỗi.
- Khung 1280px: nội dung không quá 1200px, danh sách 3 cột, chip thẻ xuống dòng thay vì cuộn ngang.

Giữ dữ liệu giả cho Task 7.

- [ ] **Step 10: Commit**

```bash
git add packages/ui/src/components.css apps/web/app/assets/base.css apps/web/app/entities/place/api/places.ts apps/web/app/features/place-tag-filter/ui/RdTagFilter.vue apps/web/app/widgets/place-listing/ui/RdPlaceListing.vue apps/web/app/widgets/zone-links/ui/RdZoneLinks.vue "apps/web/app/pages/[city]/[category].vue" "apps/web/app/pages/[...slug].vue" apps/web/nuxt.config.ts
git commit -m "feat: S10 render category pages with tag filter and load more"
```

---

### Task 7: Trang khu vực `/[city]/khu-vuc/[zone]` và kiểm bản build

**Files:**
- Create: `apps/web/app/pages/[city]/khu-vuc/[zone].vue`
- Modify: `apps/web/nuxt.config.ts` (`routeRules`)

**Interfaces:**
- Consumes: mọi thứ Task 6 tạo ra; `PUBLIC_CATEGORIES`, `Slug` (contracts).
- Produces: route `/:city/khu-vuc/:zone`, cache SWR 1 giờ; cụm không có trong thành phố là 404.

- [ ] **Step 1: Tạo `apps/web/app/pages/[city]/khu-vuc/[zone].vue`**

```vue
<script setup lang="ts">
import { PUBLIC_CATEGORIES, Slug } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useCity } from '~/entities/city/api/city';
import { usePlaceList, type PlaceListParams } from '~/entities/place/api/places';
import {
  isIndexableListing,
  LISTING_PAGE_SIZE,
  listingApiParams,
  parseListingQuery,
  placeListKey,
} from '~/entities/place/lib/listing-query';
import RdTagFilter from '~/features/place-tag-filter/ui/RdTagFilter.vue';
import { markUnavailableOnServer, throwIfNotFound } from '~/shared/api/page-status';
import { useClientNow } from '~/shared/lib/use-client-now';
import RdErrorBanner from '~/shared/ui/RdErrorBanner.vue';
import RdCityHeader from '~/widgets/city-header/ui/RdCityHeader.vue';
import RdPlaceListing from '~/widgets/place-listing/ui/RdPlaceListing.vue';
import RdZoneLinks from '~/widgets/zone-links/ui/RdZoneLinks.vue';

definePageMeta({
  validate: (route) => Slug.safeParse(route.params.city).success && Slug.safeParse(route.params.zone).success,
  // Đổi thẻ hay sang trang sau thì dựng lại trang; cùng đường dẫn nên router giữ nguyên vị trí cuộn.
  key: (route) => route.fullPath,
});

const route = useRoute();
const citySlug = String(route.params.city);
const zoneSlug = String(route.params.zone);
const basePath = `/${citySlug}/khu-vuc/${zoneSlug}`;
const filter = parseListingQuery(route.query);
// Mọi danh mục có trang công khai (không có lưu trú, mua sắm).
const params: PlaceListParams = {
  category: PUBLIC_CATEGORIES.join(','),
  zone: zoneSlug,
  ...listingApiParams(filter),
  limit: LISTING_PAGE_SIZE,
};
const [city, list] = await Promise.all([useCity(citySlug), usePlaceList(citySlug, params, placeListKey(citySlug, params))]);
throwIfNotFound(city.error.value);
// API trả 404 khi cụm không có trong thành phố.
throwIfNotFound(list.error.value);

const zones = computed(() => city.data.value?.zones ?? []);
const zone = computed(() => zones.value.find((z) => z.slug === zoneSlug));
// Danh sách lỗi (không phải 404) nhưng đã có thông tin thành phố: cụm không có thì vẫn là 404, không phải 503.
if (city.data.value && !zone.value) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });

const listFailed = computed(() => Boolean(list.error.value));
const loadFailed = computed(() => Boolean(city.error.value) || listFailed.value);
markUnavailableOnServer(loadFailed.value);

const cityName = computed(() => city.data.value?.name ?? '');
const zoneName = computed(() => zone.value?.name ?? '');
const title = computed(() => (zoneName.value ? `Khu ${zoneName.value}` : 'Khu vực'));
/** Gợi ý khi khu này chưa có chỗ nào: cụm đầu tiên khác cụm đang xem (thứ tự seed, Trung tâm trước). */
const otherZone = computed(() => zones.value.find((z) => z.slug !== zoneSlug));
const page = computed(() => list.data.value ?? null);
const availableTags = computed(() => page.value?.tags ?? []);
const now = useClientNow();

async function retry(): Promise<void> {
  await Promise.all([city.refresh(), list.refresh()]);
}

useSeoMeta({
  title: () => (cityName.value ? `${title.value}, ${cityName.value} · Rành Đường` : `${title.value} · Rành Đường`),
  description: () =>
    `Cà phê, chỗ ăn, chỗ chơi ở khu ${zoneName.value}${cityName.value ? `, ${cityName.value}` : ''}: ghi chép của người rành đường, chỗ nào cũng được hỏi lại trước khi lên đây.`,
  robots: isIndexableListing(filter) ? undefined : 'noindex, follow',
});
</script>

<template>
  <div>
    <RdCityHeader :city-slug="citySlug" :city-name="cityName" />
    <main class="main">
      <RdErrorBanner v-if="loadFailed" message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
      <section class="intro">
        <h1 class="page-title">{{ title }}</h1>
        <p class="lead">Ghi chép của người rành đường{{ cityName ? ` ở ${cityName}` : '' }}. Chỗ nào cũng được hỏi lại trước khi lên đây.</p>
      </section>
      <RdTagFilter :action="basePath" :tags="availableTags" :selected="filter.tags" />
      <RdPlaceListing
        :city-slug="citySlug"
        :base-path="basePath"
        :params="params"
        :page="page"
        :tags="filter.tags"
        :paged="filter.cursor !== undefined"
        :failed="listFailed"
        :now="now"
      >
        <template #empty>
          <p class="empty-note">
            Khu này mình chưa ghi chép chỗ nào.<template v-if="otherZone">
              Xem <NuxtLink :to="`/${citySlug}/khu-vuc/${otherZone.slug}`">khu {{ otherZone.name }}</NuxtLink> nhé?
            </template>
          </p>
        </template>
      </RdPlaceListing>
      <RdZoneLinks :city-slug="citySlug" :zones="zones" />
    </main>
  </div>
</template>

<style scoped>
.main { max-width: 1200px; margin: 0 auto; padding: var(--space-2) var(--space-5) var(--space-7); display: flex; flex-direction: column; gap: var(--space-6); }
.intro { display: flex; flex-direction: column; gap: var(--space-3); }
</style>
```

- [ ] **Step 2: Cache SWR cho trang khu vực**

Trong `apps/web/nuxt.config.ts`, thêm ngay dưới dòng `'/:city/hoat-dong': { swr: 3600 },`:

```ts
    '/:city/khu-vuc/**': { swr: 3600 },
```

Chạy: `pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web lint`
Expected: PASS.

- [ ] **Step 3: Thử SSR trang khu vực (dữ liệu giả từ Task 6 Step 8, `pnpm dev` đang chạy)**

```bash
page() { curl -s "http://localhost:3100$1" -o /tmp/s10.html -w "%{http_code} $1\n"; }
has() { for s in "$@"; do grep -q -- "$s" /tmp/s10.html && echo "có: $s" || echo "THIẾU: $s"; done; }
hasnt() { for s in "$@"; do grep -q -- "$s" /tmp/s10.html && echo "KHÔNG ĐƯỢC CÓ: $s" || echo "đúng, không có: $s"; done; }

page /da-lat/khu-vuc/trung-tam
has 'Khu Trung tâm' 'Quán Giả Lập Cà Phê 03' 'Quán Giả Lập Ăn Uống 01' '>Ăn sáng' 'Xem thêm' 'href="/da-lat/khu-vuc/trung-tam?cursor='
hasnt 'Điểm Giả Lập Tham Quan 01' 'Quán Giả Lập Nháp 01' 'noindex'
grep -o '<a[^>]*aria-current="page"[^>]*>[^<]*' /tmp/s10.html

page /da-lat/khu-vuc/phia-nam
has 'Khu Phía Nam' 'Điểm Giả Lập Tham Quan 01'
hasnt 'Quán Giả Lập Cà Phê 03'

page /da-lat/khu-vuc/phia-bac
has 'Khu này mình chưa ghi chép chỗ nào' '>khu Trung tâm</a>'

page '/da-lat/khu-vuc/trung-tam?tags=an-sang'
has 'Quán Giả Lập Ăn Uống 01' 'content="noindex, follow"'
hasnt 'Quán Giả Lập Cà Phê 03'

for p in /da-lat/khu-vuc /da-lat/khu-vuc/khong-co /da-lat/khu-vuc/Trung-Tam /ha-noi/khu-vuc/trung-tam /da-lat/khu-vuc/trung-tam/them; do page "$p"; done
```

Expected: 4 trang đầu và trang `?tags=an-sang` in `200`; vòng cuối in `404` cho cả 5 đường dẫn. Mọi dòng kiểm bắt đầu bằng "có:" hoặc "đúng, không có:". Lệnh `grep -o … aria-current` in đúng một link, kết thúc bằng `>Trung tâm`. Trang Trung tâm có 26 chỗ (25 cà phê, 1 quán ăn; quán ăn đã xác nhận nhưng chưa có ngày xác minh nên đứng thứ 4), nên có "Xem thêm"; chip "Ăn sáng" có vì đếm thẻ trên cả cụm.

Trên Chrome 390px: mở `/da-lat/khu-vuc/phia-bac`, bấm "khu Trung tâm" sang đúng trang; chip "Trung tâm" trong "Theo khu vực" tô nền `--ink`; console không có cảnh báo hydration.

- [ ] **Step 4: Chạy bản build production**

Dừng `pnpm dev` (Ctrl+C), rồi chạy riêng API và bản build của web:

```bash
pnpm --filter @ranhduong/api dev                                                         # terminal 1
pnpm turbo run build --filter=@ranhduong/web && PORT=3100 node apps/web/.output/server/index.mjs   # terminal 2
```

- [ ] **Step 5: Kiểm cache, 404, 503 trên bản build**

Ở terminal 3:

```bash
for p in /da-lat/ca-phe /da-lat/an-uong /da-lat/tham-quan /da-lat/hoat-dong /da-lat/khu-vuc/trung-tam '/da-lat/ca-phe?tags=chill'; do
  echo "== $p"; curl -sI "http://localhost:3100$p" | grep -i -E '^(HTTP|cache-control)'
done
for p in /da-lat/luu-tru /da-lat/cafe /da-lat/khu-vuc /da-lat/khu-vuc/khong-co /ha-noi/ca-phe; do
  echo "== $p"; curl -s -D - -o /dev/null "http://localhost:3100$p" | grep -i -E '^(HTTP|cache-control)'
done
```

Expected: vòng 1, mỗi đường dẫn in `HTTP/1.1 200` và `cache-control` có `s-maxage=3600` cùng `stale-while-revalidate`. Vòng 2, mỗi đường dẫn in `HTTP/1.1 404` và `cache-control: no-store`.

Thử API lỗi: dừng API ở terminal 1, khởi động lại web ở terminal 2 (Ctrl+C rồi `PORT=3100 node apps/web/.output/server/index.mjs`) để xoá cache trong bộ nhớ, rồi:

```bash
for p in /da-lat/ca-phe /da-lat/khu-vuc/trung-tam; do
  curl -s -D /tmp/s10-down.headers -o /tmp/s10-down.html -w "%{http_code} $p\n" "http://localhost:3100$p"
  grep -c 'Chưa tải được hết dữ liệu' /tmp/s10-down.html
  grep -i cache-control /tmp/s10-down.headers
done
```

Expected: mỗi trang in `503`, đếm được `1`, header `cache-control: no-store`. Bật lại API ở terminal 1, chạy `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/da-lat/ca-phe`, phải in `200` (trang 503 không bị cache).

- [ ] **Step 6: Xoá dữ liệu giả**

```bash
docker compose exec -T mongo mongosh ranhduong --quiet --eval 'printjson(db.places.deleteMany({ name: /Giả Lập/ }).deletedCount)'
```

Expected: `28`. Dừng web và API.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/pages/[city]/khu-vuc/[zone].vue" apps/web/nuxt.config.ts
git commit -m "feat: S10 render zone pages"
```

---

### Task 8: Tài liệu, kiểm tra toàn repo, kết thúc nhánh

**Files:**
- Modify: `docs/decisions.md`
- Modify: `docs/technical-design.md`
- Modify: `CLAUDE.md`
- Modify: `docs/backlog.md` (chỉ sau khi chủ dự án đồng ý)

**Interfaces:**
- Consumes: toàn bộ các task trước.
- Produces: tài liệu khớp với code; CI xanh.

- [ ] **Step 1: Ghi quyết định vào `docs/decisions.md`**

Thêm vào cuối bảng (ngày là ngày làm thật):

```markdown
| 2026-10-07 | Cursor phân trang danh sách địa điểm là khoá xếp hạng nổi bật của chỗ cuối trang: `{owner}.{lastVerifiedAt ms \| -}.{slug}` (`PlaceCursor`, `encodePlaceCursor` trong contracts); `cursor` không dùng cùng `q` | Dữ liệu đổi giữa hai lần tải không làm trùng hay sót; đọc hết rồi xếp trong bộ nhớ vẫn đủ nhanh với vài trăm điểm. Đổi thứ tự (danh sách curate S14, gói Starter) thì đổi định dạng; web bỏ qua cursor cũ |
| 2026-10-07 | Lọc nhiều thẻ là "và"; `GET /places` trả kèm `tags` (số chỗ theo thẻ, đếm trước khi lọc thẻ); tên thẻ ở `TAG_LABEL` trong contracts, thẻ chưa có tên hiện slug | Chủ dự án duyệt trong plan S10; danh sách thẻ nằm ở tab "Tags" của Google Sheet, chưa cần quản lý trong admin |
| 2026-10-07 | Trang danh mục, khu vực nhận `?tags=a,b` và `?cursor=`; hai loại này `noindex, follow`; chip thẻ là nút trong form GET (có JS thì chuyển bằng router), "Xem thêm" là link `?cursor=` (có JS thì nối thêm vào danh sách) | Chạy được khi chưa có JS; bot không đi lan ra mọi tổ hợp thẻ nhưng vẫn tới được từng địa điểm |
| 2026-10-07 | Trang khu vực hiện mọi danh mục công khai trong cụm; `zone` không có trong thành phố thì API trả 404 | Ui-spec mục 5 (rỗng thì gợi ý khu Trung tâm); tránh trang 200 rỗng cho slug sai |
| 2026-10-07 | `.rd-chip--filter[aria-current="page"]` tô như chip đang chọn (`packages/ui/src/components.css`) | Chip danh mục, chip cụm là link tới trang; NuxtLink tự gắn `aria-current="page"` cho trang đang xem |
| 2026-10-07 | `routeRules` của trang danh mục ghi thẳng 4 đường dẫn trong `nuxt.config.ts`, phải giữ khớp `CATEGORY_URL_SLUG` | `nuxt.config.ts` chạy lúc `postinstall` (`nuxt prepare`), khi contracts chưa build nên không import được |
```

- [ ] **Step 2: Cập nhật `docs/technical-design.md`**

Mục 6, bảng API khách: thay dòng bắt đầu bằng `| GET | \`/cities/:city/places\`` (dù là bản gốc hay bản đã sửa ở S09 Task 14) bằng:

```markdown
| GET | `/cities/:city/places` | Công khai | Lọc `category`, `tags` (cách nhau dấu phẩy; phải có đủ mọi thẻ), `zone` (slug cụm; không có thì 404), `q` (không dấu; không dùng cùng `cursor`), `limit`, `cursor`. Trả `items`, `nextCursor`, `tags` (số chỗ theo thẻ). `bbox`, `near=lat,lng&radius` thêm ở S12 |
```

Mục 11, ngay dưới bảng "Cấu trúc URL", thêm đoạn:

```markdown
**Trang lọc và trang sau:** trang danh mục và khu vực nhận `?tags=a,b` (lọc thẻ, gửi bằng form nên bot không đi theo) và `?cursor=…` (trang sau, có link để bot đi tới từng địa điểm). Hai loại này `noindex, follow`, vẫn cache SWR 1 giờ như trang gốc.
```

- [ ] **Step 3: Cập nhật mục Trạng thái trong `CLAUDE.md`**

Trong mục `## Trạng thái`:

- Cuối dòng `- Xong: …`, trước dấu chấm cuối, thêm: `, S10 (trang danh mục `/da-lat/{ca-phe,an-uong,tham-quan,hoat-dong}` và khu vực `/da-lat/khu-vuc/{slug}`, lọc thẻ, phân trang cursor; chờ thử trên staging và điện thoại thật sau S02)`.
- Ở dòng `- Tiếp theo: …`, bỏ phần nhắc tới S10 (nếu S09 Task 14 đã thêm `S10 trang danh mục (chip trên trang chủ đang trỏ tới)`).

- [ ] **Step 4: Hỏi chủ dự án về `docs/backlog.md`**

`docs/backlog.md` có thể vẫn đang có thay đổi chưa commit của chủ dự án. Hỏi chủ dự án:

- Nếu đồng ý: đổi cột trạng thái dòng S10 thành `Xong code (nhánh feat/S10-category-zone-pages), đạt tiêu chí nghiệm thu ở local; chờ staging (S02) và điện thoại thật`, rồi stage cả file.
- Nếu không: bỏ qua file này.

- [ ] **Step 5: Chạy kiểm tra toàn repo như CI**

Run: `pnpm infra:up && pnpm turbo run lint typecheck test build`
Expected: tất cả task thành công (`Tasks: … successful`), không có cảnh báo lint.

- [ ] **Step 6: Commit tài liệu**

```bash
git add docs/decisions.md docs/technical-design.md CLAUDE.md
# Thêm docs/backlog.md chỉ khi chủ dự án đã đồng ý ở Step 4.
git commit -m "docs: S10 record decisions and update status"
```

- [ ] **Step 7: Kết thúc nhánh**

Dùng superpowers:finishing-a-development-branch để chọn cách tích hợp (PR vào `main`, sau PR S09). Mô tả PR ghi rõ:

- Tiêu chí nghiệm thu nào kiểm ở bước nào (bảng ở đầu plan).
- Các quyết định chủ dự án duyệt trong plan (mục "Quyết định khi lập plan").
- Việc chưa làm được: thử trên staging và điện thoại thật (chờ S02); canonical, JSON-LD, sitemap (S17); chuẩn hoá cache key cho query lạ (S02).
- Link còn 404 cho tới khi xong story liên quan: `/da-lat/dia-diem/*` (S11), `/da-lat/ban-do` (S12), `/da-lat/lich-trinh/*` (S16).
