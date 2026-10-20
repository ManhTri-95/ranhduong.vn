# S34 Itinerary Place Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hàm thuần `planItinerary` chọn điểm tham quan và cụm cho từng ngày của lịch trình khách (lọc ứng viên, chấm điểm, mẫu gần nhất, gán cụm theo bảng kề trong dữ liệu thành phố, mùa mưa), trả `NOT_ENOUGH_PLACES` kèm gợi ý đã kiểm chứng.

**Architecture:** Dữ liệu: `Zone.adjacentZones` đi từ contracts → seed → Mongoose → `CitiesService.itineraryZones`. Thuật toán: thư mục `apps/api/src/modules/itineraries/planner/` gồm các hàm thuần, không NestJS, không I/O, `now` truyền vào; S35 sắp tuyến/xếp giờ trên kết quả này, S36/S37 nạp snapshot rồi gọi `planItinerary`. Mẫu gần nhất được thử trước; mẫu không đủ điểm thì tạo từ đầu bằng tìm kiếm vét cạn trên tổ hợp cụm (Đà Lạt: 8 lựa chọn/ngày).

**Tech Stack:** TypeScript strict, Zod 4, NestJS 12 + Mongoose 9 (chỉ phần cụm), Vitest; không thêm dependency.

**Spec:** `docs/backlog-slice-2.md` S34, mục 2 (quyết định 1–3, 9, 10, 12, 13); `docs/technical-design.md` mục 3 (`Zone`, `Itinerary`), mục 7 bước 2–6 và 12; `docs/product-spec.md` mục 8; ADR 0007, 0014.

## Global Constraints

- Nhánh `feat/S34-itinerary-place-selection`; commit `feat: S34 …`/`test: S34 …`/`docs: S34 …`.
- TDD bắt buộc (logic lịch trình): viết test, thấy đỏ, rồi mới viết code. Không `any`, không `@ts-ignore`, không thêm thư viện.
- Dữ liệu test chỉ là dữ liệu giả có tên "Giả Lập"; không bịa dữ liệu thật về địa điểm.
- Planner thuần: không đọc `Date.now()`, `Math.random()`, DB hay env; cùng đầu vào cho cùng kết quả. So điểm số dùng `EPS = 1e-9`.
- Gu chỉ cộng điểm, không loại điểm. `isVip` không thuộc S34 (S37 ghi `false`).
- Bảng kề Đà Lạt (đối xứng, đã trừ cặp cấm): `trung-tam` → `phia-nam`, `phia-bac`, `phia-dong`; `phia-nam` → `trung-tam`, `phia-dong`; `phia-bac` → `trung-tam`; `phia-dong` → `trung-tam`, `phia-nam`.
- Chấm điểm: `0,5 × khớp gu + 0,3 × độ phổ biến (chuẩn hoá theo max) + 0,2 × ratingAvg/5` (`ratingAvg` thiếu = 0).
- Số điểm tham quan/ngày: thong thả 4, dày 6; ngày thứ 5 luôn thong thả; ngày dưới 3 điểm tham quan là thiếu điểm (`NOT_ENOUGH_PLACES`).
- Không mở endpoint, không đổi DTO công khai (`CityPublic` giữ nguyên); việc gọi planner thuộc S36/S37.

## Quyết định trong plan (chủ dự án xác nhận khi duyệt plan)

Tài liệu chưa chốt các điểm dưới; plan chọn giá trị khởi đầu, ghi lại ở technical-design mục 7 (Task 8):

1. **Điểm tham quan** là địa điểm phục vụ `attraction`, `cafe`, `activity` hoặc `shop` (danh mục chính hoặc phụ). Quán chỉ là `food` dành cho bữa ăn (S35); `stay` không bao giờ là điểm ghé. Điểm `visit` của mẫu được giữ theo người soạn, không xét danh mục.
2. **`transport` rỗng** nghĩa là chưa nhập (CSV cho để trống), không loại. Có giá trị thì phải chứa phương tiện của khách; `taxi` tính như `car`.
3. **Mùa mưa** cộng điểm cho điểm có mái che trong ngày mưa: `full` +0,2, `partial` +0,1 (`RAIN_COVER_BONUS`). S35 đặt chúng vào buổi chiều.
4. **Độ phổ biến** nhận số thô 30 ngày theo `placeId` từ người gọi (S37 chọn cách cộng từ `place_metrics`), chuẩn hoá bằng chia cho max của snapshot; max 0 thì mọi điểm 0.
5. **Khớp gu** = số tiêu chí khớp / số tiêu chí. Tiêu chí: mỗi gu đã chọn (khớp khi có thẻ trong `TRIP_INTEREST_TAGS` hoặc `bestTime` trong `TRIP_INTEREST_BEST_TIMES`), cộng một tiêu chí khi `TRIP_WITH_TAGS[with]` không rỗng (Gia đình → `gia-dinh`). Không có tiêu chí thì 0.
6. **Mẫu gần nhất:** cùng số ngày, độ giống = Jaccard(`tags`) + 0,25 nếu cùng `with` (`WITH_MATCH_BONUS`); Jaccard của hai tập rỗng = 1; hoà thì id nhỏ hơn. Chỉ thử mẫu gần nhất; ngày nào của mẫu dưới 3 điểm thì bỏ mẫu, tạo từ đầu.
7. **Thay điểm của mẫu:** điểm `visit` của mẫu hợp lệ trong ngày và khớp ít nhất một tiêu chí gu (hoặc khách không có tiêu chí) được giữ trước; điểm của mẫu không khớp gu cạnh tranh với ứng viên cùng cụm theo điểm số; điểm `meal` của mẫu bỏ (S35 chèn bữa). Số điểm theo nhịp độ của khách: thiếu thì bù từ cụm của ngày đó, thừa thì bỏ điểm điểm số thấp. Cụm của ngày theo mẫu, không áp luật cụm kề.
8. **Ghim:** điểm có `bestTime` chứa `sunrise` ghim đầu ngày (`pin: 'first'`), chứa `evening` (không có `sunrise`) ghim cuối ngày (`'last'`); mỗi ngày tối đa một điểm mỗi loại, điểm thứ hai bị bỏ qua khi chọn.
9. **Ngày thứ 5** chỉ chọn điểm phục vụ `cafe` hoặc `shop`, hoặc có thẻ `dac-san` (chợ cần danh mục `shop` hoặc thẻ `dac-san`), được dùng lại cụm, không lặp điểm.
10. **Tổ hợp cụm từ đầu:** vét cạn, ưu tiên theo thứ tự: số ngày đủ điểm, tổng số điểm chọn được, tổng điểm số, ít cụm hơn; hoà thì tổ hợp gặp trước theo thứ tự lựa chọn (cụm đơn theo thứ tự cụm trong dữ liệu thành phố, rồi cặp kề).
11. **Gợi ý khi thiếu điểm:** chạy lại thuật toán và chỉ trả gợi ý thật sự tạo được: `reduce_days` với số ngày lớn nhất còn tạo được, `drop_interests` (bỏ hết gu) khi khách có gu và bỏ gu tạo được. Vì gu chỉ cộng điểm, `drop_interests` chỉ xuất hiện khi bỏ gu đổi mẫu gần nhất.

