# S35 Itinerary Route and Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hàm thuần `generateItinerary` nhận kết quả chọn điểm của S34, sắp tuyến từng ngày (nearest neighbor + 2-opt, ghim bình minh/buổi tối), xếp giờ bằng hàm chung tách từ `analyzeTemplate`, sửa sai giờ mở cửa, chèn bữa ăn, gợi ý điểm tiện đường, giữ ngày kết thúc trước 21:30; p95 dưới 500 ms với 200 địa điểm giả.

**Architecture:** Contracts có hàm xếp giờ chung `scheduleDay` (S15 `analyzeTemplate` chuyển sang dùng, hành vi không đổi; S35 và sau này S40 dùng thêm tuỳ chọn chờ). Thuật toán thêm vào `apps/api/src/modules/itineraries/planner/`: `route.ts` (tuyến), `timing.ts` (giờ và sửa sai giờ), `meals.ts`, `detours.ts`, `build-day.ts` (một ngày), `generate-itinerary.ts` (cả chuyến, thiếu điểm, gợi ý). Mọi file là hàm thuần như S34; S36/S37 gọi `generateItinerary`.

**Tech Stack:** TypeScript strict, Zod 4, Vitest; `@ranhduong/geo` cho khoảng cách; không thêm dependency.

**Spec:** `docs/backlog-slice-2.md` S35 (dòng 98), mục 2 quyết định 1, 9, 10, 12, 13; `docs/technical-design.md` mục 3 (`Itinerary.days`), mục 7 (mô hình thời gian, bước 7–10, 12); `docs/product-spec.md` mục 8 (thuật toán 3–7); runbook `docs/runbooks/itinerary-place-selection.md`; ADR 0007, 0014.

## Global Constraints

- Nhánh `feat/S35-itinerary-route-schedule` tạo từ `main`; commit `feat: S35 …`/`refactor: S35 …`/`docs: S35 …`.
- TDD bắt buộc: viết test, chạy thấy đỏ, rồi mới viết code. Không `any`, không `@ts-ignore`, không thêm thư viện, không tự nâng TypeScript.
- Dữ liệu test chỉ là dữ liệu giả "Giả Lập" (fixture `apps/api/src/testing/planner-fixtures.ts`, toạ độ quanh `[0.1, 0.1]`).
- Hàm thuần: không `Date.now()`, `Math.random()`, DB, Redis, env; cùng đầu vào cho cùng kết quả. So số thực bằng `EPS = 1e-9` (từ `scoring.ts`).
- Mô hình thời gian (technical-design mục 7): ngày bắt đầu `07:00`, `04:45` khi điểm đầu là điểm ghim bình minh; kết thúc không sau `21:30` (1290 phút); thời gian xếp giờ mỗi chặng = chim bay × 1,4 ÷ 25 km/h làm tròn 5 phút (`estimateTemplateTravelMinutes`) + đệm 10 phút; thời lượng ghé thiếu thì 60 phút; khung bữa ăn đọc `MEAL_WINDOWS` (trưa `[690, 810)`, tối `[1080, 1200)`); tiện đường khi detour dưới 10 phút.
- `analyzeTemplate` (S15) giữ nguyên hành vi: không sửa test cũ trong `itinerary-schedule.test.ts`, test đó phải xanh sau khi tách hàm.
- Nơi ở (`request.stayLocation`) chỉ dùng để sắp tuyến, không xuất hiện trong kết quả (ADR 0014).
- Không mở endpoint, không đổi DTO công khai; không gắn `key`/`isVip`/`note` (S37 làm khi lưu).

## Quyết định trong plan (chủ dự án xác nhận khi duyệt plan)

Tài liệu chưa chốt các điểm dưới; plan chọn giá trị khởi đầu, Task 8 ghi vào technical-design mục 7:

1. **Mức giá bữa ăn (chủ dự án chọn 20/10/2026):** không thêm ô ngân sách. Mức trần của ngày = mức giá cao nhất trong các điểm tham quan của ngày, điểm thiếu `priceLevel` tính là 2. Quán có `priceLevel` không quá mức trần hoặc chưa có `priceLevel` là "đúng mức giá". Đây chỉ là thứ tự ưu tiên sau thời gian thêm vào tuyến, không loại quán. `ItineraryPlace` thêm `priceLevel`.
2. **Hai cách đo thời gian:** xếp giờ dùng phút làm tròn 5 + đệm 10 (`legMinutes`); sắp tuyến, so detour và gợi ý tiện đường dùng phút chưa làm tròn (`estimateTravelMinutesExact`), vì làm tròn 5 phút làm 2-opt và detour gần như luôn hoà.
3. **Tuyến:** có nơi ở thì tuyến khép kín nơi ở → … → nơi ở (product-spec mục 8: xuất phát và kết thúc ở nơi lưu trú); không có nơi ở thì tuyến mở, nearest neighbor bắt đầu từ điểm đầu danh sách của S34 (điểm số cao nhất), 2-opt được đổi cả đầu và cuối tuyến. Điểm ghim đầu/cuối không di chuyển; có ghim đầu thì nearest neighbor bắt đầu từ điểm ghim. 2-opt cải thiện đầu tiên, `i` rồi `j` tăng dần, chỉ nhận khi giảm hơn `EPS`; nearest neighbor hoà (trong `EPS`) thì lấy điểm đứng trước trong danh sách.
4. **Chờ mở cửa:** điểm ghé chờ quán mở tối đa 30 phút (`OPEN_WAIT_MAX_MIN`); trước 07:00 chờ bao lâu cũng được (ngày có bình minh, quán mở 07:00); điểm ghim cuối (chợ đêm) chờ không giới hạn; bữa ăn chờ tới đầu khung giờ ăn. S15 không chờ.
5. **Sửa sai giờ:** điểm sai giờ đầu tiên thử đổi với điểm kề trước rồi điểm kề sau (không đổi điểm ghim), nhận khi số điểm sai giờ giảm; không được thì bỏ điểm điểm số thấp nhất trong các điểm đang sai giờ (kể cả điểm ghim; bỏ điểm bình minh thì ngày bắt đầu lại 07:00); hoà điểm số thì bỏ điểm đứng sau theo `byScore`.
6. **Bữa ăn:** chỉ chèn khi các điểm tham quan của ngày đi qua khung giờ ăn (cùng quy tắc nhắc thiếu bữa của S15). Ứng viên: quán `servesCategory(p, 'food')` hợp lệ trong ngày (S34 `DayPool.scored`), chưa có trong chuyến, mở suốt bữa, giờ bắt đầu bữa nằm trong khung. Vị trí: sau bất kỳ điểm nào, trừ sau điểm ghim cuối. Xếp hạng: `round5(detour + phút chờ)` tăng dần, đúng mức giá trước, điểm số giảm dần, id, vị trí. Thời lượng bữa = `visitDurationMin` của quán, thiếu thì 60. Không có cách chèn hợp lệ thì ngày vẫn tạo, kèm `missing_lunch`/`missing_dinner` (S36 tính là lỗi độ phủ).
7. **21:30:** sau khi chèn bữa, ngày kết thúc sau 21:30 thì bỏ điểm tham quan điểm số thấp nhất rồi sửa giờ và chèn bữa lại. Ngày còn dưới 3 điểm tham quan thì trả `NOT_ENOUGH_PLACES`.
8. **Ngày mưa:** so tuyến 2-opt với tuyến đảo phần không ghim; chọn tuyến đảo khi tổng phút di chuyển không tăng (trong `EPS`) và số phút ở điểm có mái che trong 13:00–17:00 (che hết ×2, một phần ×1) lớn hơn.
9. **Tiện đường:** mỗi cặp điểm liên tiếp tối đa một gợi ý (detour nhỏ nhất, hoà thì theo `byScore`), lấy từ điểm tham quan hợp lệ của ngày (`DayPool.visits`), chưa có trong chuyến, chưa gợi ý ở chỗ khác, mở suốt thời lượng ghé nếu ghé ngay sau điểm trước; `detourMin = Math.max(0, Math.round(detour))` (sai số dấu phẩy động có thể cho `-0`).
10. **Kết quả theo vị trí:** `detours[].afterIndex` là chỉ số điểm dừng; S37 sinh `key` và đổi thành `afterKey`.
11. **Gợi ý khi thiếu điểm** chạy thử trên toàn bộ S34 + S35, không chỉ bước chọn điểm.
12. **Ngày theo mẫu** cũng sắp tuyến lại bằng nearest neighbor + 2-opt (backlog không yêu cầu giữ thứ tự của mẫu).

