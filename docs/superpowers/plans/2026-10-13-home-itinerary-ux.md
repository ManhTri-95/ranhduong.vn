# Trang lịch trình và trang chủ: UX/UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang lịch trình có thanh ngày dính, công tắc Lịch | Bản đồ, một thanh "Chỉ đường điểm n" và timeline gọn; trang chủ đưa tìm kiếm lên đầu, ô thời tiết gọn, thẻ lịch trình kiểu vé, khu vực và chủ đề rõ ràng.

**Architecture:** Logic thuần (tổng quan lịch trình, điểm đang xem, meta thẻ) viết test trước trong `lib/` của từng slice FSD; component Vue chỉ ghép dữ liệu và trạng thái. Phần cần JavaScript (công tắc bản đồ, dải thẻ, thanh cố định) chỉ render sau khi mount, nên HTML SSR (cache SWR) vẫn đủ nội dung và giữ đúng số link chỉ đường. `ItineraryCard` thêm `stopCount`, `season` qua contracts và API.

**Tech Stack:** Nuxt 4 SSR, Vue 3, MapLibre (đã có), Zod contracts, NestJS + MongoDB, Vitest; không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-10-13-home-itinerary-ux-design.md` (đọc kèm `docs/ui-spec.md` §3–§8, `docs/runbooks/mobile-ux-p0.md`).

## Global Constraints

- Node 24, pnpm 12.9.1; TypeScript strict, không `any`, không `@ts-ignore`, không `v-html` (lint `--max-warnings 0`).
- FSD: `pages → widgets → features → entities → shared`, chỉ import lớp thấp hơn, không import ngang hai slice cùng lớp. Component tên `Rd…`, class `rd-…`, chỉ dùng token trong `packages/ui/src/tokens.css`.
- Chữ hiển thị tiếng Việt theo Spec UI §3. Vùng bấm ≥ 44×44px. Thiết kế 390px trước. Tôn trọng `prefers-reduced-motion`.
- Không đổi hoặc thêm route công khai; giữ SSR, canonical, JSON-LD, `routeRules` hiện có.
- Không suy luận trạng thái mở cửa cho điểm lịch trình; không bịa ảnh.
- Chỉ đường chỉ bằng `directionHref` (URL Google Maps, ADR 0001).
- Ô thời tiết giữ "WeatherAPI.com", câu "Thời tiết chỉ để tham khảo, có thể khác theo vị trí và thời điểm." và `<details>` "Lưu ý khi xem dự báo".
- Giữ móc chuyển động S25: `[data-rd-motion-stop]`, `.rd-itinerary-stop__number`, `.rd-itinerary-stop__number-graphic`, CSS theo `data-rd-motion-state`.
- HTML SSR trang lịch trình: mỗi điểm có vị trí đúng một link `data-rd-event="direction_click"` (test S16 đếm 3); thanh cố định và dải thẻ chỉ render ở client.
- Không tự commit. Commit (Conventional Commits, ví dụ `feat: UX itinerary day bar`) chỉ khi chủ dự án yêu cầu, trên nhánh mới sau khi S25 và đợt Mobile UX P0 đã được commit.

## Review Focus

1. Lịch trình một ngày, ngày rỗng hoặc ngày không có điểm nào có vị trí: thanh ngày đúng; chế độ Bản đồ hiện "Chưa có vị trí công khai cho ngày này.", không lỗi (Task 1, 2, 5).
2. Cuộn lên trên điểm đầu hoặc xuống mục chia sẻ cuối trang: thanh cố định vẫn chỉ điểm đầu hoặc điểm cuối, không trống (Task 2, 6).
3. Đổi ngày khi đang ở chế độ Bản đồ: không giữ điểm đã chọn của ngày cũ; chọn điểm đầu có vị trí của ngày mới (Task 2, 5).
4. Tên quán dài ở 320px trên thanh cố định: một dòng, cắt bằng dấu ba chấm, `aria-label` có tên đầy đủ (Task 6).
5. Trang chủ không có thời tiết và không có mùa: ô tìm kiếm vẫn ngay dưới tiêu đề, mục lịch trình không có khoảng trống, desktop phần đầu một cột (Task 10, 11).

## File Structure

| File | Trách nhiệm |
| --- | --- |
| `apps/web/app/entities/itinerary/lib/itinerary-summary.ts` (+ test) | Tổng quan, khung giờ ngày, ngưỡng "Xem thêm" |
| `apps/web/app/entities/itinerary/lib/card-meta.ts` (+ test) | Dòng meta thẻ lịch trình trang chủ |
| `apps/web/app/widgets/itinerary-detail/lib/active-stop.ts` (+ test) | Điểm đang xem, ngày của điểm, điểm đầu có vị trí |
| `apps/web/app/shared/lib/map-camera.ts` (+ test) | Chuyển từ `features/place-map/lib/` để hai bản đồ dùng chung |
| `apps/web/app/widgets/itinerary-detail/ui/RdItineraryDayBar.vue` | Thanh ngày dính + công tắc Lịch, Bản đồ |
| `apps/web/app/widgets/itinerary-detail/ui/RdItineraryStopCarousel.vue` | Dải thẻ điểm ở chế độ Bản đồ |
| `apps/web/app/widgets/itinerary-detail/ui/RdItineraryActionBar.vue` | Thanh "Chỉ đường điểm n" + Chia sẻ |
| `apps/web/app/widgets/itinerary-detail/ui/RdItineraryDetail.vue` | Ghép phần đầu, timeline, bản đồ, thanh |
| `apps/web/app/features/itinerary-map/ui/RdItineraryMap.client.vue` | Chiều cao theo biến CSS, chỉ dịch khi ghim bị che |
| `packages/contracts/src/itinerary.ts` (+ test), `apps/api/src/modules/itineraries/itinerary-card.ts`, `itineraries.repository.ts` (+ test) | `stopCount`, `season` |
| `apps/web/app/entities/itinerary/ui/RdItineraryCard.vue`, `packages/ui/src/components.css` | Thẻ kiểu vé |
| `apps/web/app/widgets/city-weather/ui/RdCityWeather.vue` | Ô thời tiết gọn |
| `apps/web/app/pages/[city]/index.vue`, `widgets/category-chips`, `itinerary-strip`, `featured-places`, `curated-list-strip` | Bố cục trang chủ |
| `apps/web/tests/listing-ssr.test.ts` | Assert SSR mới, fixture `stopCount`, `season` |
| `docs/ui-spec.md`, `docs/runbooks/home-itinerary-ux.md` | Tài liệu |

---

## Phần 1: Trang chi tiết lịch trình

### Task 1: Tổng quan lịch trình và khung giờ ngày

**Files:**
- Create: `apps/web/app/entities/itinerary/lib/itinerary-summary.ts`
- Test: `apps/web/app/entities/itinerary/lib/itinerary-summary.test.ts`

**Interfaces:**
- Produces: `itinerarySummary(days: readonly ItineraryDay[]): ItinerarySummary`, `summaryLine(summary: ItinerarySummary): string`, `daySpan(day: ItineraryDay): { start: string; end: string } | null`, `noteNeedsToggle(text: string, limit?: number): boolean`, hằng `NOTE_PREVIEW_CHARS = 90`, `DESCRIPTION_PREVIEW_CHARS = 160`, type `ItineraryDay = ItineraryTemplateDetail['days'][number]`.

- [ ] **Step 1: Viết test đỏ**

```ts
import type { ItineraryPublicStop, ItineraryStopPlace } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { daySpan, itinerarySummary, noteNeedsToggle, summaryLine, type ItineraryDay } from './itinerary-summary';

const place = (zoneName?: string): ItineraryStopPlace => ({
  slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], unconfirmed: false,
  location: { type: 'Point', coordinates: [108.44, 11.94] }, ...(zoneName ? { zoneName } : {}),
});
const stop = (key: string, opts: { kind?: 'visit' | 'meal'; zone?: string; empty?: boolean; start?: string; end?: string } = {}): ItineraryPublicStop => ({
  key, number: 1, start: opts.start ?? '08:00', end: opts.end ?? '09:00', travelMinFromPrev: 0, note: '',
  kind: opts.kind ?? 'visit', place: opts.empty ? null : place(opts.zone),
});
const day = (n: number, stops: ItineraryPublicStop[]): ItineraryDay => ({ day: n, stops });

describe('itinerarySummary', () => {
  it('đếm mọi điểm dừng kể cả điểm không còn công khai, bữa ăn và khu vực theo thứ tự ghé', () => {
    const days = [day(1, [stop('1-1', { zone: 'Trung tâm' }), stop('1-2', { kind: 'meal', zone: 'Trung tâm' }), stop('1-3', { empty: true })]),
      day(2, [stop('2-1', { kind: 'meal', zone: 'Phía Nam' })])];
    expect(itinerarySummary(days)).toEqual({ stopCount: 4, mealCount: 2, zones: ['Trung tâm', 'Phía Nam'] });
  });
  it('dòng tổng quan bỏ phần rỗng; lịch trình chưa có điểm thì rỗng', () => {
    expect(summaryLine({ stopCount: 12, mealCount: 4, zones: ['Trung tâm', 'Phía Nam'] })).toBe('12 điểm · 4 bữa ăn · Trung tâm, Phía Nam');
    expect(summaryLine({ stopCount: 4, mealCount: 0, zones: [] })).toBe('4 điểm');
    expect(summaryLine({ stopCount: 0, mealCount: 0, zones: [] })).toBe('');
  });
});

describe('daySpan', () => {
  it('lấy giờ bắt đầu điểm đầu và giờ kết thúc điểm cuối; ngày rỗng thì null', () => {
    expect(daySpan(day(1, [stop('a', { start: '07:00', end: '07:45' }), stop('b', { start: '18:00', end: '20:00' })]))).toEqual({ start: '07:00', end: '20:00' });
    expect(daySpan(day(2, []))).toBeNull();
  });
});