## Review Focus

- Thành phố có ít cụm hơn số ngày 1–4 (ví dụ 3 cụm, chuyến 4 ngày): không crash, trả thiếu điểm ở ngày không còn cụm (`zoneSlugs: []`) và gợi ý giảm ngày (Task 5, Task 7).
- Lúc mới ra mắt: chưa có `place_metrics`, khách không chọn gu, mọi điểm số bằng 0: vẫn đủ số điểm theo nhịp độ, hoà thì cụm đầu tiên trong dữ liệu (Trung tâm) thắng (Task 5).
- Mẫu cũ hỏng: điểm đã xoá khỏi snapshot, điểm `meal`, một điểm lặp ở hai ngày: không crash, không lặp điểm (Task 6).
- Chuyến qua cuối tháng/cuối năm và mùa mưa vắt qua năm mới (`12-20`→`01-10`): ngày, thứ và cờ mưa đúng từng ngày (Task 2, Task 3).
- Giờ mở cửa lạ: chỉ có ca qua đêm từ hôm trước, ca `open === close`, ngày "Đóng": không tính là mở đúng thứ (Task 3).

---

### Task 1: Bảng cụm kề trong dữ liệu thành phố

**Files:**
- Modify: `packages/contracts/src/city.ts`, `packages/contracts/src/city.test.ts`
- Modify: `apps/api/src/modules/cities/schemas/zone.schema.ts`, `cities.repository.ts`, `cities.service.ts`
- Modify: `apps/api/src/seed/da-lat.ts`, `apps/api/src/seed/da-lat.test.ts`

**Interfaces:**
- Produces: `ZoneInput.adjacentZones: string[]` (`z.array(Slug).default([])`); `ItineraryZone = ZoneRef.extend({ adjacentZones: z.array(Slug) })`; `CitiesService.itineraryZones(cityId: string): Promise<ItineraryZone[]>` theo thứ tự seed (`_id` tăng), document cũ thiếu trường trả `[]`.

- [ ] **Step 1: Tạo nhánh**

Run: `git switch -c feat/S34-itinerary-place-selection`

- [ ] **Step 2: Viết test đỏ cho `CitySeed`** (`city.test.ts`, dùng `SEED`/`issuePaths` sẵn có)

```ts
it('adjacentZones mặc định rỗng', () => expect(CitySeed.parse(SEED).zones[0]?.adjacentZones).toEqual([]));
it('nhận bảng kề đối xứng', () => {
  const zones = [{ ...SEED.zones[0], adjacentZones: ['cum-gia-lap-b'] }, { ...SEED.zones[1], adjacentZones: ['cum-gia-lap-a'] }];
  expect(CitySeed.safeParse({ ...SEED, zones }).success).toBe(true);
});
it.each([
  ['cụm không có trong seed', ['cum-gia-lap-x'], ['cum-gia-lap-a']],
  ['kề chính nó', ['cum-gia-lap-a'], []],
  ['lặp cụm kề', ['cum-gia-lap-b', 'cum-gia-lap-b'], ['cum-gia-lap-a']],
  ['chỉ kề một chiều', ['cum-gia-lap-b'], []],
])('từ chối %s', (_, a, b) => {
  const zones = [{ ...SEED.zones[0], adjacentZones: a }, { ...SEED.zones[1], adjacentZones: b }];
  expect(issuePaths({ ...SEED, zones })).toContainEqual(['zones', 0, 'adjacentZones']);
});
```

- [ ] **Step 3: Viết test đỏ cho seed** (`da-lat.test.ts`)

```ts
it('bảng kề đúng quyết định 19/10/2026, không ghép Bắc–Đông', () => {
  const graph = Object.fromEntries(DA_LAT_SEED.zones.map((z) => [z.slug, [...z.adjacentZones].sort()]));
  expect(graph).toEqual({ 'trung-tam': ['phia-bac', 'phia-dong', 'phia-nam'], 'phia-nam': ['phia-dong', 'trung-tam'], 'phia-bac': ['trung-tam'], 'phia-dong': ['phia-nam', 'trung-tam'] });
});
// trong describe 'ghi vào MongoDB':
it('itineraryZones đọc lại bảng kề theo thứ tự seed; seed lại thì cập nhật', async () => {
  const { cityId } = await service.applySeed(DA_LAT_SEED);
  expect((await service.itineraryZones(cityId)).map((z) => [z.slug, z.adjacentZones.length])).toEqual([['trung-tam', 3], ['phia-nam', 2], ['phia-bac', 1], ['phia-dong', 2]]);
  const edited = { ...DA_LAT_SEED, zones: DA_LAT_SEED.zones.map((z) => ({ ...z, adjacentZones: [] })) };
  await service.applySeed(edited);
  expect((await service.itineraryZones(cityId)).every((z) => z.adjacentZones.length === 0)).toBe(true);
  await service.applySeed(DA_LAT_SEED); // trả lại bảng kề gốc cho các test sau
});
```