## Tiêu chí nghiệm thu → bước kiểm

| Tiêu chí S35 | Kiểm ở |
| --- | --- |
| Nearest neighbor từ nơi ở, không có nơi ở thì tuyến mở từ điểm đầu, rồi 2-opt | Task 2 Step 2; Task 7 Step 1 (nơi ở đổi điểm đầu) |
| Điểm `sunrise` đầu ngày lúc 04:45, điểm `evening` cuối ngày | Task 2 Step 2 (ghim); Task 3 Step 1; Task 6 Step 1; Task 7 bất biến |
| Xếp giờ bằng hàm chung tách từ `analyzeTemplate` | Task 1 (test S15 cũ xanh + test `scheduleDay`) |
| Sai giờ thì đổi điểm kề, vẫn sai thì bỏ điểm điểm số thấp nhất | Task 3 Step 1 |
| Chèn bữa trong `MEAL_WINDOWS`, quán ăn uống detour nhỏ nhất, đúng mức giá | Task 4 Step 1; Task 7 bất biến |
| Tiện đường khi detour dưới 10 phút | Task 5 Step 1; Task 7 bất biến |
| Ngày kết thúc trước 21:30 | Task 6 Step 1; Task 7 bất biến |
| 200 địa điểm giả, p95 dưới 500 ms | Task 7 Step 1 (test đo), số đo ghi ở runbook (Task 8) |
| DoD lát 2: không có toạ độ nơi ở trong kết quả | Task 7 Step 1 |

## Review Focus

- Chợ đêm hoặc quán mở qua nửa đêm (17:00–02:00) làm điểm ghim cuối: phải chờ tới 17:00 và tính là trong giờ, không bị bỏ (Task 3).
- Hai điểm cùng toạ độ (quán trong chợ, quầy trong khu du lịch): 2-opt không lặp vô hạn, kết quả ổn định (Task 2).
- Quán ăn chia ca (10:00–14:00, 17:00–21:00) được chọn trong ca; quán chỉ mở chiều không bị xếp vào bữa trưa (Task 4).
- Chỗ vừa là cà phê vừa ăn uống đã là điểm ghé thì không thành bữa ăn; quán đã ăn ở ngày trước không lặp lại (Task 4, Task 7 bất biến).
- Khách cho nơi ở: tuyến đổi theo nơi ở nhưng toạ độ không có trong kết quả (Task 7).

---

### Task 1: Hàm xếp giờ chung tách từ `analyzeTemplate`

**Files:**
- Modify: `packages/contracts/src/itinerary-schedule.ts`
- Create: `packages/contracts/src/schedule-day.test.ts`
- Không sửa: `packages/contracts/src/itinerary-schedule.test.ts` (test S15 là bằng chứng hành vi không đổi)

**Interfaces:**
- Produces (export từ `itinerary-schedule.ts`):
  - `clockMinutes(time: string): number` và `formatClock(minutes: number): string` (đổi tên hàm nội bộ `minutes`/`formatTime` hiện có).
  - `DAY_END_MIN = 1290`; `type MealKind = (typeof MEAL_WINDOWS)[number]['kind']`.
  - `coversVisit(place: Pick<TemplatePlace, 'openingHours'>, weekday: number, start: number, end: number): boolean` (hàm hiện có, chỉ export).
  - `interface ScheduleStop { placeId: string; kind: StopKind; durationMin?: number; manualStart?: string; manualEnd?: string; notBefore?: number; maxWaitMin?: number }` — `notBefore`: phút từ 00:00, không bắt đầu trước giờ này; `maxWaitMin`: chờ quán mở tối đa bấy nhiêu phút, mặc định 0.
  - `interface ScheduledTimes { arrival: number; start: number; end: number; travelMinFromPrev: number; withinHours: boolean }` (`withinHours` false khi thiếu địa điểm).
  - `interface DaySchedule { stops: ScheduledTimes[]; missingMeals: MealKind[]; lateFinish: boolean }`.
  - `scheduleDay(stops: readonly ScheduleStop[], options: { startTime: string; weekday: number; places: ReadonlyMap<string, TemplatePlace>; travel: (from: GeoPoint, to: GeoPoint) => number; freeWaitUntil?: number }): DaySchedule`.
- Quy tắc chờ (stop không có `manualStart`): `base = max(arrival, notBefore ?? arrival)`; nếu quán không mở suốt `[base, base + thời lượng)` thì tìm giờ mở `o` nhỏ nhất của các ca đúng thứ (`open !== close`) với `o > base` và (`o ≤ base + maxWaitMin` hoặc `o ≤ freeWaitUntil`) mà `coversVisit(o, o + thời lượng)`; có thì `start = o`, không có thì `start = base`. `missingMeals`, `lateFinish` theo đúng quy tắc nhắc thiếu bữa/kết thúc muộn hiện có của `analyzeTemplate`.

- [ ] **Step 1: Tạo nhánh** — `git switch -c feat/S35-itinerary-route-schedule`

- [ ] **Step 2: Viết test đỏ** (`schedule-day.test.ts`; dùng lại cách dựng `place()` của `itinerary-schedule.test.ts`, `travel = () => 10`, `weekday: 6`, `startTime: '07:00'`)