describe('noteNeedsToggle', () => {
  it('chỉ có "Xem thêm" khi dài hơn ngưỡng, tính sau khi bỏ khoảng trắng hai đầu', () => {
    expect(noteNeedsToggle('a'.repeat(90))).toBe(false);
    expect(noteNeedsToggle(` ${'a'.repeat(90)} `)).toBe(false);
    expect(noteNeedsToggle('a'.repeat(91))).toBe(true);
    expect(noteNeedsToggle('a'.repeat(161), 160)).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ vì chưa có module**

Run: `pnpm --filter @ranhduong/web exec vitest run app/entities/itinerary/lib/itinerary-summary.test.ts`
Expected: FAIL, không resolve được `./itinerary-summary`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
import type { ItineraryTemplateDetail } from '@ranhduong/contracts';

export type ItineraryDay = ItineraryTemplateDetail['days'][number];
export interface ItinerarySummary { stopCount: number; mealCount: number; zones: string[] }

/** Ghi chú điểm ghé dài hơn ngưỡng này thì rút còn 2 dòng kèm "Xem thêm". */
export const NOTE_PREVIEW_CHARS = 90;
/** Mô tả lịch trình dài hơn ngưỡng này thì rút còn 3 dòng kèm "Đọc thêm". */
export const DESCRIPTION_PREVIEW_CHARS = 160;

/** Tổng quan đầu trang: mọi điểm dừng (khớp stopCount của thẻ trang chủ), bữa ăn, khu vực không trùng theo thứ tự ghé. */
export function itinerarySummary(days: readonly ItineraryDay[]): ItinerarySummary {
  const stops = days.flatMap((day) => day.stops);
  const zones = [...new Set(stops.flatMap((stop) => (stop.place?.zoneName ? [stop.place.zoneName] : [])))];
  return { stopCount: stops.length, mealCount: stops.filter((stop) => stop.kind === 'meal').length, zones };
}

export function summaryLine(summary: ItinerarySummary): string {
  if (!summary.stopCount) return '';
  return [`${summary.stopCount} điểm`, summary.mealCount ? `${summary.mealCount} bữa ăn` : '', summary.zones.join(', ')].filter(Boolean).join(' · ');
}

export function daySpan(day: ItineraryDay): { start: string; end: string } | null {
  const first = day.stops[0];
  const last = day.stops.at(-1);
  return first && last ? { start: first.start, end: last.end } : null;
}

export function noteNeedsToggle(text: string, limit = NOTE_PREVIEW_CHARS): boolean {
  return text.trim().length > limit;
}
```

- [ ] **Step 4: Chạy lại, thấy xanh**

Run: `pnpm --filter @ranhduong/web exec vitest run app/entities/itinerary/lib/itinerary-summary.test.ts`
Expected: PASS 4 test. Nếu TypeScript báo thiếu trường bắt buộc của `ItineraryStopPlace` trong fixture, thêm đúng trường đó với giá trị giả có tên "Giả Lập".

- [ ] **Step 5: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/entities/itinerary/lib/itinerary-summary.ts apps/web/app/entities/itinerary/lib/itinerary-summary.test.ts
git commit -m "feat: UX itinerary summary helpers"
```

### Task 2: Điểm đang xem

**Files:**
- Create: `apps/web/app/widgets/itinerary-detail/lib/active-stop.ts`
- Test: `apps/web/app/widgets/itinerary-detail/lib/active-stop.test.ts`

**Interfaces:**
- Consumes: `ItineraryDay` (Task 1).
- Produces: `interface StopRow { key: string; top: number }`, `activeStopKey(rows: readonly StopRow[], probeY: number): string | null`, `dayOfStop(days: readonly ItineraryDay[], key: string | null): number | undefined`, `firstLocatedKey(stops: readonly ItineraryPublicStop[]): string | null`, `findStop(days: readonly ItineraryDay[], key: string | null): ItineraryPublicStop | undefined`.

- [ ] **Step 1: Viết test đỏ**

```ts
import type { ItineraryPublicStop } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import type { ItineraryDay } from '~/entities/itinerary/lib/itinerary-summary';
import { activeStopKey, dayOfStop, findStop, firstLocatedKey } from './active-stop';

const stop = (key: string, located = true, hasPlace = true): ItineraryPublicStop => ({
  key, number: 1, start: '08:00', end: '09:00', travelMinFromPrev: 0, note: '', kind: 'visit',
  place: hasPlace ? { slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], unconfirmed: false,
    ...(located ? { location: { type: 'Point' as const, coordinates: [108.44, 11.94] as [number, number] } } : {}) } : null,
});
const days: ItineraryDay[] = [{ day: 1, stops: [stop('1-1'), stop('1-2')] }, { day: 2, stops: [stop('2-1', false), stop('2-2')] }, { day: 3, stops: [] }];

describe('activeStopKey', () => {
  const rows = [{ key: '1-1', top: 100 }, { key: '1-2', top: 400 }, { key: '2-1', top: 900 }];
  it('lấy vòng số cuối cùng đã đi qua vạch', () => {
    expect(activeStopKey(rows, 420)).toBe('1-2');
    expect(activeStopKey(rows, 400)).toBe('1-2');
  });
  it('chưa tới điểm nào thì là điểm đầu; qua hết thì là điểm cuối; không có điểm thì null', () => {
    expect(activeStopKey(rows, 50)).toBe('1-1');
    expect(activeStopKey(rows, 5000)).toBe('2-1');
    expect(activeStopKey([], 300)).toBeNull();
  });
});

describe('dayOfStop, findStop', () => {
  it('tìm ngày và điểm theo key; key lạ hoặc null thì undefined', () => {
    expect(dayOfStop(days, '2-2')).toBe(2);
    expect(dayOfStop(days, 'x')).toBeUndefined();
    expect(dayOfStop(days, null)).toBeUndefined();
    expect(findStop(days, '1-2')?.key).toBe('1-2');
    expect(findStop(days, null)).toBeUndefined();
  });
});

describe('firstLocatedKey', () => {
  it('bỏ qua điểm chưa có vị trí hoặc không còn công khai; ngày rỗng thì null', () => {
    expect(firstLocatedKey(days[1]!.stops)).toBe('2-2');
    expect(firstLocatedKey([stop('a', false), stop('b', true, false)])).toBeNull();
    expect(firstLocatedKey([])).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `pnpm --filter @ranhduong/web exec vitest run app/widgets/itinerary-detail/lib/active-stop.test.ts`
Expected: FAIL, không resolve được `./active-stop`.

- [ ] **Step 3: Viết code tối thiểu**

```ts
import type { ItineraryPublicStop } from '@ranhduong/contracts';
import type { ItineraryDay } from '~/entities/itinerary/lib/itinerary-summary';

/** Toạ độ top (px, theo viewport) của vòng số mỗi điểm, theo thứ tự trong trang. */
export interface StopRow { key: string; top: number }

/** Điểm đang xem: vòng số cuối cùng đã lên tới vạch probeY; chưa tới điểm nào thì là điểm đầu. */
export function activeStopKey(rows: readonly StopRow[], probeY: number): string | null {
  let active = rows[0]?.key ?? null;
  for (const row of rows) {
    if (row.top > probeY) break;
    active = row.key;
  }
  return active;
}

export function findStop(days: readonly ItineraryDay[], key: string | null): ItineraryPublicStop | undefined {
  return key ? days.flatMap((day) => day.stops).find((stop) => stop.key === key) : undefined;
}

export function dayOfStop(days: readonly ItineraryDay[], key: string | null): number | undefined {
  return key ? days.find((day) => day.stops.some((stop) => stop.key === key))?.day : undefined;
}

/** Điểm đầu tiên có vị trí, chọn sẵn khi mở bản đồ hoặc đổi ngày. */
export function firstLocatedKey(stops: readonly ItineraryPublicStop[]): string | null {
  return stops.find((stop) => stop.place?.location)?.key ?? null;
}
```

- [ ] **Step 4: Chạy lại, thấy xanh**

Run: `pnpm --filter @ranhduong/web exec vitest run app/widgets/itinerary-detail/lib/active-stop.test.ts`
Expected: PASS 5 test.

- [ ] **Step 5: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/widgets/itinerary-detail/lib/
git commit -m "feat: UX itinerary active stop helpers"
```

### Task 3: Dùng chung `needsPan` cho bản đồ lịch trình

**Files:**
- Move: `apps/web/app/features/place-map/lib/map-camera.ts` → `apps/web/app/shared/lib/map-camera.ts`; `map-camera.test.ts` cũng chuyển theo
- Modify: `apps/web/app/features/place-map/ui/RdPlaceMap.client.vue` (import), `apps/web/app/widgets/place-map/ui/RdMapExplorer.vue` (import), `apps/web/app/features/itinerary-map/ui/RdItineraryMap.client.vue`

**Interfaces:**
- Produces: `~/shared/lib/map-camera` export `needsPan`, `restorableView`, `MAP_MIN_ZOOM`, `MapInsets`, `MapView` (không đổi chữ ký). `RdItineraryMap` cao theo `--itinerary-map-h` (mặc định 360px).

- [ ] **Step 1: Chuyển file và sửa import**

```bash
git mv apps/web/app/features/place-map/lib/map-camera.ts apps/web/app/shared/lib/map-camera.ts
git mv apps/web/app/features/place-map/lib/map-camera.test.ts apps/web/app/shared/lib/map-camera.test.ts
```
(Nếu hai file chưa được git theo dõi, dùng `mv`.) Sửa import:
- `RdPlaceMap.client.vue`: `from '../lib/map-camera'` → `from '~/shared/lib/map-camera'`
- `RdMapExplorer.vue`: `from '~/features/place-map/lib/map-camera'` → `from '~/shared/lib/map-camera'`

- [ ] **Step 2: Chạy test cũ ở chỗ mới, thấy xanh**

Run: `pnpm --filter @ranhduong/web exec vitest run app/shared/lib/map-camera.test.ts`
Expected: PASS 4 test.

- [ ] **Step 3: Bản đồ lịch trình chỉ dịch khi ghim bị che, chiều cao theo biến CSS**

Trong `RdItineraryMap.client.vue`, thêm import `import { needsPan } from '~/shared/lib/map-camera';` và thay watcher `selectedKey`:

```ts
watch(() => props.selectedKey, (key) => {
  highlight();
  const stop = props.stops.find((item) => item.key === key);
  if (!map || !stop?.place?.location) return;
  // Dải thẻ đổi điểm liên tục khi vuốt: chỉ dịch khi ghim đang ra ngoài khung nhìn.
  const canvas = map.getCanvas();
  const point = map.project(stop.place.location.coordinates);
  if (needsPan(point, { width: canvas.clientWidth, height: canvas.clientHeight }, { top: 0, bottom: 0 })) {
    map.easeTo({ center: stop.place.location.coordinates, duration: reducedMotion() ? 0 : 250 });
  }
});
```
CSS: `.rd-itinerary-map { position: relative; height: var(--itinerary-map-h, 360px); }`

- [ ] **Step 4: Kiểm lint, typecheck, test web**

Run: `pnpm --filter @ranhduong/web lint && pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web test`
Expected: exit 0.

- [ ] **Step 5: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/shared/lib/map-camera.ts apps/web/app/shared/lib/map-camera.test.ts apps/web/app/features apps/web/app/widgets/place-map
git commit -m "refactor: UX share map camera helpers"
```

### Task 4: Phần đầu và timeline gọn (SSR)

**Files:**
- Modify: `apps/web/app/widgets/itinerary-detail/ui/RdItineraryDetail.vue`
- Test: `apps/web/tests/listing-ssr.test.ts`

**Interfaces:**
- Consumes: `itinerarySummary`, `summaryLine`, `daySpan`, `noteNeedsToggle`, `NOTE_PREVIEW_CHARS`, `DESCRIPTION_PREVIEW_CHARS` (Task 1); `directionHref`.
- Produces: mỗi `<li class="rd-itinerary-stop">` có `data-rd-stop-key="{key}"` (Task 6 đọc); `.rd-itinerary-detail__summary`; tiêu đề ngày `id="day-{n}"`.

- [ ] **Step 1: Thêm assert SSR đỏ** vào cuối `apps/web/tests/listing-ssr.test.ts`:

```ts
describe('UX itinerary SSR', () => {
  it('shows the overview line, day spans and compact stops without the client-only action bar', async () => {
    const html = await (await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap?audit=ux-itinerary`)).text();
    expect(html).toContain('class="rd-itinerary-detail__summary">4 điểm<');
    expect(html).toContain('08:00 → 11:45');
    expect(html).not.toContain('rd-itinerary-action-bar');
    expect(html).not.toContain('Xem bản đồ lịch trình');
    expect(html.match(/data-rd-event="direction_click"/g)).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Build và chạy SSR test, thấy đỏ**

Run: `pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`
Expected: FAIL ở test mới (chưa có `rd-itinerary-detail__summary`); các test cũ xanh.

- [ ] **Step 3: Viết lại phần đầu và timeline** trong `RdItineraryDetail.vue`.

Script, thêm hoặc đổi:

```ts
import { CATEGORY_LABEL, formatTripLength, PACE_LABEL, TRANSPORT_LABEL, type CityPublic, type ItineraryPublicStop, type ItineraryStopPlace, type ItineraryTemplateDetail } from '@ranhduong/contracts';
import { DESCRIPTION_PREVIEW_CHARS, daySpan, itinerarySummary, noteNeedsToggle, summaryLine } from '~/entities/itinerary/lib/itinerary-summary';

const summary = computed(() => summaryLine(itinerarySummary(props.itinerary.days)));
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const descriptionLong = computed(() => noteNeedsToggle(props.itinerary.description, DESCRIPTION_PREVIEW_CHARS));
const direction = (stop: ItineraryPublicStop) => stop.place ? directionHref({ ...stop.place, status: 'active' }) : undefined;
```
Bỏ `meta` (itineraryMeta) vì eyebrow và chip đã có đủ.

Phần đầu (thay `<header class="rd-itinerary-detail__intro">`):

```vue
<header class="rd-itinerary-detail__intro">
  <p class="rd-itinerary-detail__eyebrow">Lịch trình · {{ formatTripLength(itinerary.days.length) }}</p>
  <h1 class="page-title">{{ itinerary.title }}</h1>
  <ul class="rd-itinerary-detail__chips" aria-label="Đặc điểm lịch trình">
    <li class="rd-chip">{{ capitalize(TRANSPORT_LABEL[itinerary.transport]) }}</li>
    <li class="rd-chip">{{ capitalize(PACE_LABEL[itinerary.pace]) }}</li>
    <li v-if="itinerary.season" class="rd-chip rd-chip--accent">{{ itinerary.season }}</li>
    <li v-if="itinerary.style" class="rd-chip">{{ itinerary.style }}</li>
  </ul>
  <p v-if="summary" class="rd-itinerary-detail__summary">{{ summary }}</p>
  <div v-if="itinerary.description" class="rd-itinerary-detail__description-wrap">
    <input v-if="descriptionLong" id="itinerary-description-more" type="checkbox" class="rd-more-toggle visually-hidden">
    <p :class="['rd-itinerary-detail__description', { 'rd-clamp rd-clamp--3': descriptionLong }]">{{ itinerary.description }}</p>
    <label v-if="descriptionLong" for="itinerary-description-more" class="rd-more-label"><span class="rd-more-label__open">Đọc thêm</span><span class="rd-more-label__close">Thu gọn</span></label>
  </div>
  <p class="rd-itinerary-detail__hint">Giờ ghé và thời gian di chuyển là dự kiến. Xem lại giờ mở cửa ở trang địa điểm trước khi đi nhé.</p>
</header>
```

Tiêu đề ngày:

```vue
<h2 :id="`day-${day.day}`" class="section-title">Ngày {{ day.day }} <span>{{ daySpan(day) ? `${daySpan(day)!.start} → ${daySpan(day)!.end} · ` : '' }}{{ day.stops.length }} điểm</span></h2>
```

Một điểm ghé (thay thân `<li>`; giữ nguyên dòng di chuyển, vòng số, class và thuộc tính S25):

```vue
<li v-for="(stop, index) in day.stops" :key="stop.key" class="rd-itinerary-stop" data-rd-motion-stop :data-rd-stop-key="stop.key" :class="{ 'rd-itinerary-stop--selected': selectedKey === stop.key, 'rd-itinerary-stop--last': index === day.stops.length - 1 }">
  <p v-if="index > 0 && stop.travelMinFromPrev > 0" class="rd-itinerary-stop__travel">{{ TRANSPORT_LABEL[itinerary.transport] }} · khoảng {{ stop.travelMinFromPrev }} phút</p>
  <div class="rd-itinerary-stop__row">
    <button v-if="stop.place?.location && city" type="button" class="rd-itinerary-stop__number" :aria-label="`Xem điểm ${stop.number} ngày ${day.day} trên bản đồ`" :aria-pressed="selectedKey === stop.key" @click="showOnMap(day.day, stop.key)"><span class="rd-itinerary-stop__number-graphic" aria-hidden="true">{{ stop.number }}</span></button>
    <span v-else class="rd-itinerary-stop__number" aria-hidden="true"><span class="rd-itinerary-stop__number-graphic">{{ stop.number }}</span></span>
    <div class="rd-itinerary-stop__body">
      <p class="rd-itinerary-stop__time"><time>{{ stop.start }}</time>–<time>{{ stop.end }}</time><span v-if="stop.kind === 'meal'"> · Bữa ăn</span></p>
      <div class="rd-itinerary-stop__head">
        <h3 :id="`stop-${stop.key}`" tabindex="-1"><NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">{{ stop.place.name }}</NuxtLink><template v-else>Điểm ghé đang cập nhật</template></h3>
        <a v-if="direction(stop)" :href="direction(stop)" class="rd-icon-btn rd-itinerary-stop__go" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến ${stop.place?.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place?.id">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
        </a>
      </div>
      <template v-if="stop.place">
        <p class="rd-itinerary-stop__meta">{{ categories(stop.place) }}<template v-if="stop.place.zoneName"> · {{ stop.place.zoneName }}</template></p>
        <p v-if="stop.place.unconfirmed" class="rd-itinerary-stop__hint">Thông tin chưa được quán xác nhận</p>
        <p v-if="!stop.place.location" class="rd-itinerary-stop__hint">Vị trí đang cập nhật</p>
      </template>
      <p v-else class="rd-itinerary-stop__hint">Chỗ này hiện chưa có thông tin công khai. Bạn chọn điểm khác trên bản đồ nhé.</p>
      <div v-if="stop.note" class="rd-itinerary-stop__note-wrap">
        <input v-if="noteNeedsToggle(stop.note)" :id="`note-${stop.key}`" type="checkbox" class="rd-more-toggle visually-hidden">
        <p :class="['rd-itinerary-stop__note', { 'rd-clamp rd-clamp--2': noteNeedsToggle(stop.note) }]">{{ stop.note }}</p>
        <label v-if="noteNeedsToggle(stop.note)" :for="`note-${stop.key}`" class="rd-more-label"><span class="rd-more-label__open">Xem thêm</span><span class="rd-more-label__close">Thu gọn</span></label>
      </div>
    </div>
  </div>
</li>
```
Địa chỉ và nút "Chỉ đường" vàng 52px bị bỏ khỏi timeline. `categories(place: ItineraryStopPlace)` giữ như cũ.

CSS trong `<style scoped>` của widget, thêm hoặc thay:

```css
.rd-itinerary-detail__eyebrow { text-transform: uppercase; letter-spacing: 0.04em; font-size: 13px; }
.rd-itinerary-detail__chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-itinerary-detail__summary { font-weight: 600; }
.rd-itinerary-detail__description { white-space: pre-line; line-height: 1.7; }
.rd-itinerary-day h2 { scroll-margin-top: calc(var(--itinerary-daybar-h, 64px) + var(--space-3)); }
.rd-itinerary-stop__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
.rd-itinerary-stop__body h3 { scroll-margin-top: calc(var(--itinerary-daybar-h, 64px) + var(--space-3)); }
.rd-itinerary-stop__go { flex: 0 0 auto; border-color: var(--ink); }
.rd-itinerary-stop__go svg { width: 20px; height: 20px; }
.rd-itinerary-stop__note { white-space: pre-line; font: 400 15px/1.6 var(--font-body); }
```
Xoá các rule cũ `.rd-itinerary-stop__note { font: 20px/1.6 var(--font-hand) }`, `.rd-itinerary-stop__body > a`, `.rd-itinerary-stop__address`.

Thêm class dùng chung vào `packages/ui/src/components.css` (cuối khối "Lịch trình"):

```css
/* Rút gọn đoạn dài bằng checkbox + label: không cần JavaScript, trình đọc màn hình vẫn đọc đủ chữ. */
.rd-clamp { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
.rd-clamp--2 { -webkit-line-clamp: 2; }
.rd-clamp--3 { -webkit-line-clamp: 3; }
.rd-more-toggle:checked + .rd-clamp { display: block; -webkit-line-clamp: unset; overflow: visible; }
.rd-more-label { display: inline-flex; align-items: center; min-height: var(--tap-min); font: 600 14px var(--font-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.rd-more-label__close, .rd-more-toggle:checked ~ .rd-more-label .rd-more-label__open { display: none; }
.rd-more-toggle:checked ~ .rd-more-label .rd-more-label__close { display: inline; }
.rd-more-toggle:focus-visible ~ .rd-more-label { outline: 3px solid var(--ink); outline-offset: 2px; }
```

- [ ] **Step 4: Build, chạy SSR test, thấy xanh**

Run: `pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`
Expected: PASS toàn bộ (gồm S16: `direction_click` = 3, `destination=0.3%2C0.2`, `id="day-1"`, `'Ghi chú lịch trình Giả Lập'`, `'OpenStreetMap'`).

- [ ] **Step 5: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/widgets/itinerary-detail/ui/RdItineraryDetail.vue packages/ui/src/components.css apps/web/tests/listing-ssr.test.ts
git commit -m "feat: UX compact itinerary timeline"
```

### Task 5: Thanh ngày dính, công tắc Lịch | Bản đồ, dải thẻ và bản đồ desktop

**Files:**
- Create: `apps/web/app/widgets/itinerary-detail/ui/RdItineraryDayBar.vue`, `RdItineraryStopCarousel.vue`
- Modify: `apps/web/app/widgets/itinerary-detail/ui/RdItineraryDetail.vue`

**Interfaces:**
- Consumes: `firstLocatedKey`, `dayOfStop`, `findStop` (Task 2); `RdItineraryMap` props `{ city, stops, selectedKey }`, emit `select(key)` (Task 3).
- Produces: `RdItineraryDayBar` props `{ days: { day: number; count: number }[]; selectedDay: number; view: 'timeline' | 'map'; showToggle: boolean }`, emits `day: [day: number]`, `view: [view: 'timeline' | 'map']`. `RdItineraryStopCarousel` props `{ stops: ItineraryPublicStop[]; selectedKey: string | null; citySlug: string }`, emits `select: [key: string]`. Trong `RdItineraryDetail`: ref `view`, `selectedDay`, `selectedKey`, `activeKey`, `wide`, `mounted`, hàm `chooseDay(day)`, `setView(view)`, `showOnMap(day, key)`, `ensureMap()`.

- [ ] **Step 1: Tạo `RdItineraryDayBar.vue`**

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineProps<{ days: { day: number; count: number }[]; selectedDay: number; view: 'timeline' | 'map'; showToggle: boolean }>();
const emit = defineEmits<{ day: [day: number]; view: [view: 'timeline' | 'map'] }>();
const sentinel = ref<HTMLElement | null>(null);
const stuck = ref(false);
let observer: IntersectionObserver | undefined;

/** Link #day-n vẫn chạy khi tắt JavaScript; có JS thì trang tự cuộn có tính phần thanh dính. */
function pick(event: MouseEvent, day: number): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  emit('day', day);
}
onMounted(() => {
  if (!sentinel.value || typeof IntersectionObserver !== 'function') return;
  observer = new IntersectionObserver(([entry]) => { stuck.value = !entry?.isIntersecting; });
  observer.observe(sentinel.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <span ref="sentinel" class="rd-itinerary-daybar__sentinel" aria-hidden="true" />
  <div :class="['rd-itinerary-daybar', { 'rd-itinerary-daybar--stuck': stuck }]">
    <nav class="rd-itinerary-daybar__days" aria-label="Chọn ngày trong lịch trình">
      <a v-for="item in days" :key="item.day" :href="`#day-${item.day}`" class="rd-chip rd-chip--filter" :aria-current="item.day === selectedDay ? 'true' : undefined" @click="pick($event, item.day)">Ngày {{ item.day }} · {{ item.count }} điểm</a>
    </nav>
    <div v-if="showToggle" class="rd-itinerary-daybar__views" role="group" aria-label="Cách xem lịch trình">
      <button type="button" :aria-pressed="view === 'timeline'" @click="emit('view', 'timeline')">Lịch</button>
      <button type="button" :aria-pressed="view === 'map'" @click="emit('view', 'map')">Bản đồ</button>
    </div>
  </div>
</template>

<style scoped>
.rd-itinerary-daybar__sentinel { display: block; height: 1px; margin-bottom: -1px; }
.rd-itinerary-daybar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: var(--space-2); margin: 0 calc(-1 * var(--space-5)); padding: var(--space-2) var(--space-5); background: var(--paper); border-bottom: var(--border-hair) solid transparent; transition: border-color var(--dur-standard) var(--ease-out), background-color var(--dur-standard) var(--ease-out); }
.rd-itinerary-daybar--stuck { background: var(--paper-raised); border-bottom-color: var(--line); }
.rd-itinerary-daybar__days { flex: 1; min-width: 0; display: flex; gap: var(--space-2); overflow-x: auto; scrollbar-width: none; }
.rd-itinerary-daybar__days::-webkit-scrollbar { display: none; }
.rd-itinerary-daybar__days a { flex: 0 0 auto; text-decoration: none; }
.rd-itinerary-daybar__days a[aria-current='true'] { background: var(--ink); color: var(--paper-raised); border-color: var(--ink); }
.rd-itinerary-daybar__views { flex: 0 0 auto; display: flex; padding: 2px; border: var(--border-hair) solid var(--ink); border-radius: var(--radius-pill); background: var(--paper-raised); }
.rd-itinerary-daybar__views button { min-height: 40px; min-width: var(--tap-min); padding: 0 var(--space-3); border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink); font: 600 14px var(--font-body); cursor: pointer; transition: background-color var(--dur-standard) var(--ease-out), color var(--dur-standard) var(--ease-out); }
.rd-itinerary-daybar__views button[aria-pressed='true'] { background: var(--ink); color: var(--paper-raised); }
.rd-itinerary-daybar__views button:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
</style>
```
Công tắc cao 40px + viền 2px + đệm 2px ≈ 44px vùng bấm theo chiều cao khối.

- [ ] **Step 2: Tạo `RdItineraryStopCarousel.vue`**

```vue
<script setup lang="ts">
import { CATEGORY_LABEL, type ItineraryPublicStop } from '@ranhduong/contracts';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';

const props = defineProps<{ stops: ItineraryPublicStop[]; selectedKey: string | null; citySlug: string }>();
const emit = defineEmits<{ select: [key: string] }>();
const list = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | undefined;
/** Khi tự cuộn tới thẻ vì người dùng bấm ghim, bỏ qua các thẻ đi ngang qua để không đổi lựa chọn liên tục. */
let ignoreUntil = 0;
const direction = (stop: ItineraryPublicStop) => stop.place ? directionHref({ ...stop.place, status: 'active' }) : undefined;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function observe(): void {
  observer?.disconnect();
  if (!list.value || typeof IntersectionObserver !== 'function') return;
  observer = new IntersectionObserver((entries) => {
    if (performance.now() < ignoreUntil) return;
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    const key = visible?.target instanceof HTMLElement ? visible.target.dataset.stopKey : undefined;
    if (key && key !== props.selectedKey) emit('select', key);
  }, { root: list.value, threshold: 0.6 });
  list.value.querySelectorAll('[data-stop-key]').forEach((card) => observer?.observe(card));
}
watch(() => props.selectedKey, async (key) => {
  await nextTick();
  const card = key ? list.value?.querySelector<HTMLElement>(`[data-stop-key="${CSS.escape(key)}"]`) : null;
  if (!card || !list.value) return;
  const box = list.value.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  if (rect.left >= box.left && rect.right <= box.right) return;
  ignoreUntil = performance.now() + 600;
  card.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced() ? 'instant' : 'smooth' });
});
watch(() => props.stops, async () => { await nextTick(); observe(); });
onMounted(observe);
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <ol ref="list" class="rd-itinerary-carousel" aria-label="Các điểm trong ngày">
    <li v-for="stop in stops" :key="stop.key" :data-stop-key="stop.key" :class="['rd-itinerary-carousel__card', { 'rd-itinerary-carousel__card--selected': stop.key === selectedKey }]">
      <span class="rd-itinerary-carousel__number" aria-hidden="true">{{ stop.number }}</span>
      <div class="rd-itinerary-carousel__body">
        <p class="rd-itinerary-carousel__time">{{ stop.start }}–{{ stop.end }}<template v-if="stop.kind === 'meal'"> · Bữa ăn</template></p>
        <h3><NuxtLink v-if="stop.place" :to="`/${citySlug}/dia-diem/${stop.place.slug}`">{{ stop.place.name }}</NuxtLink><template v-else>Điểm ghé đang cập nhật</template></h3>
        <p v-if="stop.place" class="rd-itinerary-carousel__meta">{{ CATEGORY_LABEL[stop.place.category] }}<template v-if="stop.place.zoneName"> · {{ stop.place.zoneName }}</template></p>
      </div>
      <a v-if="direction(stop)" :href="direction(stop)" class="rd-icon-btn rd-itinerary-carousel__go" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến ${stop.place?.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place?.id">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
      </a>
    </li>
  </ol>
</template>

<style scoped>
.rd-itinerary-carousel { list-style: none; margin: 0 calc(-1 * var(--space-5)); padding: var(--space-3) var(--space-5); display: flex; gap: var(--space-3); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--space-5); overscroll-behavior-x: contain; scrollbar-width: none; }
.rd-itinerary-carousel::-webkit-scrollbar { display: none; }
.rd-itinerary-carousel__card { flex: 0 0 min(280px, 82%); scroll-snap-align: start; display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); transition: border-color var(--dur-standard) var(--ease-out), box-shadow var(--dur-standard) var(--ease-out); }
.rd-itinerary-carousel__card--selected { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.rd-itinerary-carousel__number { flex: 0 0 32px; height: 32px; display: grid; place-items: center; border-radius: var(--radius-pill); background: var(--ink); color: var(--paper-raised); font: 700 15px var(--font-body); }
.rd-itinerary-carousel__card--selected .rd-itinerary-carousel__number { background: var(--accent); color: var(--ink); border: var(--border-strong) solid var(--ink); }
.rd-itinerary-carousel__body { flex: 1; min-width: 0; }
.rd-itinerary-carousel__body p, .rd-itinerary-carousel__body h3 { margin: 0; }
.rd-itinerary-carousel__time, .rd-itinerary-carousel__meta { font-size: 13px; color: var(--ink-soft); }
.rd-itinerary-carousel__body h3 { font: 700 16px/1.35 var(--font-body); }
.rd-itinerary-carousel__body h3 a { text-decoration: none; }
.rd-itinerary-carousel__go { flex: 0 0 auto; border-color: var(--ink); }
.rd-itinerary-carousel__go svg { width: 20px; height: 20px; }
</style>
```

- [ ] **Step 3: Ghép vào `RdItineraryDetail.vue`.** Script: thay `mapOpen`, `openMap`, `showOnMap`, `selectStop`, `chooseDay`:

```ts
import { dayOfStop, findStop, firstLocatedKey } from '../lib/active-stop';
import RdItineraryDayBar from './RdItineraryDayBar.vue';
import RdItineraryStopCarousel from './RdItineraryStopCarousel.vue';

const view = ref<'timeline' | 'map'>('timeline');
const activeKey = ref<string | null>(props.itinerary.days[0]?.stops[0]?.key ?? null);
const wide = ref(false);
const mounted = ref(false);
const aside = ref<HTMLElement | null>(null);
const dayTabs = computed(() => props.itinerary.days.map((day) => ({ day: day.day, count: day.stops.length })));
const hasLocations = computed(() => currentDay.value.stops.some((stop) => stop.place?.location));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let media: MediaQueryList | undefined;
let asideObserver: IntersectionObserver | undefined;

async function ensureMap(): Promise<void> {
  if (mapComponent.value) return;
  mapComponentFailed.value = false;
  try { mapComponent.value = (await import('~/features/itinerary-map/ui/RdItineraryMap.client.vue')).default; }
  catch { mapComponentFailed.value = true; }
}
function selectKey(key: string): void {
  selectedKey.value = key;
  activeKey.value = key;
  selectedDay.value = dayOfStop(props.itinerary.days, key) ?? selectedDay.value;
}
function setView(next: 'timeline' | 'map'): void {
  if (next === view.value) return;
  view.value = next;
  if (next === 'map') {
    const current = findStop(props.itinerary.days, activeKey.value);
    selectedDay.value = dayOfStop(props.itinerary.days, activeKey.value) ?? selectedDay.value;
    selectedKey.value = current?.place?.location ? current.key : firstLocatedKey(currentDay.value.stops);
    void ensureMap();
    return;
  }
  void nextTick(() => document.getElementById(`stop-${selectedKey.value ?? activeKey.value}`)?.scrollIntoView({ block: 'center', behavior: reduced() ? 'instant' : 'smooth' }));
}
function chooseDay(day: number): void {
  selectedDay.value = day;
  const stops = props.itinerary.days.find((item) => item.day === day)?.stops ?? [];
  if (view.value === 'map' && !wide.value) { selectedKey.value = firstLocatedKey(stops); return; }
  selectedKey.value = null;
  document.getElementById(`day-${day}`)?.scrollIntoView({ block: 'start', behavior: reduced() ? 'instant' : 'smooth' });
}
async function showOnMap(day: number, key: string): Promise<void> {
  selectedDay.value = day;
  selectKey(key);
  void ensureMap();
  if (!wide.value) {
    view.value = 'map';
    await nextTick();
    document.querySelector('.rd-itinerary-daybar')?.scrollIntoView({ block: 'start', behavior: reduced() ? 'instant' : 'smooth' });
  }
}
function updateWide(): void { wide.value = media?.matches ?? false; }
onMounted(() => {
  mounted.value = true;
  media = window.matchMedia('(min-width: 1024px)');
  updateWide();
  media.addEventListener('change', updateWide);
  // Desktop: cột bản đồ tự tải khi sắp vào màn hình, không cần bấm nút.
  if (aside.value && typeof IntersectionObserver === 'function') {
    asideObserver = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting && wide.value) { void ensureMap(); asideObserver?.disconnect(); } }, { rootMargin: '200px' });
    asideObserver.observe(aside.value);
  }
});
onBeforeUnmount(() => { media?.removeEventListener('change', updateWide); asideObserver?.disconnect(); });
```
Đổi watcher nếu có `selectStop` cũ: map `@select` gọi `selectKey`. Giữ `reloadMap()`.

Template: đặt thanh ngày giữa phần đầu và cột; timeline ẩn ở chế độ Bản đồ trên điện thoại; khối bản đồ điện thoại; aside chỉ render map khi `wide`:

```vue
<RdItineraryDayBar :days="dayTabs" :selected-day="selectedDay" :view="view" :show-toggle="mounted && !wide && Boolean(city)" @day="chooseDay" @view="setView" />

<section v-if="mounted && !wide && view === 'map' && city" class="rd-itinerary-detail__mapview" aria-labelledby="itinerary-mapview-title">
  <h2 id="itinerary-mapview-title" class="visually-hidden">Bản đồ ngày {{ currentDay.day }}</h2>
  <div v-if="mapComponentFailed" role="status" class="rd-itinerary-detail__map-error">
    <p>Chưa mở được bản đồ. Bạn vẫn xem lịch giờ và Chỉ đường từng điểm.</p>
    <button type="button" class="rd-btn rd-btn--outline" @click="reloadMap">Tải lại để mở bản đồ</button>
  </div>
  <component :is="mapComponent" v-else-if="mapComponent && hasLocations" :city="city" :stops="currentDay.stops" :selected-key="selectedKey" @select="selectKey" />
  <p v-else-if="!hasLocations" class="empty-note">Chưa có vị trí công khai cho ngày này.</p>
  <div v-else class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div>
  <RdItineraryStopCarousel :stops="currentDay.stops" :selected-key="selectedKey" :city-slug="citySlug" @select="selectKey" />
  <nav class="rd-itinerary-detail__attribution" aria-label="Nguồn bản đồ">
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> ·
    <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> ·
    <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ·
    <NuxtLink to="/ghi-nguon#ban-do">Style và giấy phép</NuxtLink>
  </nav>
</section>

<div class="rd-itinerary-detail__columns">
  <div v-show="!mounted || wide || view === 'timeline'" ref="timeline" class="rd-itinerary-detail__timeline"> …các ngày như Task 4… </div>
  <aside v-if="city" ref="aside" class="rd-itinerary-detail__map" aria-labelledby="itinerary-map-title">
    <h2 id="itinerary-map-title" class="section-title" tabindex="-1">Đường ghé ngày {{ currentDay.day }}</h2>
    <p>Số trên bản đồ khớp các điểm trong ngày. Nét đứt nối thứ tự ghé, đường đi thực tế xem ở nút Chỉ đường.</p>
    <div v-if="mapComponentFailed" role="status"><p>Chưa mở được bản đồ. Bạn vẫn xem lịch giờ và Chỉ đường từng điểm.</p><button type="button" class="rd-btn rd-btn--outline" @click="reloadMap">Tải lại để mở bản đồ</button></div>
    <ClientOnly v-else>
      <component :is="mapComponent" v-if="mapComponent && wide" :city="city" :stops="currentDay.stops" :selected-key="selectedKey" @select="selectKey" />
      <div v-else class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div>
      <template #fallback><div class="rd-itinerary-detail__map-loading" role="status">Đang mở bản đồ…</div></template>
    </ClientOnly>
    <p v-if="!hasLocations" class="empty-note">Chưa có vị trí công khai cho ngày này.</p>
    <nav class="rd-itinerary-detail__attribution" aria-label="Nguồn bản đồ"> …giữ bốn link như hiện tại… </nav>
    <noscript>Bật JavaScript để mở bản đồ. Lịch giờ và nút Chỉ đường vẫn dùng được.</noscript>
    <NuxtLink class="rd-itinerary-detail__map-link" :to="`/${citySlug}/ban-do`">Chọn thêm chỗ trên bản đồ thành phố →</NuxtLink>
  </aside>
</div>
```
Xoá `<nav class="rd-itinerary-detail__days">` cũ và nút "Xem bản đồ lịch trình".

CSS thêm:

```css
.rd-itinerary-detail__mapview { display: grid; gap: var(--space-2); --itinerary-map-h: max(280px, 55dvh); animation: rd-fade-up var(--dur-standard) var(--ease-out); }
.rd-itinerary-detail__mapview :deep(.rd-itinerary-map) { margin: 0 calc(-1 * var(--space-5)); }
.rd-itinerary-detail__map-loading { height: var(--itinerary-map-h, 360px); }
.rd-itinerary-detail__map-error { padding: var(--space-3); background: var(--note); border-radius: var(--radius-note); }
/* Điện thoại: bản đồ nằm trong chế độ Bản đồ; cột aside chỉ dùng trên desktop. */
.rd-itinerary-detail__map { display: none; }
@media (min-width: 1024px) {
  .rd-itinerary-detail__map { display: grid; }
}
```
Giữ `.rd-itinerary-detail__attribution` 10px hiện có hoặc nâng 11px cho đồng bộ bản đồ thành phố.

- [ ] **Step 4: Kiểm lint, typecheck, test, build và SSR**

Run: `pnpm --filter @ranhduong/web lint && pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web test && pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`
Expected: tất cả exit 0. SSR vẫn có `OpenStreetMap` (aside luôn có trong HTML) và `direction_click` = 3 (dải thẻ chỉ có ở client).

- [ ] **Step 5: Kiểm trên trình duyệt (Chrome headless CDP, 390×844 có cảm ứng)**

Dev server `pnpm dev`, mở `/da-lat/lich-trinh/<slug thật>`. Kiểm: cuộn thì thanh ngày dính và hiện viền; bấm "Ngày 2" cuộn tới ngày 2 và tiêu đề không bị thanh che; bấm "Bản đồ" thấy map của ngày và dải thẻ; vuốt dải thẻ thì ghim đổi; bấm ghim thì thẻ cuộn tới; đổi ngày ở chế độ Bản đồ chọn điểm đầu có vị trí (Review Focus 3); ngày không có vị trí hiện câu thông báo (Review Focus 1); 1440px bản đồ tự tải trong cột phải.

- [ ] **Step 6: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/widgets/itinerary-detail
git commit -m "feat: UX itinerary day bar and map view"
```

### Task 6: Thanh "Chỉ đường điểm n" và theo dõi điểm đang xem

**Files:**
- Create: `apps/web/app/widgets/itinerary-detail/ui/RdItineraryActionBar.vue`
- Modify: `apps/web/app/widgets/itinerary-detail/ui/RdItineraryDetail.vue`

**Interfaces:**
- Consumes: `activeStopKey`, `findStop`, `dayOfStop` (Task 2); `data-rd-stop-key` (Task 4); `view`, `wide`, `mounted`, `selectedKey`, `activeKey`, `setView` (Task 5).
- Produces: `RdItineraryActionBar` props `{ stop: ItineraryPublicStop | null; day: number; title: string; url: string; fixed: boolean }`, emit `showMap: []`.

- [ ] **Step 1: Tạo `RdItineraryActionBar.vue`**

```vue
<script setup lang="ts">
import type { ItineraryPublicStop } from '@ranhduong/contracts';
import { computed } from 'vue';
import { directionHref } from '~/entities/place/lib/place-detail';

/** fixed: thanh đáy trên điện thoại (chừa chỗ qua body[data-rd-bottom]); false: khối dưới bản đồ desktop. Chỉ render ở client. */
const props = defineProps<{ stop: ItineraryPublicStop | null; day: number; title: string; url: string; fixed: boolean }>();
const emit = defineEmits<{ showMap: [] }>();
const href = computed(() => (props.stop?.place ? directionHref({ ...props.stop.place, status: 'active' }) : undefined));
useHead(() => ({ bodyAttrs: { 'data-rd-bottom': props.fixed ? 'action' : undefined } }));

async function share(): Promise<void> {
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ title: props.title, url: props.url }); return; }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return; }
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('itinerary-share-title')?.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
}
</script>

<template>
  <div :class="['rd-action-bar', 'rd-itinerary-action-bar', { 'rd-itinerary-action-bar--fixed': fixed }]">
    <button type="button" class="rd-icon-btn rd-itinerary-action-bar__share" aria-label="Chia sẻ lịch trình" @click="share">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
    </button>
    <a v-if="href && stop?.place" class="rd-btn rd-btn--accent rd-itinerary-action-bar__go" :href="href" target="_blank" rel="noopener noreferrer" :aria-label="`Chỉ đường đến điểm ${stop.number}: ${stop.place.name}`" data-rd-event="direction_click" :data-rd-place-id="stop.place.id">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
      <span class="rd-itinerary-action-bar__label">Chỉ đường điểm {{ stop.number }} · {{ stop.place.name }}</span>
    </a>
    <button v-else type="button" class="rd-btn rd-btn--primary rd-itinerary-action-bar__go" @click="emit('showMap')">Xem bản đồ ngày {{ day }}</button>
  </div>
</template>

<style scoped>
.rd-itinerary-action-bar { flex-wrap: nowrap; }
.rd-itinerary-action-bar--fixed { position: fixed; z-index: 10; inset: auto 0 0; padding: var(--space-3) var(--space-5) calc(var(--space-3) + env(safe-area-inset-bottom, 0px)); }
.rd-itinerary-action-bar__share { flex: 0 0 var(--button-height); width: var(--button-height); height: var(--button-height); border-color: var(--ink); }
.rd-itinerary-action-bar__go { flex: 1 1 auto; min-width: 0; padding-inline: var(--space-4); }
/* Tên dài: một dòng, ba chấm; aria-label vẫn có tên đầy đủ. */
.rd-itinerary-action-bar__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-itinerary-action-bar:not(.rd-itinerary-action-bar--fixed) { padding: 0; border: 0; background: transparent; }
</style>
```

- [ ] **Step 2: Theo dõi điểm đang xem và đặt thanh** trong `RdItineraryDetail.vue`:

```ts
import { activeStopKey, dayOfStop, findStop, firstLocatedKey } from '../lib/active-stop';
import RdItineraryActionBar from './RdItineraryActionBar.vue';

const focusStop = computed(() => findStop(props.itinerary.days, view.value === 'map' && !wide.value ? selectedKey.value : activeKey.value) ?? null);
const focusDay = computed(() => dayOfStop(props.itinerary.days, focusStop.value?.key ?? null) ?? selectedDay.value);
let frame = 0;
function track(): void {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    if (!timeline.value || (view.value === 'map' && !wide.value)) return;
    const rows = [...timeline.value.querySelectorAll<HTMLElement>('[data-rd-stop-key]')].map((element) => ({
      key: element.dataset.rdStopKey ?? '',
      top: element.querySelector('.rd-itinerary-stop__number')?.getBoundingClientRect().top ?? element.getBoundingClientRect().top,
    }));
    activeKey.value = activeStopKey(rows, window.innerHeight * 0.4);
    selectedDay.value = dayOfStop(props.itinerary.days, activeKey.value) ?? selectedDay.value;
  });
}
/** Điểm đang xem chưa có vị trí: mở bản đồ của ngày; ngày không có vị trí nào thì bản đồ hiện câu "Chưa có vị trí công khai". */
function showDayMap(): void {
  if (wide.value) return;
  const key = firstLocatedKey(currentDay.value.stops);
  if (key) void showOnMap(focusDay.value, key);
  else setView('map');
}
```
Trong `onMounted` thêm `window.addEventListener('scroll', track, { passive: true }); track();`; trong `onBeforeUnmount` thêm `window.removeEventListener('scroll', track); cancelAnimationFrame(frame);`.

Template, cuối `<article>` (sau `RdItineraryShare`) và trong aside (trước link "Chọn thêm chỗ…"):

```vue
<RdItineraryActionBar v-if="mounted && !wide" :stop="focusStop" :day="focusDay" :title="itinerary.title" :url="shareUrl" fixed @show-map="showDayMap" />
```
```vue
<RdItineraryActionBar v-if="mounted && wide" :stop="focusStop" :day="focusDay" :title="itinerary.title" :url="shareUrl" :fixed="false" @show-map="showDayMap" />
```

- [ ] **Step 3: Lint, typecheck, build, SSR**

Run: `pnpm --filter @ranhduong/web lint && pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`
Expected: exit 0; assert Task 4 `not.toContain('rd-itinerary-action-bar')` vẫn xanh.

- [ ] **Step 4: Kiểm trên trình duyệt (CDP 320, 390, 1440)**

Kiểm: cuộn timeline thì nhãn đổi "Chỉ đường điểm n · tên"; cuộn lên đầu trang là điểm 1, cuộn xuống mục chia sẻ là điểm cuối (Review Focus 2); ở 320px tên dài bị cắt ba chấm, `aria-label` đủ tên (Review Focus 4); nút Chia sẻ khi không có `navigator.share` cuộn tới "Rủ bạn đi cùng"; `body` có `data-rd-bottom="action"` trên điện thoại và nội dung cuối không bị thanh che; desktop thanh nằm dưới bản đồ, không cố định; giảm chuyển động thì cuộn tức thì.

- [ ] **Step 5: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/widgets/itinerary-detail
git commit -m "feat: UX itinerary direction action bar"
```

---

## Phần 2: Trang chủ

### Task 7: `ItineraryCard` có `stopCount` và `season`

**Files:**
- Modify: `packages/contracts/src/itinerary.ts`, test `packages/contracts/src/itinerary.test.ts`
- Modify: `apps/api/src/modules/itineraries/itinerary-card.ts`, test `itinerary-card.test.ts`
- Modify: `apps/api/src/modules/itineraries/itineraries.repository.ts`, test `itineraries.repository.test.ts`

**Interfaces:**
- Produces: `ItineraryCard.stopCount?: number` (số nguyên ≥ 0), `ItineraryCard.season?: string`; `TemplateSummary.season?: string`.

- [ ] **Step 1: Test contracts đỏ** (thêm vào `describe('ItineraryCard')`):

```ts
it('nhận số điểm dừng và mùa; từ chối số điểm âm hoặc không nguyên', () => {
  expect(ItineraryCard.parse({ ...CARD, stopCount: 12, season: 'Mùa Giả Lập' })).toMatchObject({ stopCount: 12, season: 'Mùa Giả Lập' });
  expect(ItineraryCard.safeParse({ ...CARD, stopCount: -1 }).success).toBe(false);
  expect(ItineraryCard.safeParse({ ...CARD, stopCount: 1.5 }).success).toBe(false);
});
```
Run: `pnpm --filter @ranhduong/contracts exec vitest run src/itinerary.test.ts`. Expected: FAIL (Zod bỏ trường lạ nên `toMatchObject` không thấy `stopCount`).

- [ ] **Step 2: Sửa schema**

```ts
export const ItineraryCard = z.object({
  slug: Slug,
  title: z.string().min(1),
  days: TripDays,
  transport: ItineraryTransport,
  pace: ItineraryPace,
  coverKey: z.string().optional(),
  /** Mọi điểm dừng, kể cả điểm không còn công khai (khớp dòng tổng quan trang lịch trình). */
  stopCount: z.number().int().nonnegative().optional(),
  /** Mùa admin đặt cho lịch trình; rỗng thì thẻ không có chip mùa. */
  season: z.string().optional(),
});
```
Run lại, expected PASS. Rồi `pnpm --filter @ranhduong/contracts build`.

- [ ] **Step 3: Test API đỏ.** Trong `itinerary-card.test.ts`, đổi kết quả mong đợi của test đầu thành có `stopCount: 3, season: ''`, và thêm:

```ts
it('gắn số điểm dừng và mùa của lịch trình', () => {
  expect(toItineraryCard({ ...SUMMARY, season: 'Mùa Giả Lập' }, new Map())).toMatchObject({ stopCount: 3, season: 'Mùa Giả Lập' });
});
```
Trong `itineraries.repository.test.ts`, test `listPublishedTemplates`: đổi bản `moi` thành `fakeItinerary({ cityId, slug: 'moi', status: 'published', season: 'Mùa Giả Lập', days: … })` và thêm `expect(list[0]).toMatchObject({ season: 'Mùa Giả Lập' });`.
Run: `pnpm infra:up` (nếu chưa chạy) rồi `pnpm --filter @ranhduong/api exec vitest run src/modules/itineraries/itinerary-card.test.ts src/modules/itineraries/itineraries.repository.test.ts`. Expected: FAIL ở các assert mới.

- [ ] **Step 4: Sửa API**

`itinerary-card.ts`: thêm `season?: string;` vào `TemplateSummary`; trong `toItineraryCard` thêm `stopCount: summary.stopPlaceIds.length, season: summary.season ?? ''`.
`itineraries.repository.ts`: `TemplateRow` thêm `season?: string | null;`; projection thêm `season: 1`; map thêm `season: d.season ?? undefined,`.
Run lại test bước 3, expected PASS; rồi `pnpm --filter @ranhduong/api test && pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/api lint`.

- [ ] **Step 5: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add packages/contracts/src/itinerary.ts packages/contracts/src/itinerary.test.ts apps/api/src/modules/itineraries
git commit -m "feat: UX itinerary card stop count and season"
```

### Task 8: Thẻ lịch trình kiểu vé

**Files:**
- Create: `apps/web/app/entities/itinerary/lib/card-meta.ts`, test `card-meta.test.ts`
- Modify: `apps/web/app/entities/itinerary/ui/RdItineraryCard.vue`, `packages/ui/src/components.css` (khối "Thẻ lịch trình"), `apps/web/tests/listing-ssr.test.ts`

**Interfaces:**
- Consumes: `ItineraryCard.stopCount`, `season` (Task 7).
- Produces: `itineraryCardMeta(card: Pick<ItineraryCard, 'stopCount' | 'transport' | 'pace'>): string`.

- [ ] **Step 1: Test đỏ**

```ts
import { describe, expect, it } from 'vitest';
import { itineraryCardMeta } from './card-meta';

describe('itineraryCardMeta', () => {
  it('ghi số điểm, phương tiện, nhịp độ; thiếu số điểm (API cũ) hoặc bằng 0 thì bỏ phần đó', () => {
    expect(itineraryCardMeta({ stopCount: 12, transport: 'motorbike', pace: 'relaxed' })).toBe('12 điểm · xe máy · thong thả');
    expect(itineraryCardMeta({ transport: 'car', pace: 'packed' })).toBe('ô tô · dày lịch');
    expect(itineraryCardMeta({ stopCount: 0, transport: 'taxi', pace: 'relaxed' })).toBe('taxi · thong thả');
  });
});
```
Run: `pnpm --filter @ranhduong/web exec vitest run app/entities/itinerary/lib/card-meta.test.ts`. Expected: FAIL.

- [ ] **Step 2: Code**

```ts
import { PACE_LABEL, TRANSPORT_LABEL, type ItineraryCard } from '@ranhduong/contracts';

/** Dòng meta thẻ lịch trình trang chủ; số ngày hiện riêng ở đầu vé. */
export function itineraryCardMeta(card: Pick<ItineraryCard, 'stopCount' | 'transport' | 'pace'>): string {
  return [card.stopCount ? `${card.stopCount} điểm` : '', TRANSPORT_LABEL[card.transport], PACE_LABEL[card.pace]].filter(Boolean).join(' · ');
}
```
Run lại, expected PASS.

- [ ] **Step 3: Thẻ vé.** `RdItineraryCard.vue`:

```vue
<script setup lang="ts">
import { formatTripLength, type ItineraryCard } from '@ranhduong/contracts';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import { itineraryCardMeta } from '../lib/card-meta';

defineProps<{ itinerary: ItineraryCard; href: string }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
</script>

<template>
  <NuxtLink class="rd-itin" :to="href">
    <div :class="['rd-itin__top', { 'rd-itin__top--stub': !itinerary.coverKey }]">
      <img v-if="itinerary.coverKey" class="rd-itin__img card__img" :src="photoUrl(mediaBase, itinerary.coverKey, 400)" :srcset="photoSrcset(mediaBase, itinerary.coverKey)" sizes="250px" alt="" width="250" height="120" loading="lazy" decoding="async">
      <span class="rd-itin__days">{{ formatTripLength(itinerary.days) }}</span>
    </div>
    <div class="rd-itin__body">
      <span v-if="itinerary.season" class="rd-chip rd-chip--accent">{{ itinerary.season }}</span>
      <h3 class="card__title">{{ itinerary.title }}</h3>
      <p class="rd-place__meta card__meta">{{ itineraryCardMeta(itinerary) }}</p>
      <span class="rd-itin__cta">Xem lịch <span aria-hidden="true">→</span></span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card__img { display: block; width: 100%; object-fit: cover; }
.card__title { margin: 0; font: 700 16px/22px var(--font-body); }
.card__meta { margin: 0; }
</style>
```
`components.css`, thêm sau `.rd-itin__body`:

```css
.rd-itin__top { position: relative; }
.rd-itin__days { position: absolute; top: var(--space-2); left: var(--space-2); padding: 2px var(--space-2); border-radius: var(--radius-pill); background: var(--paper-raised); font: 700 12px/18px var(--font-body); color: var(--ink); }
/* Chưa có ảnh: đầu vé ghi số ngày, răng cưa nét đứt và hai khuyết tròn (Spec UI §9), không có ô xám. */
.rd-itin__top--stub { height: 64px; display: flex; align-items: flex-end; padding: 0 14px var(--space-3); background: var(--paper); border-bottom: var(--border-strong) dashed var(--line); box-sizing: border-box; }
.rd-itin__top--stub::before, .rd-itin__top--stub::after { content: ''; position: absolute; bottom: -9px; width: 16px; height: 16px; border-radius: var(--radius-pill); background: var(--paper); border: var(--border-hair) solid var(--line); }
.rd-itin__top--stub::before { left: -9px; }
.rd-itin__top--stub::after { right: -9px; }
.rd-itin__top--stub .rd-itin__days { position: static; padding: 0; background: transparent; font: 700 20px/1.2 var(--font-display); text-transform: uppercase; }
.rd-itin__cta { margin-top: var(--space-1); font: 600 14px var(--font-body); }
```

- [ ] **Step 4: SSR.** Fixture danh sách lịch trình trong `listing-ssr.test.ts` thêm `stopCount: 4, season: 'Mùa lịch Giả Lập'`; thêm vào `describe('UX itinerary SSR')`:

```ts
it('renders the ticket card meta and season on the home page', async () => {
  const html = await (await fetch(`${base}/da-lat?audit=ux-ticket`)).text();
  expect(html).toContain('4 điểm · xe máy · thong thả');
  expect(html).toContain('Mùa lịch Giả Lập');
  expect(html).not.toContain('rd-itin__img">Ảnh đang cập nhật');
});
```
Run: `pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`. Expected: PASS (đỏ trước bước 3 nếu chạy sớm).

- [ ] **Step 5: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/entities/itinerary packages/ui/src/components.css apps/web/tests/listing-ssr.test.ts
git commit -m "feat: UX itinerary ticket card"
```

### Task 9: Ô thời tiết gọn

**Files:**
- Modify: `apps/web/app/widgets/city-weather/ui/RdCityWeather.vue`

**Interfaces:**
- Produces: vẫn `id="city-weather-title"`, tiêu đề `{trạng thái} · {nhiệt độ}`, link `/{city}/ban-do?rainSafe=true` khi mưa, chữ "WeatherAPI.com", "Thời tiết chỉ để tham khảo", "Lưu ý khi xem dự báo" (test S24 đang kiểm).

- [ ] **Step 1: Đổi template** (script giữ nguyên):

```vue
<template>
  <section v-if="display && weather" class="rd-city-weather" aria-labelledby="city-weather-title">
    <div class="rd-weather rd-city-weather__tile">
      <div class="rd-city-weather__main">
        <span class="rd-weather__icon" aria-hidden="true"> …svg giữ nguyên… </span>
        <div class="rd-city-weather__text">
          <p class="rd-weather__kicker">{{ cityName }} lúc này</p>
          <h2 id="city-weather-title" class="rd-weather__title">{{ display.title }}</h2>
          <p class="rd-weather__sub">{{ display.hint }}</p>
        </div>
      </div>
      <NuxtLink v-if="display.rainMode" class="rd-city-weather__rain" :to="`/${citySlug}/ban-do?rainSafe=true`">Quán trú mưa được gần bạn →</NuxtLink>
      <div class="rd-city-weather__source">
        <p><a href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer">WeatherAPI.com</a> · Thời tiết chỉ để tham khảo, có thể khác theo vị trí và thời điểm.</p>
        <details>
          <summary>Lưu ý khi xem dự báo</summary>
          <p>Dự báo mang tính xác suất và có thể không chính xác. Với quyết định liên quan đến an toàn cá nhân, hàng không, hàng hải hoặc ứng phó khẩn cấp, hãy xem thông tin khí tượng chính thức và hướng dẫn của cơ quan có thẩm quyền; không dùng dữ liệu này làm căn cứ duy nhất.</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rd-city-weather { min-width: 0; }
.rd-city-weather__tile { flex-direction: column; align-items: stretch; gap: var(--space-2); border-radius: var(--radius-card); }
.rd-city-weather__main { display: flex; align-items: flex-start; gap: var(--space-3); }
.rd-weather__icon svg { width: var(--space-7); height: var(--space-7); }
.rd-city-weather__text { min-width: 0; }
.rd-city-weather__text p, .rd-city-weather__text h2 { margin: 0; }
.rd-weather__title { margin-top: var(--space-1); }
.rd-weather__sub { margin-top: var(--space-1); }
.rd-city-weather__rain { display: inline-flex; align-items: center; min-height: var(--tap-min); color: var(--paper-raised); font-size: 14px; font-weight: 600; text-underline-offset: var(--space-1); }
.rd-city-weather__source { padding-top: var(--space-2); border-top: 1px solid rgba(255, 253, 248, 0.2); font-size: 12px; line-height: 1.5; color: rgba(255, 253, 248, 0.86); }
.rd-city-weather__source p { margin: 0; }
.rd-city-weather__source a { color: inherit; }
.rd-city-weather__source summary { display: inline-flex; align-items: center; min-height: var(--tap-min); cursor: pointer; text-decoration: underline; }
.rd-city-weather__source details p { margin-bottom: var(--space-1); }
</style>
```
(Chữ sáng 86% trên `--ink` vẫn đạt AA cho 12px.)

- [ ] **Step 2: Build và SSR**

Run: `pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`
Expected: PASS mọi test S24 (`${label} · 18°C`, `WeatherAPI.com`, `Thời tiết chỉ để tham khảo`, link mưa, hết hạn thì ẩn).

- [ ] **Step 3: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/widgets/city-weather/ui/RdCityWeather.vue
git commit -m "feat: UX compact weather tile"
```

### Task 10: Bố cục trang chủ

**Files:**
- Modify: `apps/web/app/pages/[city]/index.vue`, `apps/web/app/widgets/category-chips/ui/RdCategoryChips.vue`, `apps/web/app/widgets/itinerary-strip/ui/RdItineraryStrip.vue`, `apps/web/app/widgets/featured-places/ui/RdFeaturedPlaces.vue`, `apps/web/app/widgets/curated-list-strip/ui/RdCuratedListStrip.vue`, `apps/web/tests/listing-ssr.test.ts`

**Interfaces:**
- Consumes: `RdZoneLinks` props `{ citySlug, zones }`; `RdSeasonBanner` props `{ citySlug, current }`.
- Produces: `RdItineraryStrip` có slot `lead` (đặt giữa tiêu đề và danh sách thẻ).

- [ ] **Step 1: Assert SSR đỏ** (thêm vào `describe('UX itinerary SSR')`, đổi tên describe thành `'UX home and itinerary SSR'`):

```ts
it('puts search before the weather tile and links zones and the map list', async () => {
  weatherMode = 'sun';
  try {
    const html = await (await fetch(`${base}/da-lat?audit=ux-home`)).text();
    expect(html.indexOf('role="search"')).toBeGreaterThan(-1);
    expect(html.indexOf('role="search"')).toBeLessThan(html.indexOf('id="city-weather-title"'));
    expect(html).toContain('href="/da-lat/khu-vuc/trung-tam"');
    expect(html).toContain('Xem tất cả trên bản đồ');
  } finally { weatherMode = 'none'; }
});
it('keeps the season banner inside the itinerary section', async () => {
  seasonMode = 'flower';
  try {
    const html = await (await fetch(`${base}/da-lat?audit=ux-season`)).text();
    expect(html.indexOf('id="itinerary-strip-title"')).toBeLessThan(html.indexOf('id="season-banner-title"'));
  } finally { seasonMode = 'none'; }
});
```
Run: `pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`. Expected: FAIL ở hai test mới.

- [ ] **Step 2: `index.vue`.** Thêm import `RdZoneLinks`; template `<main>`:

```vue
<main class="home__main">
  <RdErrorBanner v-if="loadFailed" message="Chưa tải được hết dữ liệu, có thể mạng đang chập chờn." @retry="retry" />
  <div class="home__hero">
    <section class="home__intro">
      <h1 class="page-title">{{ cityName ? `${cityName} hôm nay` : 'Hôm nay' }}<br>ghé đâu?</h1>
      <p class="home__lead">Quán nào cũng được hỏi lại trước khi lên đây.</p>
      <RdSearchForm :action="`/${citySlug}/tim-kiem`" :city-slug="citySlug" />
      <RdCategoryChips :city-slug="citySlug" />
    </section>
    <RdCityWeather :city-slug="citySlug" :city-name="cityName" :weather="city.currentNow.value?.weather" />
  </div>
  <RdItineraryStrip :city-slug="citySlug" :itineraries="templateCards" :failed="templatesFailed">
    <template v-if="city.currentNow.value?.season" #lead><RdSeasonBanner :city-slug="citySlug" :current="city.currentNow.value" /></template>
  </RdItineraryStrip>
  <RdFeaturedPlaces :city-slug="citySlug" :places="featuredPlaces" :failed="featuredFailed" :now="now" />
  <RdZoneLinks :city-slug="citySlug" :zones="city.data.value?.zones ?? []" />
  <RdCuratedListStrip :city-slug="citySlug" :lists="curated.data.value?.items ?? []" :failed="curatedFailed" />
</main>
```
CSS:

```css
.home__intro { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.home__lead { margin: 0; font-size: 14px; line-height: 1.5; color: var(--ink-soft); }
.home__hero { display: grid; gap: var(--space-5); }
@media (min-width: 1024px) {
  .home__hero:has(.rd-city-weather) { grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr); align-items: start; gap: var(--space-7); }
}
```

- [ ] **Step 3: Chip một hàng.** `RdCategoryChips.vue` style:

```css
.chips { list-style: none; margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5) var(--space-1); display: flex; gap: var(--space-2); overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--space-5); scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.chips li { flex: 0 0 auto; scroll-snap-align: start; }
.chips a { text-decoration: none; }
@media (min-width: 1024px) { .chips { margin: 0; padding: 0; flex-wrap: wrap; overflow: visible; } }
```

- [ ] **Step 4: Slot banner và lưới desktop.** `RdItineraryStrip.vue`: thêm `<slot name="lead" />` ngay sau `<h2>`; style thêm:

```css
@media (min-width: 1024px) {
  .strip { margin: 0; padding: 0; overflow: visible; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .strip__item :deep(.rd-itin) { width: auto; height: 100%; }
}
```

- [ ] **Step 5: Quán nổi bật.** `RdFeaturedPlaces.vue`: sau `RdPlaceList` thêm

```vue
<NuxtLink v-if="places.length" class="rd-featured__all" :to="`/${citySlug}/ban-do`">Xem tất cả trên bản đồ <span aria-hidden="true">→</span></NuxtLink>
```
style:

```css
.rd-featured__all { align-self: flex-start; display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; }
@media (max-width: 767.98px) { .section :deep(.list > li:nth-child(n + 5)) { display: none; } }
.section :deep(.rd-place__quote) { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
```

- [ ] **Step 6: Chủ đề.** `RdCuratedListStrip.vue`: đổi `<span class="rd-curated-strip__count">` thành eyebrow `Danh sách · {{ list.placeCount }} địa điểm`; mô tả `-webkit-line-clamp: 2`; khi có từ 2 danh sách thì cuộn ngang trên điện thoại:

```css
@media (max-width: 767.98px) {
  .rd-curated-strip__lists { margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5) var(--space-1); display: flex; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: var(--space-5); }
  .rd-curated-strip__lists > li { flex: 0 0 min(300px, 85%); scroll-snap-align: start; }
  .rd-curated-strip__lists > li:only-child { flex-basis: 100%; }
}
```

- [ ] **Step 7: Lint, typecheck, test, build, SSR**

Run: `pnpm --filter @ranhduong/web lint && pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web test && pnpm --filter @ranhduong/web build && pnpm --filter @ranhduong/web test:ssr`
Expected: exit 0, gồm S09, S14, S16 (link lịch trình trên trang chủ), S23 (banner mùa), S24.

- [ ] **Step 8: Kiểm trên trình duyệt (CDP 320, 390, 1440)**

Ô tìm kiếm có `getBoundingClientRect().top ≤ 220` ở 390×844 (có và không có thời tiết, Review Focus 5); chip một hàng không tràn trang; không tràn ngang; thẻ vé không có ô xám; 4 quán trên điện thoại, 6 trên desktop; desktop phần đầu hai cột khi có thời tiết, một cột khi không.

- [ ] **Step 9: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add apps/web/app/pages apps/web/app/widgets apps/web/tests/listing-ssr.test.ts
git commit -m "feat: UX home layout"
```

### Task 11: Tài liệu và kiểm tra toàn bộ

**Files:**
- Modify: `docs/ui-spec.md` (§4 thẻ lịch trình, mốc lịch trình, thanh hành động; §5 dòng Trang chủ và Lịch trình; §7 ô thời tiết)
- Create: `docs/runbooks/home-itinerary-ux.md`

- [ ] **Step 1: Cập nhật Spec UI** đúng các hành vi đã làm: thẻ vé (đầu vé số ngày khi chưa có ảnh, chip mùa, "{n} điểm · phương tiện · nhịp độ"); timeline (nút chỉ đường tròn 44px viền, ghi chú chữ nội dung 2 dòng + "Xem thêm", không địa chỉ); thanh ngày dính + Lịch | Bản đồ; thanh "Chỉ đường điểm n · tên" + Chia sẻ, chỉ client; thứ tự trang chủ; ô thời tiết gọn.

- [ ] **Step 2: Viết runbook** theo mẫu `docs/runbooks/mobile-ux-p0.md`: đã làm, đã kiểm (lệnh và kết quả thật), còn chờ (điện thoại thật, bảng chia sẻ hệ điều hành, artifact Design System, CI, staging, Sentry 24 giờ), ngoài phạm vi (Google Maps nhiều điểm dừng).

- [ ] **Step 3: Kiểm toàn bộ**

Run: `pnpm turbo run lint typecheck test build` rồi `pnpm --filter @ranhduong/web test:ssr`
Expected: exit 0. Ghi số test thật vào runbook.

- [ ] **Step 4: Commit (chỉ khi chủ dự án yêu cầu)**

```bash
git add docs/ui-spec.md docs/runbooks/home-itinerary-ux.md
git commit -m "docs: UX home and itinerary runbook"
```