- [ ] **Step 4: Chạy test, thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts test -- city.test.ts` và `pnpm infra:up; pnpm --filter @ranhduong/api test -- da-lat.test.ts`
Expected: FAIL (thiếu `adjacentZones`, thiếu `itineraryZones`).

- [ ] **Step 5: Triển khai**

`ZoneInput` thêm `adjacentZones`; `CitySeed.superRefine` kiểm từng cụm (path `['zones', i, 'adjacentZones']`, thông điệp tiếng Việt): slug có trong seed, khác chính nó, không lặp, cụm kia kề lại. Export `ItineraryZone`. `ZoneSchema` thêm `adjacentZones: { type: [String], default: [] }`; `upsertZone` `$set` cả `adjacentZones` (seed là nguồn); repository `listItineraryZones(cityId)` chiếu `slug, name, adjacentZones`, sort `_id`; service `itineraryZones` trả `ItineraryZone[]`. Seed `ZONES` thêm `adjacentZones: DalatZone[]` theo Global Constraints, comment ghi nguồn quyết định 2 và "ranh giới đổi thì sửa bảng kề".

- [ ] **Step 6: Chạy lại test, thấy xanh** — cùng lệnh Step 4, Expected: PASS, các test seed cũ vẫn xanh.

- [ ] **Step 7: Commit** — `git commit -m "feat: S34 store zone adjacency in city data"`

### Task 2: Contracts cho mùa mưa và dữ liệu planner

**Files:**
- Modify: `packages/contracts/src/city-season.ts`, `city-season.test.ts`
- Create: `packages/contracts/src/itinerary-plan.ts`, `itinerary-plan.test.ts`; export ở `index.ts`

**Interfaces:**
- Produces:
  - `seasonCovers(season: Pick<CitySeason, 'from' | 'to'>, monthDay: string): boolean` (bao gồm hai đầu, vắt qua năm mới khi `from > to`); `selectCitySeason` dùng lại hàm này, hành vi không đổi.
  - `inRainSeason(seasons: readonly CitySeason[], monthDay: string): boolean` — có mùa `citySeasonKind(s) === 'rain'` phủ ngày đó.
  - `ItineraryPlace = TemplatePlace.extend({ tags: z.array(Slug), bestTime: z.array(BestTime), cover: PlaceCover.optional(), transport: z.array(Transport), ratingAvg: z.number().min(1).max(5).optional() })`.
  - `PlanSuggestion = discriminatedUnion('kind', [{ kind: 'reduce_days', days: TripDays }, { kind: 'drop_interests' }])`.
  - `PlanShortage = { day: int 1–5, zoneSlugs: Slug[] (có thể rỗng: không còn cụm), available: int ≥ 0 }`.
  - `NotEnoughPlacesDetails = { shortages: PlanShortage[] (min 1), suggestions: PlanSuggestion[] }`.

- [ ] **Step 1: Viết test đỏ**

```ts
// city-season.test.ts
const rain = (from: string, to: string, extra = {}) => ({ ...SEASON_FIXTURE, key: 'mua-gia-lap', kind: 'rain' as const, from, to, ...extra });
it('inRainSeason bao gồm hai đầu khoảng', () => {
  const seasons = [rain('05-01', '11-30')];
  expect(['05-01', '11-30'].map((d) => inRainSeason(seasons, d))).toEqual([true, true]);
  expect(inRainSeason(seasons, '12-01')).toBe(false);
});
it('inRainSeason vắt qua năm mới', () => {
  const seasons = [rain('12-20', '01-10')];
  expect(['12-31', '01-01', '01-11'].map((d) => inRainSeason(seasons, d))).toEqual([true, true, false]);
});
it('chỉ mùa mưa mới tính; mùa cũ key mua-mua không có kind vẫn là mưa; không có mùa thì false', () => {
  expect(inRainSeason([rain('05-01', '11-30', { kind: 'flower' })], '06-01')).toBe(false);
  expect(inRainSeason([rain('05-01', '11-30', { kind: undefined, key: 'mua-mua' })], '06-01')).toBe(true);
  expect(inRainSeason([], '06-01')).toBe(false);
});
// itinerary-plan.test.ts: một ItineraryPlace giả đủ trường parse được; tags không phải slug bị từ chối;
// reduce_days với days 0 bị từ chối; NotEnoughPlacesDetails nhận shortage zoneSlugs [] và từ chối shortages rỗng.
```

(`SEASON_FIXTURE`: dùng fixture mùa giả có sẵn trong file test, hoặc khai báo một mùa "Giả Lập" đủ trường `CitySeason`.)

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/contracts test -- city-season itinerary-plan`, Expected: FAIL (chưa export).

- [ ] **Step 3: Triển khai** theo Interfaces; `itinerary-plan.ts` import `TemplatePlace` từ `itinerary-admin.js`.

- [ ] **Step 4: Chạy lại test** — Expected: PASS, test `selectCitySeason` cũ vẫn xanh.

- [ ] **Step 5: Commit** — `git commit -m "feat: S34 add rain season helper and planner contracts"`