```ts
it('bữa ăn chờ tới notBefore, giữ giờ đến', () => {
  const t = run([stop(A), { ...stop(B), kind: 'meal', notBefore: 690 }]);
  expect(t.stops.map((s) => [s.arrival, s.start, s.end, s.travelMinFromPrev])).toEqual([[420, 420, 480, 0], [490, 690, 750, 10]]);
});
it('chờ quán mở trong maxWaitMin, quá thì không chờ và sai giờ', () => {
  expect(run([{ ...stop(A), maxWaitMin: 30 }], hoursFrom('07:30')).stops[0]).toMatchObject({ start: 450, withinHours: true });
  expect(run([{ ...stop(A), maxWaitMin: 30 }], hoursFrom('07:45')).stops[0]).toMatchObject({ start: 420, withinHours: false });
  expect(run([stop(A)], hoursFrom('07:30')).stops[0]).toMatchObject({ start: 420, withinHours: false });
});
it('chờ tới ca sau phủ hết thời lượng ghé', () => {
  const split = [{ day: 6, open: '07:00', close: '07:20' }, { day: 6, open: '08:00', close: '12:00' }];
  expect(run([{ ...stop(A), maxWaitMin: 60 }], split).stops[0]?.start).toBe(480);
});
it('trước freeWaitUntil chờ bao lâu cũng được', () => {
  const opts = { startTime: '04:45', freeWaitUntil: 420 };
  // A mở 04:00–22:00, B mở 07:00–22:00; cả hai maxWaitMin 30
  expect(run([{ ...stop(A), maxWaitMin: 30 }, { ...stop(B), maxWaitMin: 30 }], perPlace, opts).stops[1]).toMatchObject({ arrival: 355, start: 420, withinHours: true });
  expect(run([{ ...stop(A), maxWaitMin: 30 }, { ...stop(B), maxWaitMin: 30 }], perPlace, { startTime: '04:45' }).stops[1]).toMatchObject({ start: 355, withinHours: false });
});
it('giờ sửa tay không bị chờ', () => expect(run([{ ...stop(A), manualStart: '07:00', maxWaitMin: 60 }], hoursFrom('07:30')).stops[0]?.start).toBe(420));
it('báo thiếu bữa và kết thúc sau 21:30', () => {
  expect(run([{ ...stop(A), manualStart: '11:00', manualEnd: '20:00' }])).toMatchObject({ missingMeals: ['lunch', 'dinner'], lateFinish: false });
  expect(run([{ ...stop(A), manualStart: '20:30', manualEnd: '21:35' }]).lateFinish).toBe(true);
});
it('địa điểm thiếu thì không trong giờ và chặng sau không tính di chuyển', () => {
  expect(run([stop(MISSING), stop(A)]).stops.map((s) => [s.withinHours, s.travelMinFromPrev])).toEqual([[false, 0], [true, 0]]);
});
it('clockMinutes/formatClock', () => expect([clockMinutes('04:45'), formatClock(1290)]).toEqual([285, '21:30']));
```

(Helper trong file test: `A`, `B`, `MISSING` là ba ObjectId giả, `MISSING` không có trong map; `stop(id)` = `{ placeId: id, kind: 'visit' }`; `run(stops, hours: Record<string, OpeningSlot[]> = {}, opts = {})` dựng map địa điểm `A`, `B` mở cả ngày như `place()` của test S15 rồi ghi đè giờ theo `hours`, gọi `scheduleDay` với mặc định `startTime '07:00'`, `weekday 6`, `travel () => 10` và `opts`; `hoursFrom(open)` = `{ [A]: [{ day: 6, open, close: '22:00' }] }`; `split` truyền dạng `{ [A]: split }`; `perPlace` = `{ [A]: ca 04:00–22:00, [B]: ca 07:00–22:00 }`.)

- [ ] **Step 3: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/contracts test -- schedule-day`, Expected: FAIL (`scheduleDay` chưa export).

- [ ] **Step 4: Triển khai** `scheduleDay` theo Interfaces và cho `analyzeTemplate` dùng nó: `analyzeTemplate` chỉ còn dựng issue từ `ScheduledTimes` (`overlap` khi `start < arrival`, `invalid_time`, `outside_hours` khi có địa điểm và `!withinHours`, các issue trạng thái/ảnh/xác minh như cũ, `missing_*` từ `missingMeals`, `late_finish` từ `lateFinish`), thông điệp giữ nguyên.

- [ ] **Step 5: Chạy lại test** — `pnpm --filter @ranhduong/contracts test`, Expected: PASS, gồm cả `itinerary-schedule.test.ts` không sửa; `pnpm --filter @ranhduong/contracts typecheck` và `lint` xanh.

- [ ] **Step 6: Commit** — `git commit -m "refactor: S35 extract shared day scheduler from analyzeTemplate"`

### Task 2: Sắp tuyến nearest neighbor + 2-opt

**Files:**
- Modify: `packages/geo/src/distance.ts`, `packages/geo/src/distance.test.ts`
- Create: `apps/api/src/modules/itineraries/planner/route.ts`, `route.test.ts`

**Interfaces:**
- Produces:
  - geo: `estimateTravelMinutesExact(a: LatLng, b: LatLng): number` — chim bay × 1,4 ÷ 25 km/h, chưa làm tròn; `estimateTravelMinutes` và `estimateTemplateTravelMinutes` dùng lại hàm này, kết quả không đổi.
  - `interface RouteStop { location: GeoPoint; pin?: 'first' | 'last' }`; `type RouteCost = (a: GeoPoint, b: GeoPoint) => number`.
  - `exactTravel: RouteCost` (bọc `estimateTravelMinutesExact`, đổi `[lng, lat]`).
  - `routeCost(order: readonly RouteStop[], cost: RouteCost, stay?: GeoPoint): number` — tổng các chặng; có nơi ở thì cộng nơi ở → điểm đầu và điểm cuối → nơi ở.
  - `routeDay<T extends RouteStop>(stops: readonly T[], cost: RouteCost, stay?: GeoPoint): T[]` — quyết định 3; tối đa một ghim mỗi loại (S34 bảo đảm).
  - `reversedMiddle<T extends RouteStop>(order: readonly T[]): T[]` — đảo các điểm không ghim, giữ ghim đầu/cuối.

- [ ] **Step 1: Viết test đỏ** (`at(x, y = 0)` = `{ type: 'Point', coordinates: [0.1 + x / 100, 0.1 + y / 100] }`; `s(id, x, pin?)`; `ids(route)`)

```ts
it('estimateTravelMinutesExact chưa làm tròn', () => expect(estimateTravelMinutesExact({ lat: 0, lng: 0 }, { lat: 0, lng: 0.02 })).toBeCloseTo(7.47, 2));
it('NN từ nơi ở rồi 2-opt', () => expect(ids(routeDay([s('c', 3), s('a', 1), s('d', 4), s('b', 2)], exactTravel, at(0)))).toEqual(['a', 'b', 'c', 'd']));
it('không có nơi ở: tuyến mở từ điểm đầu danh sách, 2-opt được đổi đầu tuyến', () => {
  expect(ids(routeDay([s('b', 2), s('a', 1.4), s('c', 3), s('d', 4)], exactTravel))).toEqual(['a', 'b', 'c', 'd']);
});
it('ghim đầu, ghim cuối giữ chỗ; NN bắt đầu từ ghim đầu', () => {
  expect(ids(routeDay([s('m1', 1), s('s', 5, 'first'), s('m2', 2), s('e', 0, 'last')], exactTravel, at(0)))).toEqual(['s', 'm2', 'm1', 'e']);
});
it('nơi ở: tính cả chặng về', () => expect(routeCost([s('a', 1)], exactTravel, at(0))).toBeCloseTo(2 * exactTravel(at(0), at(1))));
it('điểm trùng toạ độ: dừng, giữ thứ tự', () => {
  const same = [s('a', 1), s('b', 1), s('c', 1)];
  expect(ids(routeDay(same, exactTravel))).toEqual(['a', 'b', 'c']);
});
it('reversedMiddle giữ ghim', () => {
  expect(ids(reversedMiddle([s('s', 0, 'first'), s('a', 1), s('b', 2), s('e', 3, 'last')]))).toEqual(['s', 'b', 'a', 'e']);
  expect(ids(reversedMiddle([s('a', 1), s('b', 2), s('c', 3)]))).toEqual(['c', 'b', 'a']);
});
it('bất biến: hoán vị đầu vào, ghim đúng chỗ, không còn phép đảo nào giảm chi phí', () => {
  // LCG hạt 35, 200 lần: 2–6 điểm toạ độ ngẫu nhiên trong [0, 5)², ngẫu nhiên có ghim đầu/cuối, có hoặc không nơi ở.
  // Kiểm: cùng tập id; ghim 'first' ở đầu, 'last' ở cuối; với mọi i < j trong phần không ghim,
  // routeCost(đảo đoạn i..j) >= routeCost(kết quả) - EPS.
});
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/geo test -- distance` và `pnpm --filter @ranhduong/api test -- planner/route`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces và quyết định 3 (2-opt thử mọi đoạn của phần không ghim, tính bằng `routeCost` với điểm neo là ghim/nơi ở).

- [ ] **Step 4: Chạy lại test** — cùng lệnh Step 2 (build geo trước: `pnpm --filter @ranhduong/geo build`), Expected: PASS, test geo cũ xanh.

- [ ] **Step 5: Commit** — `git commit -m "feat: S35 order day stops with nearest neighbor and 2-opt"`

### Task 3: Giờ trong ngày và sửa sai giờ mở cửa

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/timing.ts`, `timing.test.ts`
- Modify: `apps/api/src/testing/planner-fixtures.ts` (thêm `allDays(open: string, close: string): OpeningSlot[]` — một ca cho mỗi thứ 0–6; Task 4–7 dùng lại)