### Task 3: Lịch chuyến và lọc ứng viên

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/calendar.ts`, `calendar.test.ts`
- Create: `apps/api/src/modules/itineraries/planner/candidates.ts`, `candidates.test.ts`
- Create: `apps/api/src/testing/planner-fixtures.ts`

**Interfaces:**
- Produces:
  - `interface TripDay { day: number; date: string; weekday: number; monthDay: string }`; `tripCalendar(startDate: string, days: number): TripDay[]` — cộng ngày theo UTC trên chuỗi `YYYY-MM-DD`, `weekday` 0 = Chủ nhật.
  - `opensOn(slots: readonly OpeningSlot[], weekday: number): boolean` — có ca của đúng `weekday` với `open !== close`; ca qua đêm của hôm trước không tính.
  - `interface DayFilter { weekday: number; transport: ItineraryTransport; now: Date; zoneIds: ReadonlySet<string> }`; `isEligible(place: ItineraryPlace, filter: DayFilter): boolean` — `status === 'active'`, `!verificationStale(lastVerifiedAt, now)`, có `location`, `zoneId` thuộc `zoneIds`, `openingHoursIssues(openingHours)` rỗng, `opensOn`, và `transport` rỗng hoặc chứa `motorbike` (khách đi xe máy) / `car` (ô tô, taxi).
  - `VISIT_CATEGORIES = ['attraction', 'cafe', 'activity', 'shop']`; `isVisitPlace(place)` dùng `servesCategory`.
  - `LEISURE_CATEGORIES = ['cafe', 'shop']`, `LEISURE_TAGS = ['dac-san']`; `isLeisurePlace(place)`.
  - Fixture: `NOW = new Date('2026-11-20T03:00:00Z')`; `ZONES: ItineraryZone[]` bốn cụm "Cụm … Giả Lập" theo đồ thị Đà Lạt (thứ tự trung tâm, nam, bắc, đông); `fakePlace(n, overrides?)` (id 24 hex từ `n`, tên `Điểm Giả Lập n`, `attraction`, `active`, cụm 0, mở 0–6 07:00–22:00, xác minh `NOW − 10 ngày`, mảng rỗng); `placesIn(zoneIndex, count, firstN, overrides?)`; `fakeRequest(overrides?)` (`days: 1`, `startDate: '2026-11-23'` Thứ Hai, `motorbike`, `friends`, `tags: []`, `relaxed`).

- [ ] **Step 1: Viết test đỏ**

```ts
it('tripCalendar qua cuối năm', () => {
  expect(tripCalendar('2026-12-30', 3)).toEqual([
    { day: 1, date: '2026-12-30', weekday: 3, monthDay: '12-30' },
    { day: 2, date: '2026-12-31', weekday: 4, monthDay: '12-31' },
    { day: 3, date: '2027-01-01', weekday: 5, monthDay: '01-01' },
  ]);
});
it('opensOn bỏ ca qua đêm của hôm trước và ca open === close', () => {
  expect(opensOn([{ day: 1, open: '18:00', close: '02:00' }], 2)).toBe(false);
  expect(opensOn([{ day: 2, open: '08:00', close: '08:00' }], 2)).toBe(false);
  expect(opensOn([{ day: 2, open: '00:00', close: '24:00' }], 2)).toBe(true);
});
const filter = { weekday: 1, transport: 'motorbike', now: NOW, zoneIds: new Set(ZONES.map((z) => z.id)) } as const;
it('isEligible nhận điểm đủ điều kiện, kể cả xác minh đúng 90 ngày và transport rỗng', () => {
  expect(isEligible(fakePlace(1), filter)).toBe(true);
  expect(isEligible(fakePlace(1, { lastVerifiedAt: new Date(NOW.getTime() - 90 * 86_400_000).toISOString() }), filter)).toBe(true);
});
it.each([
  ['nghi ngờ', { status: 'suspected' }], ['nháp', { status: 'draft' }], ['chưa xác minh', { lastVerifiedAt: undefined }],
  ['quá 90 ngày', { lastVerifiedAt: new Date(NOW.getTime() - 90 * 86_400_000 - 1).toISOString() }],
  ['thiếu toạ độ', { location: undefined }], ['thiếu cụm', { zoneId: undefined }], ['cụm lạ', { zoneId: 'ffffffffffffffffffffffff' }],
  ['chưa có giờ', { openingHours: [] }], ['giờ hỏng', { openingHours: [{ day: 3, open: '08:00', close: '08:00' }, { day: 1, open: '07:00', close: '22:00' }] }],
  ['đóng Thứ Hai', { openingHours: [{ day: 2, open: '07:00', close: '22:00' }] }], ['chỉ ô tô', { transport: ['car'] }],
])('isEligible loại điểm %s', (_, overrides) => expect(isEligible(fakePlace(1, overrides), filter)).toBe(false));
it('taxi cần điểm cho ô tô', () => expect(isEligible(fakePlace(1, { transport: ['motorbike'] }), { ...filter, transport: 'taxi' })).toBe(false));
it('isVisitPlace/isLeisurePlace theo danh mục và thẻ', () => {
  expect(['attraction', 'cafe', 'activity', 'shop', 'food', 'stay'].map((category) => isVisitPlace(fakePlace(1, { category })))).toEqual([true, true, true, true, false, false]);
  expect(isVisitPlace(fakePlace(1, { category: 'food', alsoCategories: ['cafe'] }))).toBe(true);
  expect([isLeisurePlace(fakePlace(1, { category: 'cafe' })), isLeisurePlace(fakePlace(1)), isLeisurePlace(fakePlace(1, { tags: ['dac-san'] }))]).toEqual([true, false, true]);
});
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/calendar planner/candidates`, Expected: FAIL (module chưa có).

- [ ] **Step 3: Triển khai** theo Interfaces (dùng `verificationStale`, `openingHoursIssues`, `servesCategory` từ contracts).

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S34 filter itinerary candidates per trip day"`

### Task 4: Chấm điểm và chọn điểm trong một danh sách

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/scoring.ts`, `scoring.test.ts`

**Interfaces:**
- Consumes: `ItineraryPlace`, `ItineraryRequest`, `TRIP_INTEREST_TAGS`, `TRIP_INTEREST_BEST_TIMES`, `TRIP_WITH_TAGS`.
- Produces:
  - `SCORE_WEIGHTS = { interest: 0.5, popularity: 0.3, rating: 0.2 }`, `RAIN_COVER_BONUS = { full: 0.2, partial: 0.1 }`, `EPS = 1e-9`.
  - `interestMatch(place: Pick<ItineraryPlace, 'tags' | 'bestTime'>, request: Pick<ItineraryRequest, 'tags' | 'with'>): number` (quyết định 5).
  - `popularityShares(placeIds: readonly string[], popularity: ReadonlyMap<string, number>): Map<string, number>`.
  - `scorePlace(place: ItineraryPlace, ctx: { request: Pick<ItineraryRequest, 'tags' | 'with'>; popularityShare: number; rainy: boolean }): number`.
  - `pinOf(place: Pick<ItineraryPlace, 'bestTime'>): 'first' | 'last' | undefined` (quyết định 8).
  - `interface ScoredPlace { place: ItineraryPlace; score: number; match: number }` (`match` = `interestMatch`, Task 6 dùng); `byScore(a, b)`: điểm giảm dần (chênh ≤ `EPS` coi như bằng), rồi `place.id` tăng dần.
  - `pickVisits(ranked: readonly ScoredPlace[], target: number, used: ReadonlySet<string>): ScoredPlace[]` — đi theo thứ tự đã cho, bỏ id đã dùng/đã chọn, bỏ điểm `pin` thứ hai cùng loại, dừng ở `target`.

- [ ] **Step 1: Viết test đỏ**

```ts
const req = (tags: TripInterest[], w: TripWith = 'friends') => ({ tags, with: w });
it('interestMatch theo tiêu chí gu và đi cùng ai', () => {
  expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req([]))).toBe(0);
  expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req(['chill_cafe']))).toBe(1);
  expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req(['chill_cafe', 'photo_spots']))).toBe(0.5);
  expect(interestMatch(fakePlace(1, { bestTime: ['sunrise'] }), req(['clouds_hills']))).toBe(1);
  expect(interestMatch(fakePlace(1, { tags: ['dac-san'] }), req(['breakfast_specialties']))).toBe(1);
  expect(interestMatch(fakePlace(1, { tags: ['gia-dinh'] }), req([], 'family'))).toBe(1);
  expect(interestMatch(fakePlace(1, { tags: ['chill'] }), req(['chill_cafe'], 'family'))).toBe(0.5);
  expect(interestMatch(fakePlace(1, { tags: ['gia-dinh'] }), req([], 'couple'))).toBe(0);
});
it('popularityShares chia cho max, thiếu hoặc toàn 0 thì 0', () => {
  expect([...popularityShares(['a', 'b', 'c'], new Map([['a', 10], ['b', 5]]))]).toEqual([['a', 1], ['b', 0.5], ['c', 0]]);
  expect([...popularityShares(['a'], new Map())]).toEqual([['a', 0]]);
});
it('scorePlace theo trọng số và mái che ngày mưa', () => {
  const base = { request: req(['chill_cafe']), popularityShare: 0.5, rainy: false };
  expect(scorePlace(fakePlace(1, { tags: ['chill'] }), base)).toBeCloseTo(0.65);
  expect(scorePlace(fakePlace(1, { tags: ['chill'], ratingAvg: 4 }), base)).toBeCloseTo(0.81);
  expect(['full', 'partial', 'none', undefined].map((cover) => scorePlace(fakePlace(1, { cover }), { ...base, rainy: true }))).toEqual([0.35, 0.25, 0.15, 0.15].map((v) => expect.closeTo(v)));
  expect(scorePlace(fakePlace(1, { cover: 'full' }), base)).toBeCloseTo(0.15);
});
it('pinOf ưu tiên bình minh', () => {
  expect([['sunrise', 'morning'], ['evening'], ['sunrise', 'evening'], []].map((bestTime) => pinOf({ bestTime }))).toEqual(['first', 'last', 'first', undefined]);
});
it('pickVisits bỏ điểm đã dùng và ghim trùng loại, dừng ở target', () => {
  const s = (n: number, score: number, bestTime: BestTime[] = []) => ({ place: fakePlace(n, { bestTime }), score, match: 0 });
  const ranked = [s(1, 0.9, ['sunrise']), s(2, 0.8, ['sunrise']), s(3, 0.7, ['evening']), s(4, 0.6, ['evening']), s(5, 0.5), s(6, 0.4)];
  expect(pickVisits(ranked, 3, new Set([fakePlace(5).id])).map((p) => p.place.name)).toEqual(['Điểm Giả Lập 1', 'Điểm Giả Lập 3', 'Điểm Giả Lập 6']);
  expect(pickVisits(ranked.slice(0, 2), 4, new Set())).toHaveLength(1);
});
it('byScore hoà thì id nhỏ trước', () => { /* hai ScoredPlace cùng score, id 2 và 1 → sort ra 1, 2 */ });
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/scoring`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces.

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S34 score itinerary candidates"`