**Interfaces:**
- Consumes: `scheduleDay`, `clockMinutes`, `DaySchedule` (Task 1); `RouteStop` (Task 2); `ScoredPlace`, `pinOf`, `byScore` (S34).
- Produces:
  - `DAY_START = '07:00'`, `SUNRISE_START = '04:45'`, `TRAVEL_BUFFER_MIN = 10`, `OPEN_WAIT_MAX_MIN = 30`.
  - `interface DayStop extends RouteStop { place: ItineraryPlace; kind: StopKind; score: number; notBefore?: number }`.
  - `toDayStop(scored: ScoredPlace, kind: StopKind): DayStop | undefined` — `undefined` khi thiếu toạ độ; `pin = pinOf(place)` chỉ với `visit`.
  - `legMinutes(a: GeoPoint, b: GeoPoint): number` = `estimateTemplateTravelMinutes` + `TRAVEL_BUFFER_MIN`.
  - `dayStartTime(stops: readonly DayStop[]): string` — `SUNRISE_START` khi `stops[0]?.pin === 'first'`, còn lại `DAY_START`.
  - `timeStops(stops: readonly DayStop[], weekday: number): DaySchedule` — gọi `scheduleDay` với `startTime = dayStartTime`, `travel = legMinutes`, `freeWaitUntil = clockMinutes(DAY_START)`, mỗi stop `maxWaitMin` = 1440 nếu ghim `'last'`, còn lại `OPEN_WAIT_MAX_MIN`, `notBefore` lấy từ stop.
  - `repairHours(stops: readonly DayStop[], weekday: number): DayStop[]` — quyết định 5.

- [ ] **Step 1: Viết test đỏ** (`v(n, overrides?, score = 0)` = `toDayStop({ place: fakePlace(n, overrides), score, match: 0 }, 'visit')!`; weekday 1 vì `fakeRequest` bắt đầu Thứ Hai)

```ts
it('legMinutes làm tròn 5 phút rồi cộng đệm 10', () => {
  expect(legMinutes(fakePlace(1).location!, fakePlace(2).location!)).toBe(10);
  expect(legMinutes({ type: 'Point', coordinates: [0.1, 0.1] }, { type: 'Point', coordinates: [0.12, 0.1] })).toBe(15);
});
it('ngày thường từ 07:00, ngày có ghim bình minh từ 04:45', () => {
  expect(timeStops([1, 2, 3, 4].map((n) => v(n)), 1).stops.map((s) => formatClock(s.start))).toEqual(['07:00', '08:10', '09:20', '10:30']);
  const sunrise = v(5, { bestTime: ['sunrise'], openingHours: allDays('04:00', '22:00') });
  expect(dayStartTime([sunrise, v(1)])).toBe('04:45');
  expect(timeStops([sunrise, v(1)], 1).stops.map((s) => s.start)).toEqual([285, 420]); // chờ quán mở 07:00
});
it('điểm ghim cuối chờ tới giờ mở, kể cả ca qua nửa đêm', () => {
  const night = v(6, { bestTime: ['evening'], openingHours: allDays('17:00', '02:00') });
  expect(timeStops([v(1), night], 1).stops[1]).toMatchObject({ start: 1020, withinHours: true });
});
it('điểm thường chờ tối đa 30 phút', () => {
  expect(timeStops([v(1, { openingHours: allDays('07:20', '22:00') })], 1).stops[0]).toMatchObject({ start: 440, withinHours: true });
  expect(timeStops([v(1, { openingHours: allDays('07:40', '22:00') })], 1).stops[0]?.withinHours).toBe(false);
});
it('sai giờ thì đổi với điểm kề', () => {
  const early = v(2, { openingHours: allDays('07:00', '08:00') });
  expect(repairHours([v(1), early], 1).map((s) => s.place.name)).toEqual(['Điểm Giả Lập 2', 'Điểm Giả Lập 1']);
});
it('đổi không hết sai thì bỏ điểm điểm số thấp nhất trong các điểm sai giờ', () => {
  const a = v(1, {}, 0.9);
  const b = v(2, { openingHours: allDays('07:00', '08:00') }, 0.5);
  const c = v(3, { openingHours: allDays('07:00', '08:00') }, 0.1);
  expect(repairHours([a, b, c], 1).map((s) => s.place.name)).toEqual(['Điểm Giả Lập 2', 'Điểm Giả Lập 1']);
});
it('không đổi chỗ điểm ghim; ghim bình minh sai giờ thì bị bỏ và ngày bắt đầu 07:00', () => {
  const lateSunrise = v(5, { bestTime: ['sunrise'], openingHours: allDays('08:00', '22:00') }, 0.9);
  const kept = repairHours([lateSunrise, v(1)], 1);
  expect(kept.map((s) => s.place.name)).toEqual(['Điểm Giả Lập 1']);
  expect(dayStartTime(kept)).toBe('07:00');
});
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/contracts build; pnpm --filter @ranhduong/api test -- planner/timing`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces.

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S35 schedule day stops and repair opening-hour conflicts"`