### Task 5: Ngữ cảnh chuyến và gán cụm khi tạo từ đầu

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/plan-context.ts`, `plan-context.test.ts`
- Create: `apps/api/src/modules/itineraries/planner/zones.ts`, `zones.test.ts`
- Modify: `apps/api/src/testing/planner-fixtures.ts` (thêm `planInput(overrides?: Partial<PlanInput>): PlanInput`, mặc định `fakeRequest()`, `places: []`, `ZONES`, `seasons: []`, `templates: []`, `popularity: new Map()`, `now: NOW`; thêm `SEASON_GIA_LAP: CitySeason` mùa giả đủ trường)

**Interfaces:**
- Consumes: Task 3–4.
- Produces (`plan-context.ts`):
  - `VISITS_PER_DAY = { relaxed: 4, packed: 6 }`, `MIN_VISITS_PER_DAY = 3`.
  - `interface PlanTemplate { id: string; tags: readonly TripInterest[]; with?: TripWith; days: readonly { stops: readonly { placeId: string; kind: StopKind }[] }[] }`.
  - `interface PlanInput { request: ItineraryRequest; places: readonly ItineraryPlace[]; zones: readonly ItineraryZone[]; seasons: readonly CitySeason[]; templates: readonly PlanTemplate[]; popularity: ReadonlyMap<string, number>; now: Date }`.
  - `interface DayPool { trip: TripDay; rainy: boolean; pace: ItineraryPace; target: number; scored: ReadonlyMap<string, ScoredPlace>; visits: readonly ScoredPlace[] }` — `scored`: mọi điểm `isEligible` trong ngày (mọi danh mục); `visits`: `scored` ∩ `isVisitPlace` (ngày 5: ∩ `isLeisurePlace`), sắp `byScore`. Ngày 5: `pace = 'relaxed'`.
  - `interface PlanContext { request: ItineraryRequest; zones: readonly ItineraryZone[]; places: ReadonlyMap<string, ItineraryPlace>; templates: readonly PlanTemplate[]; days: readonly DayPool[] }`; `prepare(input: PlanInput): PlanContext` — sắp `places`, `templates` theo id; giữ thứ tự `zones`; `rainy = inRainSeason(seasons, trip.monthDay)`.
- Produces (`zones.ts`):
  - `interface ZoneOption { zoneIds: string[]; slugs: string[] }`; `zoneOptions(zones): ZoneOption[]` — cụm đơn theo thứ tự dữ liệu, rồi cặp `(i < j)` khi hai cụm liệt kê nhau trong `adjacentZones`.
  - `interface DayPick { zoneIds: string[]; picks: ScoredPlace[] }`; `type DraftPlan = { ok: true; days: DayPick[] } | { ok: false; shortages: PlanShortage[] }`.
  - `planFromScratch(ctx: PlanContext): DraftPlan` — DFS theo ngày: ngày 1–4 chỉ dùng lựa chọn không chạm cụm đã dùng ở ngày 1–4, không còn lựa chọn thì ngày đó rỗng (`zoneIds: []`); ngày 5 dùng mọi lựa chọn; mỗi ngày `pickVisits(visits ∩ cụm của lựa chọn, target, điểm đã chọn ở các ngày trước)`. Giữ lá tốt nhất theo quyết định 10 (so điểm số bằng `EPS`, chỉ thay khi tốt hơn hẳn). Lá tốt nhất có ngày dưới `MIN_VISITS_PER_DAY` → `shortages` của các ngày đó (`available` = số điểm chọn được).

- [ ] **Step 1: Viết test đỏ**

`plan-context.test.ts`: chuyến 5 ngày `packed` → `days.map((d) => [d.pace, d.target])` là bốn `['packed', 6]` rồi `['relaxed', 4]`; `visits` ngày 5 chỉ có điểm leisure, ngày 1 không có quán `food`; mùa mưa `11-01`→`11-30`, `startDate: '2026-11-29'`, 3 ngày → `rainy` `[true, true, false]`; đổi thứ tự `places` → `prepare` cho cùng `visits`.

`zones.test.ts`:

```ts
const zonesOf = (r: DraftPlan) => (r.ok ? r.days.map((d) => d.zoneIds.map((id) => ZONES.findIndex((z) => z.id === id))) : null);
it('zoneOptions: 4 cụm đơn rồi 4 cặp kề, không có Bắc–Đông', () => {
  expect(zoneOptions(ZONES).map((o) => o.zoneIds.map((id) => ZONES.findIndex((z) => z.id === id)))).toEqual([[0], [1], [2], [3], [0, 1], [0, 2], [0, 3], [1, 3]]);
});
it('4 ngày đầu không lặp cụm, mỗi ngày đủ 4 điểm', () => {
  const r = planFromScratch(prepare(planInput({ request: fakeRequest({ days: 4 }), places: [0, 1, 2, 3].flatMap((z) => placesIn(z, 5, z * 10)) })));
  expect(new Set(zonesOf(r)?.flat()).size).toBe(4);
  expect(r.ok && r.days.every((d) => d.picks.length === 4)).toBe(true);
});
it('ít điểm thì ghép cụm kề; không ghép Bắc–Đông', () => {
  expect(zonesOf(planFromScratch(prepare(planInput({ places: [...placesIn(0, 2, 0), ...placesIn(1, 2, 10)] }))))).toEqual([[0, 1]]);
  expect(planFromScratch(prepare(planInput({ places: [...placesIn(2, 2, 0), ...placesIn(3, 2, 10)] }))).ok).toBe(false);
});
it('chọn cụm có tổng điểm cao hơn; hoà thì một cụm và cụm đầu tiên trong dữ liệu', () => {
  const chill = planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [...placesIn(0, 4, 0), ...placesIn(1, 4, 10, { tags: ['chill'] })] });
  expect(zonesOf(planFromScratch(prepare(chill)))).toEqual([[1]]);
  expect(zonesOf(planFromScratch(prepare(planInput({ places: [0, 1, 2, 3].flatMap((z) => placesIn(z, 4, z * 10)) }))))).toEqual([[0]]);
});
it('gu chỉ cộng điểm: không điểm nào hợp gu vẫn đủ ngày', () => {
  const r = planFromScratch(prepare(planInput({ request: fakeRequest({ tags: ['nature_adventure'] }), places: placesIn(0, 4, 0) })));
  expect(r.ok && r.days[0]?.picks.length).toBe(4);
});
it('ngày 5 thong thả, chỉ cà phê/mua sắm/đặc sản, dùng lại cụm, không lặp điểm', () => {
  const places = [0, 1, 2, 3].flatMap((z) => [...placesIn(z, 6, z * 20), ...placesIn(z, 5, z * 20 + 10, { category: 'cafe' })]);
  const popularity = new Map(places.filter((p) => p.category === 'attraction').map((p) => [p.id, 10]));
  const r = planFromScratch(prepare(planInput({ request: fakeRequest({ days: 5, pace: 'packed' }), places, popularity })));
  const ids = r.ok ? r.days.flatMap((d) => d.picks.map((p) => p.place.id)) : [];
  expect(new Set(ids).size).toBe(ids.length);
  expect(r.ok && r.days[4]?.picks.length).toBe(4);
  expect(r.ok && r.days[4]?.picks.every((p) => p.place.category === 'cafe')).toBe(true);
});
it('mùa mưa ưu tiên điểm có mái che', () => {
  const places = [...placesIn(0, 4, 0, { cover: 'none' }), ...placesIn(0, 4, 10, { cover: 'full' })];
  const seasons = [{ ...SEASON_GIA_LAP, kind: 'rain' as const, from: '11-01', to: '11-30' }];
  const picks = (startDate: string) => { const r = planFromScratch(prepare(planInput({ request: fakeRequest({ startDate }), places, seasons }))); return r.ok ? r.days[0]?.picks.map((p) => p.place.cover) : []; };
  expect(picks('2026-11-23')).toEqual(['full', 'full', 'full', 'full']);
  expect(picks('2026-12-07')).toEqual(['none', 'none', 'none', 'none']);
});
it('thiếu điểm: báo cụm và số điểm; thiếu cụm cho ngày 4 thì zoneSlugs rỗng', () => {
  expect(planFromScratch(prepare(planInput({ places: placesIn(0, 1, 0) })))).toEqual({ ok: false, shortages: [{ day: 1, zoneSlugs: [ZONES[0]!.slug], available: 1 }] });
  const threeZones = planInput({ request: fakeRequest({ days: 4 }), zones: ZONES.slice(0, 3).map((z) => ({ ...z, adjacentZones: z.adjacentZones.filter((s) => s !== ZONES[3]!.slug) })), places: [0, 1, 2].flatMap((z) => placesIn(z, 4, z * 10)) });
  expect(planFromScratch(prepare(threeZones))).toEqual({ ok: false, shortages: [{ day: 4, zoneSlugs: [], available: 0 }] });
});
```

(`SEASON_GIA_LAP`: mùa giả đủ trường `CitySeason`, khai báo trong fixture. Ngày `2026-12-07` là Thứ Hai.)

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/plan-context planner/zones`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces. Thêm vào runbook nháp (Task 8) độ phức tạp: Đà Lạt tối đa vài nghìn lá, mỗi lá một lần `pickVisits`.

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S34 assign adjacent zones to trip days"`

### Task 6: Mẫu gần nhất và thay điểm không hợp

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/templates.ts`, `templates.test.ts`
- Modify: `apps/api/src/testing/planner-fixtures.ts` (thêm `fakeTemplate(id: string, tags: TripInterest[], days: string[][], w?: TripWith): PlanTemplate`, mọi điểm `kind: 'visit'`; Task 7 dùng lại)

**Interfaces:**
- Consumes: `PlanContext`, `PlanTemplate`, `DayPick`, `pickVisits`, `byScore`, `MIN_VISITS_PER_DAY` (Task 4–5).
- Produces:
  - `WITH_MATCH_BONUS = 0.25`; `nearestTemplate(templates: readonly PlanTemplate[], request: Pick<ItineraryRequest, 'days' | 'tags' | 'with'>): PlanTemplate | undefined` (quyết định 6).
  - `planFromTemplate(template: PlanTemplate, ctx: PlanContext): { ok: true; days: DayPick[] } | { ok: false }` — mỗi ngày `i`: điểm `visit` của mẫu có trong `ctx.places`; cụm của ngày = các `zoneId` của chúng theo thứ tự xuất hiện; `kept` = điểm có trong `ctx.days[i].scored` và chưa dùng; `fixed` = `kept` có `match > 0` (hoặc tất cả khi khách không có tiêu chí); `ranked = [...fixed sắp byScore, ...(kept còn lại ∪ visits trong cụm của ngày, chưa nằm trong kept) sắp byScore]`; `picks = pickVisits(ranked, target, used)`; dưới `MIN_VISITS_PER_DAY` → `{ ok: false }`. `zoneIds` = cụm của `picks` theo thứ tự cụm của ngày.

- [ ] **Step 1: Viết test đỏ**

```ts
it('nearestTemplate: cùng số ngày, Jaccard cộng 0,25 khi cùng with, hai tập rỗng = 1, hoà lấy id nhỏ', () => {
  const r = fakeRequest({ tags: ['chill_cafe', 'photo_spots'], with: 'couple' });
  const t = [fakeTemplate('b1', ['chill_cafe'], [[]], 'couple'), fakeTemplate('b2', ['chill_cafe', 'photo_spots'], [[]]), fakeTemplate('b3', ['chill_cafe', 'photo_spots'], [[], []])];
  expect(nearestTemplate(t, r)?.id).toBe('b2');
  expect(nearestTemplate([fakeTemplate('c2', [], [[]]), fakeTemplate('c1', [], [[]]), fakeTemplate('c0', ['chill_cafe'], [[]])], fakeRequest())?.id).toBe('c1');
  expect(nearestTemplate(t, fakeRequest({ days: 4 }))).toBeUndefined();
});
it('giữ điểm hợp của mẫu, thay điểm nghi ngờ bằng điểm cùng cụm', () => {
  const places = [...placesIn(0, 4, 1), ...placesIn(0, 1, 9)].map((p) => (p.name === 'Điểm Giả Lập 3' ? { ...p, status: 'suspected' as const } : p));
  const r = planFromTemplate(fakeTemplate('t', [], [[1, 2, 3, 4].map((n) => fakePlace(n).id)]), prepare(planInput({ places })));
  expect(r.ok && r.days[0]?.picks.map((p) => p.place.name).sort()).toEqual(['Điểm Giả Lập 1', 'Điểm Giả Lập 2', 'Điểm Giả Lập 4', 'Điểm Giả Lập 9']);
});
it('điểm không hợp gu nhường cho điểm hợp gu cùng cụm; điểm hợp gu của mẫu giữ dù điểm mới phổ biến hơn', () => {
  const pool = fakePlace(9, { tags: ['chill'] });
  const loose = planFromTemplate(fakeTemplate('t', ['chill_cafe'], [[1, 2, 3, 4].map((n) => fakePlace(n).id)]), prepare(planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [...placesIn(0, 4, 1), pool] })));
  expect(loose.ok && loose.days[0]?.picks.map((p) => p.place.id)).toContain(pool.id);
  const fitting = placesIn(0, 4, 1, { tags: ['chill'] });
  const kept = planFromTemplate(fakeTemplate('t', ['chill_cafe'], [fitting.map((p) => p.id)]), prepare(planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [...fitting, pool], popularity: new Map([[pool.id, 100]]) })));
  expect(kept.ok && kept.days[0]?.picks.map((p) => p.place.id).sort()).toEqual(fitting.map((p) => p.id).sort());
});
it('bỏ điểm meal, điểm đã xoá khỏi snapshot, điểm lặp ở ngày sau', () => { /* mẫu 2 ngày: ngày 1 [p1..p4, meal p5, id lạ], ngày 2 [p1, p6..p8] cùng cụm 0 → ngày 1 không có p5/id lạ, ngày 2 không có p1, cả hai ok */ });
it('theo nhịp độ: thong thả cắt còn 4, dày bù tới 6 từ cụm của ngày', () => { /* mẫu 6 điểm + relaxed → 4 picks; mẫu 4 điểm + packed, cụm có thêm 2 điểm → 6 picks */ });
it('ngày của mẫu dưới 3 điểm thì thất bại', () => { /* mọi điểm của mẫu closed, cụm không còn ứng viên → { ok: false } */ });
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/templates`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces.

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S34 adapt nearest itinerary template"`

### Task 7: `planItinerary`, thiếu điểm và gợi ý

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/plan-itinerary.ts`, `plan-itinerary.test.ts`

**Interfaces:**
- Consumes: Task 2–6.
- Produces (S35–S37 dùng):

```ts
export interface PlannedVisit { placeId: string; zoneId: string; score: number; pin?: 'first' | 'last' }
export interface PlannedDay { day: number; date: string; weekday: number; rainy: boolean; pace: ItineraryPace; zoneIds: string[]; visits: PlannedVisit[] }
export type PlanResult =
  | { ok: true; templateId?: string; days: PlannedDay[] }
  | { ok: false; code: 'NOT_ENOUGH_PLACES'; details: NotEnoughPlacesDetails };