### Task 4: Chèn bữa ăn

**Files:**
- Modify: `packages/contracts/src/itinerary-plan.ts`, `itinerary-plan.test.ts` (`ItineraryPlace` thêm `priceLevel: z.literal([1, 2, 3, 4]).optional()`)
- Create: `apps/api/src/modules/itineraries/planner/meals.ts`, `meals.test.ts`

**Interfaces:**
- Consumes: `DayStop`, `timeStops`, `toDayStop` (Task 3); `exactTravel` (Task 2); `MEAL_WINDOWS`, `MealKind` (contracts); `ScoredPlace` (S34).
- Produces:
  - `DEFAULT_PRICE_LEVEL = 2`; `dayPriceCap(visits: readonly Pick<ItineraryPlace, 'priceLevel'>[]): number` — `max(priceLevel ?? 2)`, danh sách rỗng thì 2.
  - `insertMeals(stops: readonly DayStop[], foods: readonly ScoredPlace[], weekday: number, used: ReadonlySet<string>): { stops: DayStop[]; missing: MealKind[] }` — quyết định 6; xét khung theo thứ tự `MEAL_WINDOWS`, bữa trưa đã chèn được tính khi xét bữa tối; bữa ăn là `DayStop` `kind: 'meal'`, `notBefore = window.start`, không ghim. `detour = exact(A, X) + exact(X, B) − exact(A, B)` (không có B thì `exact(A, X)`), `phút chờ = start − arrival` của bữa.

- [ ] **Step 1: Viết test đỏ** (`day` = `placesIn(0, 4, 1, { visitDurationMin: 90 })` qua `toDayStop(…, 'visit')` → 07:00–08:30, 08:40–10:10, 10:20–11:50, 12:00–13:30; `food(n, overrides?, score = 0)`: `ScoredPlace` của `fakePlace(n, { category: 'food', ...overrides })`; `kinds(r)`; `mealOf(r)`; weekday 1)

```ts
it('itinerary-plan: ItineraryPlace nhận priceLevel 1–4, từ chối 5', () => { /* contracts */ });
it('dayPriceCap: thiếu tính là 2', () => {
  expect([dayPriceCap([]), dayPriceCap([{ priceLevel: 1 }, {}]), dayPriceCap([{ priceLevel: 1 }]), dayPriceCap([{ priceLevel: 4 }, {}])]).toEqual([2, 2, 1, 4]);
});
it('chèn bữa trưa ở chỗ thêm ít thời gian nhất; ngày không qua khung tối thì không có bữa tối', () => {
  const r = insertMeals(day, [food(5)], 1, new Set());
  expect(kinds(r)).toEqual(['visit', 'visit', 'visit', 'meal', 'visit']);
  expect(timeStops(r.stops, 1).stops[3]?.start).toBe(720);
  expect(r.missing).toEqual([]);
});
it('chọn quán đi vòng ít hơn', () => {
  expect(mealOf(insertMeals(day, [food(7, { location: { type: 'Point', coordinates: [0.2, 0.1] } }), food(5)], 1, new Set()))).toBe(fakePlace(5).id);
});
it('bằng thời gian thì quán đúng mức giá trước, rồi điểm số', () => {
  const near = fakePlace(5).location;
  const foods = [food(6, { priceLevel: 4, location: near }, 0.9), food(5, { priceLevel: 1 }, 0.1)];
  expect(mealOf(insertMeals(day, foods, 1, new Set()))).toBe(fakePlace(5).id);
  const pricey = day.map((s, i) => (i === 0 ? { ...s, place: { ...s.place, priceLevel: 4 as const } } : s));
  expect(mealOf(insertMeals(pricey, foods, 1, new Set()))).toBe(fakePlace(6).id);
});
it('quán chia ca được chọn trong ca; quán chỉ mở chiều thì thiếu bữa trưa', () => {
  const split = [0, 1, 2, 3, 4, 5, 6].flatMap((d) => [{ day: d, open: '10:00', close: '14:00' }, { day: d, open: '17:00', close: '21:00' }]);
  expect(mealOf(insertMeals(day, [food(5, { openingHours: split })], 1, new Set()))).toBe(fakePlace(5).id);
  expect(insertMeals(day, [food(5, { openingHours: allDays('15:00', '22:00') })], 1, new Set()).missing).toEqual(['lunch']);
});
it('không có quán thì báo thiếu, giữ nguyên điểm', () => {
  const r = insertMeals(day, [], 1, new Set());
  expect([r.missing, r.stops]).toEqual([['lunch'], day]);
});
it('bỏ quán đã dùng trong chuyến và chỗ ăn uống đang là điểm ghé', () => {
  const dualUse = day.map((s, i) => (i === 3 ? { ...s, place: { ...s.place, alsoCategories: ['food' as const] } } : s));
  const asFood = { place: dualUse[3]!.place, score: 1, match: 0 };
  expect(mealOf(insertMeals(dualUse, [asFood, food(5, {}, 0.9), food(8)], 1, new Set([fakePlace(5).id])))).toBe(fakePlace(8).id);
});
it('không chèn bữa sau điểm ghim cuối', () => {
  const v1 = toDayStop({ place: fakePlace(1, { visitDurationMin: 240 }), score: 0, match: 0 }, 'visit')!;
  const last = toDayStop({ place: fakePlace(2, { bestTime: ['evening'], openingHours: allDays('07:00', '12:30') }), score: 0, match: 0 }, 'visit')!;
  expect(insertMeals([v1, last], [food(5)], 1, new Set())).toEqual({ stops: [v1, last], missing: ['lunch'] });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/contracts test -- itinerary-plan` và `pnpm --filter @ranhduong/contracts build; pnpm --filter @ranhduong/api test -- planner/meals`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces.

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S35 insert meals by smallest detour and day price level"`