export function planItinerary(input: PlanInput): PlanResult;
```

`visits` theo thứ tự chọn (điểm số giảm dần); S35 sắp tuyến. Trình tự: `prepare` → mẫu gần nhất → `planFromTemplate` → không được thì `planFromScratch`. Thất bại thì gợi ý theo quyết định 11, mỗi gợi ý kiểm bằng một lần chạy nội bộ không tính gợi ý (không đệ quy); `shortages` lấy từ lần tạo từ đầu.

- [ ] **Step 1: Viết test đỏ**

```ts
it('dùng mẫu gần nhất, trả templateId và dạng ngày cho S35', () => {
  const places = placesIn(0, 4, 1, { bestTime: ['evening'] }).map((p, i) => (i === 0 ? p : { ...p, bestTime: [] }));
  const r = planItinerary(planInput({ places, templates: [fakeTemplate('tpl-gia-lap', [], [places.map((p) => p.id)])] }));
  expect(r).toMatchObject({ ok: true, templateId: 'tpl-gia-lap', days: [{ day: 1, date: '2026-11-23', weekday: 1, rainy: false, pace: 'relaxed', zoneIds: [ZONES[0]!.id] }] });
  expect(r.ok && r.days[0]?.visits.filter((v) => v.pin === 'last')).toHaveLength(1);
});
it('mẫu không đủ điểm thì tạo từ đầu, không có templateId', () => { /* mẫu trỏ điểm closed, cụm 1 có 4 điểm → ok, templateId undefined */ });
it('cùng đầu vào cho cùng kết quả, kể cả thứ tự places/templates khác', () => {
  const input = planInput({ request: fakeRequest({ days: 3, tags: ['chill_cafe'] }), places: [0, 1, 2, 3].flatMap((z) => placesIn(z, 6, z * 10)) });
  expect(planItinerary({ ...input, places: [...input.places].reverse() })).toEqual(planItinerary(input));
});
it('bất biến trên dữ liệu giả ngẫu nhiên có hạt cố định', () => {
  // LCG hạt 34 sinh 120 điểm giả (status, xác minh, giờ, transport, danh mục, thẻ, cụm ngẫu nhiên);
  // mọi days 1–5 × 7 ngày khởi hành × 2 nhịp: khi ok thì mỗi visit isEligible cho ngày của nó, không lặp điểm,
  // cụm ngày 1–4 không lặp, ngày có 2 cụm thì hai cụm kề nhau, mỗi ngày 3..target điểm, tối đa một pin mỗi loại;
  // khi không ok thì NotEnoughPlacesDetails.parse(details) không ném.
});
it('NOT_ENOUGH_PLACES gợi ý số ngày lớn nhất còn tạo được', () => {
  const r = planItinerary(planInput({ request: fakeRequest({ days: 4, tags: ['chill_cafe'] }), places: [0, 1, 2].flatMap((z) => placesIn(z, 4, z * 10)) }));
  expect(r).toMatchObject({ ok: false, code: 'NOT_ENOUGH_PLACES', details: { suggestions: [{ kind: 'reduce_days', days: 3 }] } });
});
it('gợi ý bỏ gu chỉ khi bỏ gu đổi được mẫu và tạo được', () => {
  // Chỉ cụm 0 có 8 điểm (tạo từ đầu 2 ngày thất bại). Mẫu 'a' tags [] dùng cụm 0 cả hai ngày (4 + 4 điểm).
  // Mẫu 'b' tags ['chill_cafe'] trỏ 4 điểm closed ở cụm 1 (cụm 1 không có ứng viên). Khách tags ['chill_cafe'], days 2 → mẫu b → thất bại.
  // Expected: details.suggestions = [{ kind: 'reduce_days', days: 1 }, { kind: 'drop_interests' }].
});
it('không có điểm nào: shortages có, không gợi ý', () => {
  expect(planItinerary(planInput({ places: [] }))).toEqual({ ok: false, code: 'NOT_ENOUGH_PLACES', details: { shortages: [{ day: 1, zoneSlugs: [ZONES[0]!.slug], available: 0 }], suggestions: [] } });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/plan-itinerary`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces; `NotEnoughPlacesDetails.parse` kết quả lỗi trước khi trả.

- [ ] **Step 4: Chạy lại toàn bộ test planner** — `pnpm --filter @ranhduong/api test -- planner`, Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S34 plan itinerary days with not-enough-places suggestions"`

### Task 8: Tài liệu, kiểm tra toàn repo và review

**Files:**
- Create: `docs/runbooks/itinerary-place-selection.md`
- Modify: `docs/technical-design.md` mục 7 (bước 2–6, 12: ghi giá trị khởi đầu của "Quyết định trong plan"), `docs/backlog-slice-2.md` (trạng thái S34), `CLAUDE.md` (Trạng thái)

- [ ] **Step 1: Viết runbook**: planner làm gì và không làm gì (không sắp tuyến/giờ/bữa: S35; không đọc DB: S36/S37), đầu vào/đầu ra `planItinerary`, hằng số, cách S37 nạp `itineraryZones`/mùa/mẫu published/độ phổ biến, yêu cầu dữ liệu (chạy lại `pnpm seed` để ghi `adjacentZones` vào DB đang có; chợ cần `shop` hoặc thẻ `dac-san` để vào ngày 5; `transport` rỗng = cả hai), độ phức tạp, lệnh test.
- [ ] **Step 2: Cập nhật technical-design mục 7, backlog, CLAUDE.md** — chỉ ghi đúng những gì đã kiểm ở local; staging, điện thoại thật, CI remote ghi là chưa kiểm.
- [ ] **Step 3: Kiểm toàn repo**

Run: `pnpm infra:up; pnpm turbo run lint typecheck test build`
Expected: mọi task xanh (20 task như các story trước).

- [ ] **Step 4: Review độc lập** theo `superpowers:requesting-code-review` trên diff nhánh; sửa lỗi có căn cứ, chạy lại Step 3.
- [ ] **Step 5: Commit** — `git commit -m "docs: S34 record place selection runbook and status"`