### Task 5: Gợi ý điểm tiện đường

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/detours.ts`, `detours.test.ts`

**Interfaces:**
- Consumes: `DayStop`, `legMinutes`, `timeStops` (Task 3); `exactTravel` (Task 2); `coversVisit`, `DaySchedule` (Task 1); `ScoredPlace` (S34).
- Produces:
  - `DETOUR_MAX_MIN = 10`; `interface DetourSuggestion { afterIndex: number; placeId: string; detourMin: number }`.
  - `suggestDetours(stops: readonly DayStop[], times: DaySchedule, pool: readonly ScoredPlace[], weekday: number, excluded: ReadonlySet<string>): DetourSuggestion[]` — quyết định 9; giờ ghé thử = `times.stops[i].end + legMinutes(A, X)`, thời lượng `visitDurationMin ?? 60`; kết quả theo `afterIndex` tăng dần.

- [ ] **Step 1: Viết test đỏ** (`pt(x, y)` = `{ type: 'Point', coordinates: [x, y] }`; `stopAt(n, location)` = `toDayStop({ place: fakePlace(n, { location }), score: 0, match: 0 }, 'visit')!`; `A = stopAt(1, pt(0.1, 0.1))`, `B = stopAt(2, pt(0.12, 0.1))`; `cand(n, location, score = 0, overrides?)` = `{ place: fakePlace(n, { location, ...overrides }), score, match: 0 }`; `t = timeStops([A, B], 1)`)

```ts
it('gợi ý điểm đi vòng ít nhất, dưới 10 phút', () => {
  const pool = [cand(10, pt(0.11, 0.105), 0.9), cand(11, pt(0.11, 0.1), 0.1)];
  expect(suggestDetours([A, B], t, pool, 1, new Set())).toEqual([{ afterIndex: 0, placeId: fakePlace(11).id, detourMin: 0 }]);
});
it('không gợi ý khi đi vòng từ 10 phút', () => expect(suggestDetours([A, B], t, [cand(12, pt(0.11, 0.13))], 1, new Set())).toEqual([]));
it('bỏ điểm đã có trong chuyến hoặc đóng cửa lúc ghé', () => {
  const near = cand(10, pt(0.11, 0.105));
  expect(suggestDetours([A, B], t, [cand(11, pt(0.11, 0.1)), near], 1, new Set([fakePlace(11).id]))[0]?.placeId).toBe(near.place.id);
  const closed = cand(11, pt(0.11, 0.1), 0, { openingHours: allDays('07:00', '07:30') });
  expect(suggestDetours([A, B], t, [closed, near], 1, new Set())[0]?.placeId).toBe(near.place.id);
});
it('mỗi điểm chỉ gợi ý một lần; một điểm dừng thì không có gợi ý', () => {
  const C = stopAt(3, pt(0.14, 0.1));
  expect(suggestDetours([A, B, C], timeStops([A, B, C], 1), [cand(13, pt(0.12, 0.1))], 1, new Set())).toEqual([{ afterIndex: 0, placeId: fakePlace(13).id, detourMin: 0 }]);
  expect(suggestDetours([A], timeStops([A], 1), [cand(13, pt(0.12, 0.1))], 1, new Set())).toEqual([]);
});
```

(Detour của `pt(0.11, 0.105)` khoảng 0,9 phút → `detourMin` 1; `pt(0.11, 0.13)` khoảng 16 phút.)

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/detours`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces.

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S35 suggest on-the-way places under 10 minutes"`

### Task 6: Dựng một ngày

**Files:**
- Create: `apps/api/src/modules/itineraries/planner/build-day.ts`, `build-day.test.ts`

**Interfaces:**
- Consumes: Task 2–4; `DayPool`, `MIN_VISITS_PER_DAY` (S34 `plan-context.ts`); `DayPick` (S34 `zones.ts`); `servesCategory`, `DAY_END_MIN` (contracts).
- Produces:
  - `RAIN_AFTERNOON = { start: 780, end: 1020 }`; `rainCoverMinutes(stops: readonly DayStop[], times: DaySchedule): number` — tổng phút giao với `RAIN_AFTERNOON` của điểm `visit`, `cover` full ×2, partial ×1.
  - `interface BuiltDay { stops: DayStop[]; times: DaySchedule; missingMeals: MealKind[] }`.
  - `buildDay(pool: DayPool, pick: DayPick, options: { stay?: GeoPoint; used: ReadonlySet<string> }): BuiltDay` — trình tự: `toDayStop` các `pick.picks` → `routeDay(…, exactTravel, stay)` → ngày mưa áp quyết định 8 → vòng lặp: `repairHours` → dừng nếu dưới `MIN_VISITS_PER_DAY` → `insertMeals` với `foods` = `pool.scored` phục vụ `food` sắp `byScore` → `timeStops`; `lateFinish` thì bỏ điểm `visit` điểm số thấp nhất (thứ tự `byScore`) rồi lặp, không thì trả.

- [ ] **Step 1: Viết test đỏ** (`dayOf(places, options?)` = `prepare(planInput({ places, ...options })).days[0]!`; `pickAll(pool)` = `{ zoneIds: [ZONES[0]!.id], picks: [...pool.visits] }`)

```ts
it('ngày thong thả: mọi điểm trong giờ, có bữa trưa trong khung, kết thúc trước 21:30', () => {
  const pool = dayOf([...placesIn(0, 4, 1, { visitDurationMin: 90 }), fakePlace(9, { category: 'food' })]);
  const d = buildDay(pool, pickAll(pool), { used: new Set() });
  const meal = d.stops.findIndex((s) => s.kind === 'meal');
  expect(d.times.stops[meal]!.start).toBeGreaterThanOrEqual(690);
  expect(d.times.stops[meal]!.start).toBeLessThan(810);
  expect(d.times.stops.every((s) => s.withinHours)).toBe(true);
  expect(d.times.lateFinish).toBe(false);
  expect(d.missingMeals).toEqual([]);
});
it('ghim bình minh đầu ngày lúc 04:45, ghim buổi tối cuối ngày sau khi chờ mở cửa', () => {
  const s = fakePlace(1, { bestTime: ['sunrise'], openingHours: allDays('04:00', '22:00') });
  const e = fakePlace(4, { bestTime: ['evening'], openingHours: allDays('17:00', '23:00') });
  const pool = dayOf([s, ...placesIn(0, 2, 2), e, fakePlace(9, { category: 'food' })]);
  const d = buildDay(pool, pickAll(pool), { used: new Set() });
  expect([d.stops[0]!.place.id, d.times.stops[0]!.start]).toEqual([s.id, 285]);
  expect(d.stops.at(-1)!.place.id).toBe(e.id);
  expect(d.times.stops.at(-1)!.start).toBeGreaterThanOrEqual(1020);
  expect(d.stops.filter((x) => x.kind === 'meal')).toHaveLength(1);
});
it('quá 21:30 thì bỏ điểm điểm số thấp nhất', () => {
  const places = placesIn(0, 5, 1, { visitDurationMin: 180, openingHours: allDays('00:00', '24:00') });
  const pool = dayOf(places);
  const pick = { zoneIds: [ZONES[0]!.id], picks: places.map((place, i) => ({ place, score: 0.5 - i / 10, match: 0 })) };
  const d = buildDay(pool, pick, { used: new Set() });
  expect(d.stops.map((x) => x.place.id)).toEqual(places.slice(0, 4).map((p) => p.id));
  expect(d.times.stops.at(-1)!.end).toBeLessThanOrEqual(DAY_END_MIN);
});
it('ngày mưa đảo tuyến để điểm có mái che rơi vào buổi chiều; ngày thường giữ tuyến', () => {
  const line = [0, 1, 2, 3].map((x, i) => fakePlace(i + 1, { visitDurationMin: 120, cover: i === 0 ? 'full' : 'none', location: { type: 'Point', coordinates: [0.1 + x / 100, 0.1] } }));
  const rain = [{ ...SEASON_GIA_LAP, kind: 'rain' as const, from: '11-01', to: '11-30' }];
  const firstAndLast = (seasons: CitySeason[]) => { const pool = dayOf(line, { seasons }); const d = buildDay(pool, pickAll(pool), { used: new Set() }); return [d.stops[0]!.place.id, d.stops.at(-1)!.place.id]; };
  expect(firstAndLast(rain)[1]).toBe(line[0]!.id);
  expect(firstAndLast([])[0]).toBe(line[0]!.id);
});
it('sai giờ tới mức còn dưới 3 điểm thì trả số điểm còn lại', () => {
  const places = [...placesIn(0, 2, 1), fakePlace(3, { openingHours: allDays('05:00', '05:30') })];
  const pool = dayOf(places);
  expect(buildDay(pool, pickAll(pool), { used: new Set() }).stops.filter((x) => x.kind === 'visit')).toHaveLength(2);
});
```

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/build-day`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces.

- [ ] **Step 4: Chạy lại test** — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S35 build itinerary day with rain afternoon and 21:30 limit"`

### Task 7: `generateItinerary`, thiếu điểm và đo hiệu năng

**Files:**
- Modify: `apps/api/src/modules/itineraries/planner/plan-itinerary.ts` (tách, không đổi hành vi)
- Create: `apps/api/src/modules/itineraries/planner/generate-itinerary.ts`, `generate-itinerary.test.ts`

**Interfaces:**
- Consumes: Task 1–6; `planItinerary` internals.
- Produces:
  - Trong `plan-itinerary.ts`: export `draftPlan(input: PlanInput): { ctx: PlanContext; result: Draft }` (hàm `draft` hiện có) và `suggestFor(input: PlanInput, succeeds: (input: PlanInput) => boolean): PlanSuggestion[]` (vòng gợi ý hiện có); `planItinerary` dùng hai hàm này, test S34 không sửa vẫn xanh.
  - Trong `generate-itinerary.ts` (S36/S37 dùng):

```ts
export interface ScheduledStop { placeId: string; kind: StopKind; start: string; end: string; travelMinFromPrev: number }
export interface ScheduledDay {
  day: number; date: string; weekday: number; rainy: boolean; pace: ItineraryPace; zoneIds: string[];
  startTime: string; stops: ScheduledStop[]; detours: DetourSuggestion[]; issues: ('missing_lunch' | 'missing_dinner')[];
}
export type GenerateResult =
  | { ok: true; templateId?: string; days: ScheduledDay[] }
  | { ok: false; code: 'NOT_ENOUGH_PLACES'; details: NotEnoughPlacesDetails };
export function generateItinerary(input: PlanInput): GenerateResult;
```

Trình tự: `draftPlan` → thất bại thì trả shortages của S34; `used` = mọi điểm S34 chọn → `buildDay` từng ngày theo thứ tự, thêm quán đã chèn vào `used` → ngày dưới `MIN_VISITS_PER_DAY` điểm `visit` thành `PlanShortage { day, zoneSlugs (từ zoneIds), available }` → sau khi dựng hết, `suggestDetours` từng ngày với `excluded` = mọi điểm dừng của chuyến cộng điểm đã gợi ý → định dạng giờ bằng `formatClock`. Thất bại thì `suggestFor(input, (i) => attempt(i).ok)`, `NotEnoughPlacesDetails.parse` trước khi trả.

- [ ] **Step 1: Viết test đỏ**

```ts
it('trả từng ngày đã xếp giờ cho S37', () => {
  const r = generateItinerary(planInput({ places: [...placesIn(0, 4, 1, { visitDurationMin: 90 }), fakePlace(9, { category: 'food' })] }));
  expect(r).toMatchObject({ ok: true, days: [{ day: 1, date: '2026-11-23', weekday: 1, startTime: '07:00', zoneIds: [ZONES[0]!.id], issues: [] }] });
  expect(r.ok && r.days[0]!.stops[0]).toMatchObject({ kind: 'visit', start: '07:00', travelMinFromPrev: 0 });
  expect(r.ok && r.days[0]!.stops.filter((s) => s.kind === 'meal')).toHaveLength(1);
});
it('nơi ở đổi điểm đầu tuyến nhưng không có trong kết quả', () => {
  const places = placesIn(0, 4, 1);
  const stay = { type: 'Point' as const, coordinates: [0.123456, 0.0987654] as [number, number] };
  const withStay = generateItinerary(planInput({ request: fakeRequest({ stayLocation: stay }), places }));
  expect(withStay.ok && withStay.days[0]!.stops[0]!.placeId).toBe(fakePlace(4).id);
  const noStay = generateItinerary(planInput({ places }));
  expect(noStay.ok && noStay.days[0]!.stops[0]!.placeId).toBe(fakePlace(1).id);
  expect(JSON.stringify(withStay)).not.toMatch(/0\.123456|0\.0987654|stay/);
});
it('cùng đầu vào cho cùng kết quả, kể cả thứ tự places khác', () => { /* 3 ngày, 4 cụm × 6 điểm + 2 quán mỗi cụm; so với places đảo ngược */ });
it('S35 bỏ điểm làm thiếu ngày thì NOT_ENOUGH_PLACES, gợi ý đã chạy thử cả sắp tuyến', () => {
  const places = [...placesIn(0, 4, 1), ...placesIn(1, 4, 11, { openingHours: allDays('05:00', '05:30') })];
  expect(generateItinerary(planInput({ request: fakeRequest({ days: 2 }), places }))).toEqual({
    ok: false, code: 'NOT_ENOUGH_PLACES',
    details: { shortages: [{ day: 2, zoneSlugs: [ZONES[1]!.slug], available: 0 }], suggestions: [{ kind: 'reduce_days', days: 1 }] },
  });
});
it('bất biến trên 200 địa điểm giả có hạt cố định', () => {
  // LCG hạt 35 sinh 200 điểm: cụm ngẫu nhiên, toạ độ trong ô 0,04° của cụm (cụm i lệch 0,05° theo kinh độ),
  // danh mục có food khoảng 25%, status phần lớn active, xác minh 0–100 ngày trước NOW, mỗi thứ 85% có một ca
  // open ∈ {05:00, 06:00, 07:00, 08:00, 10:00, 17:00}, close ∈ {11:00, 14:00, 21:00, 22:00, 23:00, 02:00},
  // visitDurationMin ∈ {thiếu, 45, 60, 90, 120}, bestTime/cover/priceLevel/tags ngẫu nhiên.
  // Hai bộ (200 điểm và 40 điểm đầu) × days 1–5 × 7 ngày khởi hành × 2 nhịp × (có/không nơi ở).
  // Khi ok, mỗi ngày: điểm dừng isEligible cho thứ của ngày, active, xác minh trong 90 ngày;
  //   coversVisit(place, weekday, clockMinutes(start), clockMinutes(end)); start >= end của điểm trước; end cuối <= DAY_END_MIN;
  //   số visit trong [3, VISITS_PER_DAY[pace]]; startTime === '04:45' đúng khi điểm đầu có bestTime sunrise;
  //   meal phục vụ food, bắt đầu trong khung, tối đa một bữa mỗi khung; có issue missing_x thì không có bữa trong khung x;
  //   placeId không lặp trong cả chuyến; detour không trùng điểm dừng, không lặp, detourMin < 10, afterIndex < stops.length - 1;
  //   JSON kết quả không chứa toạ độ nơi ở.
  // Khi không ok: NotEnoughPlacesDetails.parse không ném, reduce_days < request.days. Có ít nhất một ca ok và một ca thiếu điểm.
});
it('p95 dưới 500 ms với 200 địa điểm giả', () => {
  // Cùng 200 điểm và 140 yêu cầu của bộ đầy đủ ở test trên; đo từng lần gọi bằng performance.now();
  // p95 = thời gian thứ ceil(0,95 × n) sau khi sắp; console.info(`S35 p95 ${p95.toFixed(1)} ms`); expect(p95).toBeLessThan(500).
});
```

(Dựng bộ dữ liệu giả bằng một hàm `seededPlaces(seed, count)` đặt trong file test, dùng chung cho hai test cuối.)

- [ ] **Step 2: Chạy test, thấy đỏ** — `pnpm --filter @ranhduong/api test -- planner/generate-itinerary`, Expected: FAIL.

- [ ] **Step 3: Triển khai** theo Interfaces; tách `draftPlan`/`suggestFor` trước, chạy `pnpm --filter @ranhduong/api test -- planner/plan-itinerary` thấy test S34 vẫn xanh rồi mới viết `generateItinerary`.

- [ ] **Step 4: Chạy lại toàn bộ test planner** — `pnpm --filter @ranhduong/api test -- planner`, Expected: PASS; ghi lại dòng `S35 p95 … ms` cho runbook.

- [ ] **Step 5: Commit** — `git commit -m "feat: S35 generate scheduled itinerary days with verified suggestions"`

### Task 8: Tài liệu, kiểm toàn repo và review

**Files:**
- Create: `docs/runbooks/itinerary-route-schedule.md`
- Modify: `docs/technical-design.md` mục 7 (bảng thời gian: chờ mở cửa, cách đo hai loại phút; bước 7–10 theo "Quyết định trong plan"; ghi `scheduleDay` là hàm xếp giờ chung cho S15/S35/S40), `docs/runbooks/itinerary-place-selection.md` (trỏ sang runbook S35, bỏ câu "S35 dùng mặc định" đã thành sự thật), `docs/backlog-slice-2.md` (trạng thái S35), `CLAUDE.md` (Trạng thái)

- [ ] **Step 1: Viết runbook**: `generateItinerary` làm gì, đầu vào (như S34) và đầu ra `ScheduledDay`, trình tự một ngày, hằng số (07:00/04:45, 21:30, đệm 10, chờ 30, trước 07:00, ghim cuối, detour 10, mức giá mặc định 2), quy tắc bữa ăn và mức giá, mùa mưa, `issues` thiếu bữa (S36 tính là lỗi), S37 cần gắn `key` và đổi `afterIndex` thành `afterKey`, nơi ở không ra khỏi hàm, số p95 đo được (máy, số điểm, số yêu cầu), lệnh test, giới hạn đã biết (ước lượng chim bay tới S44; thứ tự mẫu không giữ).
- [ ] **Step 2: Cập nhật technical-design, runbook S34, backlog, CLAUDE.md** — chỉ ghi những gì đã kiểm ở local; CI remote, staging, điện thoại thật ghi là chưa kiểm (chưa có endpoint, làm cùng S36/S37).
- [ ] **Step 3: Kiểm toàn repo** — `pnpm infra:up; pnpm turbo run lint typecheck test build`, Expected: mọi task xanh (20 task như các story trước); thêm `pnpm --filter @ranhduong/web test:ssr` vì contracts đổi (admin/web dùng `analyzeTemplate`), Expected: xanh.
- [ ] **Step 4: Review độc lập** theo `superpowers:requesting-code-review` trên diff nhánh so với `main`; sửa lỗi có căn cứ (test đỏ trước), chạy lại Step 3.
- [ ] **Step 5: Commit** — `git commit -m "docs: S35 record route and schedule runbook and status"`

## Execution Record

- Thực thi tuần tự trong phiên (executing-plans) trên nhánh `feat/S35-itinerary-route-schedule` của workspace hiện tại, không tạo worktree, theo quy ước các story trước. Task 1–8 xong, mỗi task có RED/GREEN và dòng ledger trong `.superpowers/sdd/…/progress.md`.
- Ruling Task 3: `byScore` nhận `Pick<ScoredPlace, 'place' | 'score'>` để sắp `DayStop`. Ruling Task 7: `issues` có kiểu `` `missing_${MealKind}`[] ``.
- Review độc lập toàn nhánh: S15 không đổi (fuzz 20.000 đầu vào). Đã sửa (mỗi lỗi có test đỏ trước):
  - Điểm bình minh chờ tới 07:00 trong khi ngày báo 04:45. Quyết định 4 bổ sung: điểm bình minh chỉ chờ tới 06:00. `scheduleDay` thay `freeWaitUntil` cấp ngày bằng `waitUntil` theo từng điểm.
  - `detourMin` có thể bằng 10. Quyết định 9 bổ sung: lọc theo số phút đã làm tròn.
  - Quy tắc 21:30 không gỡ được khi trễ do điểm buổi tối mở muộn hay bữa tối. Quyết định 7 bổ sung: bỏ điểm thấp nhất trong các điểm mà bỏ đi thì ngày ngắn lại.
  - Mẫu bị S35 bỏ điểm tới dưới 3 điểm không quay lại tạo từ đầu.
  - `zoneIds` giữ cụm không còn điểm nào.
- Hoãn (minor):
  - Ngày thiếu điểm do S35 bỏ điểm: `available` là số điểm còn xếp được (đã ghi ở runbook).
  - `latLng` lặp ở hai file.
  - Test bất biến một hạt, chưa có mùa mưa và mẫu.
  - Ngày có chợ đêm thường trống từ trưa tới tối.
- Đo: p95 16,7 ms, chậm nhất 22,4 ms (140 yêu cầu, 200 điểm giả). Chưa kiểm: CI remote, staging, điện thoại thật (chưa có endpoint; làm cùng S36/S37).
