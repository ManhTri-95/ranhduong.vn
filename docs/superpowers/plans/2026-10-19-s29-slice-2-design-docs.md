# S29 Chốt thiết kế lát 2 trong tài liệu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa tài liệu thiết kế cho khớp 18 quyết định lát 2 đã duyệt ngày 19/10/2026, để các story S30–S47 viết plan từ tài liệu không còn mâu thuẫn.

**Architecture:** Chỉ sửa Markdown, không đụng code. Mỗi task sửa một tài liệu gốc (ADR, technical-design, architecture, product-spec, ui-spec); task cuối rà chéo toàn bộ và cập nhật trạng thái. Mỗi task có một lệnh `grep` làm "test": trước khi sửa, lệnh tìm thấy câu cũ (đỏ); sau khi sửa thì không còn câu cũ và có câu mới (xanh).

**Tech Stack:** Markdown (GFM, bảng, Mermaid), Git Bash cho lệnh kiểm.

**Spec:** `docs/backlog-slice-2.md` mục 2 (18 quyết định) và dòng S29; nguồn gốc: `docs/technical-design.md`, `docs/architecture.md`, `docs/product-spec.md` mục 8, `docs/ui-spec.md`, `docs/decisions/0007-in-memory-itinerary-llm-narrative-only.md`, `docs/decisions/README.md`.

## Tiêu chí nghiệm thu ↔ bước kiểm

| Tiêu chí S29 | Kiểm ở |
| --- | --- |
| technical-design mục 3 (`narrative` có cấu trúc, `stayLocation` làm tròn, `version`) | Task 2 Step 2, 4 |
| technical-design mục 6 (đọc công khai bằng `shareId`, sửa theo `key`) | Task 2 Step 2, 4 |
| technical-design mục 7 (ngày 5, cụm kề, gu, bỏ cache kết quả, mùa mưa, khung bữa ăn, không VIP) | Task 2 Step 2, 4 |
| technical-design mục 10–11 (job vé theo yêu cầu, URL `/da-lat/tao-lich-trinh`) | Task 2 Step 2, 4 |
| technical-design mục 13 (giới hạn theo `gid` và IP), mục 14 (đánh dấu câu đã chốt) | Task 2 Step 2, 4 |
| architecture mục 6–7 | Task 3 |
| product-spec mục 8 | Task 4 |
| ui-spec mục 5 (màn tạo, màn sửa), mục 9, mục 13 | Task 5 |
| ADR 0014 thay phần cache của ADR 0007 | Task 1 |
| Không còn câu mâu thuẫn ở bất kỳ tài liệu nào | Task 6 Step 1–2 |

## Global Constraints

- Chỉ sửa tài liệu trong `docs/`, `CLAUDE.md`. Không sửa code, không thêm dependency.
- Văn bản tiếng Việt theo giọng văn ở Spec UI mục 3: câu ngắn, cụ thể, không phóng đại. Tên file, giá trị enum, tên trường bằng tiếng Anh.
- ADR theo khuôn ở `docs/decisions/README.md`: dưới 40 dòng, ba phần Bối cảnh, Quyết định, Hệ quả. Không xoá nội dung ADR cũ, chỉ sửa dòng Trạng thái.
- Không đổi hay xoá route công khai nào. Chỉ thêm `/da-lat/tao-lich-trinh` (đã duyệt).
- Nhánh `docs/S29-slice-2-backlog` (đang đứng). Commit Conventional Commits có `S29`, mỗi task một commit.
- Giá trị dùng chung, chép đúng ở mọi tài liệu:
  - `MEAL_WINDOWS`: trưa 11:30–13:30, tối 18:00–20:00 (khớp `packages/contracts/src/itinerary-schedule.ts:63`: 690–810, 1080–1200 phút).
  - `TripWith`: `'solo' | 'couple' | 'friends' | 'family'` (Một mình, Cặp đôi, Nhóm bạn, Gia đình; `family` cộng điểm thẻ `gia-dinh`).
  - `TripInterest` và bảng gu → thẻ:

    | Giá trị | Nhãn | Thẻ địa điểm |
    | --- | --- | --- |
    | `chill_cafe` | Cà phê chill | `chill` |
    | `clouds_hills` | Săn mây, view đồi | `view-doi`; cộng điểm cho điểm có `bestTime` chứa `sunrise` |
    | `photo_spots` | Sống ảo | `song-ao` |
    | `nature_adventure` | Thiên nhiên, mạo hiểm | `mao-hiem` |
    | `breakfast_specialties` | Ăn sáng, đặc sản | `an-sang`, `dac-san` |

  - Cụm kề (`Zone.adjacentZones`, slug, đối xứng, đã trừ cặp cấm): `trung-tam` → `phia-nam`, `phia-bac`, `phia-dong`; `phia-nam` → `trung-tam`, `phia-dong`; `phia-bac` → `trung-tam`; `phia-dong` → `trung-tam`, `phia-nam`.
  - Làm tròn nơi ở: mỗi trục tới 0,005° (khoảng 550 m ở Đà Lạt).
  - Giới hạn tạo và chép lịch trình: 10/giờ mỗi `gid`, 60/giờ mỗi IP.
  - Redis cache mô tả: khoá `itin-narr:{contentHash}`, sống 30 ngày; `contentHash` băm `cityId` + `placeId`, `start`, `end` của mọi điểm theo thứ tự.
  - Ảnh vé lưu R2 theo hash nội dung vé; lịch trình giữ `ticketKey` để xoá ảnh cũ khi sinh ảnh mới.

## Quyết định của người viết plan (chủ dự án chưa duyệt riêng)

Mỗi mục điền một chỗ backlog để ngỏ; người thực thi chép đúng, người review xem lại:

1. `params.tags` của lịch trình giữ tên trường cũ, kiểu đổi thành `TripInterest[]` (mẫu hiện có đều là `[]`, không cần migrate).
2. Lịch trình của khách luôn `visibility: 'unlisted'`; `public` chỉ dùng cho mẫu.
3. CAS bằng trường `version: number` (bắt đầu 1, tăng mỗi lần ghi), không dùng `updatedAt`.
4. Sửa lịch trình gửi cả bố cục ngày như form S15: `PATCH /itineraries/:shareId` body `{ version, days: [{ stops: [{ key, placeId, locked }] }] }`. Đổi điểm = xem gợi ý qua `GET /itineraries/:shareId/stops/:key/alternatives` rồi `PATCH`. Bỏ `POST /itineraries/:id/events`; server ghi `ItineraryEvent` khi `PATCH`.
5. Thêm `POST /itineraries/:shareId/copy` cho "Tạo bản của mình", tính chung giới hạn với tạo mới.
6. Ảnh vé lưu theo hash nội dung vé, không theo `version`, để mẫu (không có `version`) và lịch trình của khách dùng chung một cách.
7. `ItineraryEvent` thêm `cityId` (quy tắc mọi document nghiệp vụ có `cityId`).
8. Ghi `Zone.adjacentZones` (danh sách đã trừ cặp cấm) thay cho hai khái niệm "kề" và "cặp cấm" riêng.

## Review Focus

1. **Câu cũ còn sót ở mục không nằm trong danh sách S29** (ví dụ architecture mục 5 vẫn "xoá cache lịch trình", technical-design mục 1 vẫn "cache lịch trình"): tài liệu phải nhất quán ở mọi chỗ (Task 6 Step 1 grep toàn `docs/`).
2. **Tài liệu lệch với code đã có:** model `Itinerary` trong tài liệu phải có các trường S15 đã thêm (`key`, `note`, `durationMin`, `manualStart`, `manualEnd`, `startTime`, `startWeekday`, `description`, `season`, `style`, `seoTitle`, `seoDescription`, `status`), khung bữa ăn đúng 11:30–13:30/18:00–20:00 (Task 2 Step 4, Task 6 Step 2).
3. **Giá trị enum lệch giữa các tài liệu** (`TripInterest`, `TripWith`, nhãn tiếng Việt): technical-design, product-spec, ui-spec và backlog phải dùng cùng 5 nhãn gu và 4 nhãn đi cùng ai (Task 6 Step 2).
4. **Nơi ở lộ ra ở mô tả công khai:** không chỗ nào mô tả trang `/l/`, API công khai hay ảnh vé có hiện nơi ở; mọi chỗ nhắc `stayLocation` phải nói "đã làm tròn, không trả công khai" (Task 6 Step 2).
5. **Lịch sử ADR bị sửa mất:** ADR 0007 chỉ đổi dòng Trạng thái, thân giữ nguyên; README có dòng 0014 (Task 1 Step 4).

---

### Task 1: ADR 0014 và trạng thái ADR 0007

**Files:**
- Create: `docs/decisions/0014-guest-itinerary-cache-and-share-ids.md`
- Modify: `docs/decisions/0007-in-memory-itinerary-llm-narrative-only.md:3` (dòng Trạng thái)
- Modify: `docs/decisions/README.md` (bảng ADR)

**Interfaces:**
- Produces: link `[ADR 0014](decisions/0014-guest-itinerary-cache-and-share-ids.md)` mà Task 2–3 trỏ tới.

- [ ] **Step 1: Viết lệnh kiểm (đỏ)**

```bash
cd /c/Users/USER/Desktop/Work/ranhduong
f=docs/decisions/0014-guest-itinerary-cache-and-share-ids.md
test -f $f && [ "$(wc -l < $f)" -le 40 ] \
  && grep -q "bị thay bởi \[ADR 0014\]" docs/decisions/0007-in-memory-itinerary-llm-narrative-only.md \
  && grep -q "\[0014\](0014-guest-itinerary-cache-and-share-ids.md)" docs/decisions/README.md; echo "exit=$?"
```

Kiểm thân ADR 0007 không đổi bằng `git diff HEAD -- docs/decisions/0007-in-memory-itinerary-llm-narrative-only.md`: chỉ được có đúng dòng 3.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Expected: `exit=1` (file 0014 chưa có).

- [ ] **Step 3: Viết ADR 0014**

Tiêu đề: `# ADR 0014: Lịch trình của khách không cache kết quả, công khai qua shareId và không lộ nơi ở`. Trạng thái "Đã chấp nhận", ngày 2026-10-19, Nguồn: `backlog-slice-2.md` mục 2, ADR 0007, technical-design mục 3, 6, 7.
- **Bối cảnh:** ADR 0007 cache kết quả theo `paramsHash` 7 ngày; khoá thiếu `cityId`, phải giữ tập `itin:byplace` và job xoá cache theo sự kiện; thuật toán trong bộ nhớ đã dưới 500 ms nên cache chỉ đáng giữ cho phần tốn tiền là LLM. Thiết kế cũ trộn `:id` (ObjectId) với `:shareId` ở endpoint công khai; lịch trình xuất phát từ nơi ở của khách.
- **Quyết định:** (1) không cache kết quả thuật toán; cache mô tả LLM theo `itin-narr:{contentHash}` 30 ngày; (2) lịch trình của khách đọc, sửa, lấy ảnh vé qua `shareId` ngẫu nhiên base62, unique, không lộ ObjectId; mẫu dùng slug; (3) `stayLocation` làm tròn mỗi trục 0,005° trước khi lưu, không trả trong API, trang hay ảnh vé công khai.
- **Hệ quả:** bỏ trường và index `paramsHash`, khoá `itin:{paramsHash}`, `itin:byplace:{placeId}`, job `itinerary.cacheInvalidate`; sự kiện địa điểm chỉ làm mới snapshot; cùng tham số có thể ra lịch trình khác khi dữ liệu đổi (đúng ý: luôn theo dữ liệu mới); `contentHash` cùng nội dung thì dùng lại mô tả, không gọi LLM lại.

- [ ] **Step 4: Sửa ADR 0007 và README**

ADR 0007 dòng 3 thành: `- Trạng thái: Đã chấp nhận; phần cache theo \`paramsHash\` bị thay bởi [ADR 0014](0014-guest-itinerary-cache-and-share-ids.md)`. README thêm dòng `| [0014](0014-guest-itinerary-cache-and-share-ids.md) | Lịch trình của khách không cache kết quả, công khai qua shareId, không lộ nơi ở |` sau dòng 0013.

- [ ] **Step 5: Chạy lại lệnh kiểm**

Expected: `exit=0`; `git diff HEAD -- docs/decisions/0007-*` chỉ đổi dòng 3.

- [ ] **Step 6: Commit**

```bash
git add docs/decisions/
git commit -m "docs: S29 add ADR 0014 for guest itinerary cache and share ids"
```

---

### Task 2: technical-design.md

**Files:**
- Modify: `docs/technical-design.md` mục 1 (bảng lớp), 3 (Zone, Itinerary, ItineraryEvent, index), 6 (API khách), 7 (thuật toán), 10 (jobs), 11 (URL, OG), 12 (sự kiện vé), 13 (rate limit), 14 (câu đã chốt)

**Interfaces:**
- Consumes: ADR 0014 (Task 1); giá trị ở Global Constraints.
- Produces: tên endpoint, trường và enum mà Task 3–6 và các story S30–S43 dùng: `GET /itineraries/:shareId`, `GET /itineraries/:shareId/narrative`, `PATCH /itineraries/:shareId`, `GET /itineraries/:shareId/stops/:key/alternatives`, `POST /itineraries/:shareId/optimize`, `POST /itineraries/:shareId/copy`, `GET /itineraries/:shareId/ticket.png`, `GET /cities/:city/itineraries/templates/:slug/ticket.png`; trường `version`, `ticketKey`, `detours`, `narrative: ItineraryNarrative`, `Zone.adjacentZones`.

- [ ] **Step 1: Viết lệnh kiểm (đỏ)**

```bash
cd /c/Users/USER/Desktop/Work/ranhduong
grep -n "không lặp zone\|stopIndex\|tháng 5–11\|11:30–13:00\|cacheInvalidate\|/itineraries/:id\|paramsHash\|10/giờ mỗi IP\|dưới 300 ms mỗi lần tạo\|cache lịch trình\|id + updatedAt" docs/technical-design.md; echo "stale_exit=$?"
for s in "tao-lich-trinh" "adjacentZones" "MEAL_WINDOWS" "ItineraryNarrative" "TripInterest" "breakfast_specialties" "itin-narr:" "/stops/:key/alternatives" "/copy" "ticketKey" "60/giờ mỗi IP" "0,005°"; do grep -q -- "$s" docs/technical-design.md || echo "MISSING $s"; done
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Expected: có dòng khớp câu cũ (`stale_exit=0`) và nhiều dòng `MISSING`.

- [ ] **Step 3: Sửa theo từng mục**

- **Mục 1:** dòng "Hàng đợi, cache": "Job nền, rate limit, cache mô tả lịch trình". Dòng "Khoảng cách": thêm "lát 2 dùng ước lượng chim bay tới S44". Dòng ảnh vé: "file font trong repo, chỉ dùng cho vé".
- **Mục 3:** `Zone` thêm `adjacentZones: string[]` kèm chú thích (slug cụm ghép được trong một ngày: chung ranh giới, đã trừ cặp cấm; đối xứng; seed Đà Lạt như Global Constraints). `Itinerary` viết lại khớp code hiện có cộng phần lát 2: trường S15 ở Review Focus 2; `params.with?: TripWith`, `params.tags: TripInterest[]` (quyết định 1), `params.startDate?` (`YYYY-MM-DD` giờ Việt Nam, lịch trình của khách), `params.startWeekday` (mẫu), `params.stayLocation?` (đã làm tròn 0,005°, không trả công khai); bỏ `paramsHash`; `days[].detours?: { afterKey: string; placeId; detourMin: number }[]`; `stops[].isVip` ghi "luôn false tới giai đoạn 2"; `narrative?: ItineraryNarrative` = `{ intro: string; days: { day: number; intro: string; stops: { key: string; note: string }[] }[] }`; `shareId?` (chỉ lịch trình của khách); `version: number`; `ticketKey?: string`; `visibility` ghi quyết định 2. `ItineraryEvent` thêm `cityId` và ghi "server ghi khi `PATCH`". Index: `itineraries` còn `{cityId, kind, slug}` unique partial và `{shareId}` unique partial; bỏ `{paramsHash}`.
- **Mục 6:** thay các dòng lịch trình của khách bằng 8 endpoint ở Interfaces, quyền và body theo quyết định 4–5; `GET /itineraries/:shareId` ghi "không trả `stayLocation`, `guestId`, `ownerId`; có `canEdit` khi cookie `gid` là của người tạo"; `POST /cities/:city/itineraries` body `ItineraryRequest`, đặt cookie `gid` lần đầu; ảnh vé `?format=story|og`, story 1080×1920, og 1200×630. Bỏ dòng `POST /itineraries/:id/events`.
- **Mục 7:** đoạn mở đầu đổi mục tiêu thành "p95 dưới 500 ms" (khớp ADR 0007, architecture mục 8). Đầu vào `ItineraryRequest`; đầu ra thêm `detours`. Bảng thời gian: bữa ăn `MEAL_WINDOWS` 11:30–13:30 / 18:00–20:00 dùng chung với kiểm tra S15; mùa mưa "mùa `kind: 'rain'` trong `City.seasons`, không có thì không áp"; di chuyển "ước lượng tới khi có `distance_matrix` (S44)". Các bước: bước 1 thành "Snapshot, không cache kết quả (ADR 0014)"; bước 2 so khớp Jaccard trên `params.tags` cộng khớp `with`; bước 4 ghi bảng gu → thẻ, gu chỉ cộng điểm, `ratingAvg` bằng 0 tới lát 3; bước 5 theo `Zone.adjacentZones`, 4 ngày đầu không lặp cụm, ngày 5 nhịp thong thả (cà phê, chợ, đặc sản) được dùng lại cụm, không lặp điểm; bước 7 không có nơi ở thì tuyến mở từ điểm đầu; bước 11 "giai đoạn 2, lát 2 `isVip` luôn false"; bước 13 thêm luật validate (chỉ `key` có trong lịch trình; từ chối giờ, giá, số điện thoại, địa chỉ không có trong đầu vào), cache `itin-narr:{contentHash}`, polling `GET /v1/itineraries/:shareId/narrative`. Đoạn đổi điểm/tối ưu lại viết theo quyết định 4. Thêm đoạn ngắn "Nơi ở": làm tròn 0,005°, chỉ dùng để xếp tuyến.
- **Mục 10:** `itinerary.narrative` "khi tạo lịch trình mà cache mô tả chưa có (S43)"; bỏ dòng `itinerary.cacheInvalidate`; `itinerary.ticket` "khi bấm Tạo vé hoặc ảnh OG được gọi lần đầu mà chưa có ảnh cho nội dung hiện tại; lưu R2 theo hash nội dung, xoá ảnh ở `ticketKey` cũ"; `distance.incremental` ghi "(S44)".
- **Mục 11:** bảng URL thêm `| Tạo lịch trình | \`/da-lat/tao-lich-trinh\` | SWR 1 giờ | Có |`; dòng lịch trình cá nhân thêm "ảnh OG là ảnh vé (S39)"; câu sitemap thêm trang tạo lịch trình vào sitemap pages. Câu "ảnh OG sinh sẵn từ ảnh bìa" thêm "lịch trình dùng ảnh vé khi có (S30)".
- **Mục 12:** thêm dòng `ticket_create`, `ticket_share` (channel) | KPI vé; câu KPI ghi "lát 2 tự đếm trên hạ tầng của mình theo ADR 0012 (S41), không phụ thuộc analytics opt-in".
- **Mục 13:** dòng tạo lịch trình thành `| \`POST /cities/:city/itineraries\`, \`POST /itineraries/:shareId/copy\` | 10/giờ mỗi \`gid\`; 60/giờ mỗi IP |`.
- **Mục 14:** đánh `[x]` "Bảng zone kề nhau và cặp cấm ghép" kèm "chung ranh giới, cấm Phía Bắc + Phía Đông (19/10/2026)"; "Chọn model LLM" giữ `[ ]`, thêm "chốt khi làm S43"; "Rate limit cụ thể" thêm "tạo lịch trình đã chốt ở mục 13".

- [ ] **Step 4: Chạy lại lệnh kiểm**

Expected: không dòng nào khớp câu cũ (`stale_exit=1`), không có `MISSING`. Đối chiếu tay model `Itinerary` với `apps/api/src/modules/itineraries/schemas/itinerary.schema.ts`: mọi trường trong schema đều có trong tài liệu.

- [ ] **Step 5: Commit**

```bash
git add docs/technical-design.md
git commit -m "docs: S29 align technical design with slice 2 decisions"
```

---

### Task 3: architecture.md

**Files:**
- Modify: `docs/architecture.md` mục 5 (bảng cách giao tiếp, danh sách sự kiện), 6 (luồng tạo lịch trình), 7 (Redis, bộ nhớ tiến trình), 9 (điểm nghẽn sinh ảnh vé)

**Interfaces:**
- Consumes: khoá `itin-narr:{contentHash}`, endpoint `GET /itineraries/:shareId/narrative` (Task 2).

- [ ] **Step 1: Viết lệnh kiểm (đỏ)**

```bash
cd /c/Users/USER/Desktop/Work/ranhduong
grep -n "itin:{paramsHash}\|itin:byplace\|itin:hash\|cache lịch trình\|Khi cache có sẵn" docs/architecture.md; echo "stale_exit=$?"
grep -q "itin-narr:{contentHash}" docs/architecture.md || echo "MISSING itin-narr"
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Expected: `stale_exit=0`, `MISSING itin-narr`.

- [ ] **Step 3: Sửa**

- **Mục 5:** ví dụ sự kiện nội bộ thành "Địa điểm đổi → làm mới snapshot lịch trình"; `place.updated` "Làm mới snapshot địa điểm; đẩy job xoá cache Cloudflare"; `place.statusChanged` "Làm mới snapshot địa điểm"; `itinerary.created` "Đẩy job viết mô tả khi cache mô tả chưa có (S43); tăng `inItineraries`".
- **Mục 6:** đoạn mở đầu và sơ đồ Mermaid: 1 `POST /cities/:city/itineraries`; 2 API chạy thuật toán trên snapshot; 3 lưu `Itinerary`; 4 trả lịch trình kèm mô tả mẫu và cookie `gid`; 5 tìm `itin-narr:{contentHash}` trong Redis, có thì lưu vào lịch trình, chưa có thì đẩy job; 6–8 worker gọi LLM, validate, lưu và ghi cache; 9 web `GET /itineraries/:shareId/narrative`, 204 hoặc 200. Thay đoạn "Khi cache có sẵn" bằng câu: cùng nội dung thì dùng lại mô tả, không gọi LLM; LLM lỗi hoặc quá 8 giây thì giữ mô tả mẫu.
- **Mục 7:** bỏ dòng `itin:{paramsHash}`, `itin:byplace:{placeId}`; thêm `| \`itin-narr:{contentHash}\` | Mô tả LLM đã validate | 30 ngày | Hết hạn |`; dòng `rl:{route}:{key}` không đổi. Đoạn bộ nhớ tiến trình: "Làm mới mỗi 10 phút hoặc ngay khi có `place.updated`, `place.statusChanged`"; ma trận khoảng cách "khi có S44".
- **Mục 9:** điểm nghẽn sinh ảnh vé: "chỉ sinh khi có người cần, lưu R2 theo hash nội dung, không sinh lại khi nội dung vé không đổi".

- [ ] **Step 4: Chạy lại lệnh kiểm**

Expected: `stale_exit=1`, không có `MISSING`. Sơ đồ Mermaid: mọi mũi tên có số bước liên tục 1→9.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: S29 align architecture with slice 2 decisions"
```

---

### Task 4: product-spec.md mục 8

**Files:**
- Modify: `docs/product-spec.md` mục 8 (`## 8. Lên lịch trình`, hiện dòng 280–318)

- [ ] **Step 1: Viết lệnh kiểm (đỏ)**

```bash
cd /c/Users/USER/Desktop/Work/ranhduong
sec() { awk '/^## 8\./,/^## 9\./' docs/product-spec.md; }
sec | grep -n "khoảng tháng 5–11\|gần nhau cho mỗi ngày"; echo "stale_exit=$?"
for s in "Cà phê chill" "Ăn sáng, đặc sản" "Nhóm bạn" "Tạo bản của mình" "Phía Bắc" "làm tròn"; do sec | grep -q -- "$s" || echo "MISSING $s"; done
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Expected: `stale_exit=0` và có `MISSING`.

- [ ] **Step 3: Sửa**

- **Đầu vào:** liệt kê 5 nhãn gu (chọn tối đa 3) và 4 nhãn đi cùng ai; nơi ở "ghim trên bản đồ hoặc chọn cụm, bỏ qua được; chỉ lưu vị trí đã làm tròn".
- **Thuật toán bước 2:** "mỗi ngày 1–2 cụm chung ranh giới; không ghép Phía Bắc (Langbiang) với Phía Đông (Cầu Đất); 4 ngày đầu không lặp cụm". Bước 7: mùa mưa theo mùa admin đặt ở mục Mùa & giao diện. Bước 8: "(P1; chưa có thì dùng mô tả mẫu)". Thêm sau bước 1: gu chỉ cộng điểm, không loại điểm.
- **Chỉnh sửa:** thêm "chỉ người tạo sửa được (nhận ra bằng cookie khách tạm)".
- **Địa điểm VIP:** thêm "(giai đoạn 2; lát 2 chưa chèn điểm VIP)".
- **Chia sẻ:** link `/l/{shareId}` chỉ ai có link mới xem, không được index, không hiện nơi ở; người nhận bấm "Tạo bản của mình" để có bản riêng sửa được.

- [ ] **Step 4: Chạy lại lệnh kiểm**

Expected: `stale_exit=1`, không có `MISSING`.

- [ ] **Step 5: Commit**

```bash
git add docs/product-spec.md
git commit -m "docs: S29 align product spec itinerary section with slice 2"
```

---

### Task 5: ui-spec.md

**Files:**
- Modify: `docs/ui-spec.md` mục 3 (bảng ví dụ), 5 (bảng màn hình), 9 (vé), 12 (dòng Soạn lịch trình mẫu), 13 (bảng phân lát, câu hỏi mở)

- [ ] **Step 1: Viết lệnh kiểm (đỏ)**

```bash
cd /c/Users/USER/Desktop/Work/ranhduong
grep -n "/v1/itineraries/:id/\|id + updatedAt\|\[ \] Tự host font\|Vé lịch trình để chia sẻ | 2 | Backlog lát 2" docs/ui-spec.md; echo "stale_exit=$?"
for s in "/da-lat/tao-lich-trinh" "Tạo bản của mình" "hash nội dung" "S38" "gu (tối đa 3)"; do grep -q -- "$s" docs/ui-spec.md || echo "MISSING $s"; done
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Expected: `stale_exit=0` và có `MISSING`.

- [ ] **Step 3: Sửa**

- **Mục 3:** thêm 2 dòng ví dụ. Thiếu điểm khi tạo: nên "Khu này mình chưa ghi đủ chỗ cho 3 ngày. Thử 2 ngày, hoặc bỏ bớt một gu nhé?", tránh "Không đủ dữ liệu (NOT_ENOUGH_PLACES)". Chọn nơi ở: nên "Bạn ở khu nào? Chưa đặt chỗ thì bỏ qua cũng được.", tránh "Nhập địa chỉ lưu trú".
- **Mục 5:** thêm dòng `| Tạo lịch trình | \`/da-lat/tao-lich-trinh\` | Tiêu đề và một dòng giới thiệu · các bước bằng chip/nút: số ngày (1–5), ngày đi, phương tiện, đi cùng ai, gu (tối đa 3), nhịp độ, nơi ở (ghim trên bản đồ hoặc chọn cụm, "Bỏ qua") · nút chính "Lên lịch giúp mình" · trạng thái đang tạo (khung xương timeline), thiếu điểm (câu ở mục 3 + nút áp dụng gợi ý), lỗi mạng (giữ lựa chọn, nút Thử lại) | 2 |`. Dòng Lịch trình: thêm cho `/l/{shareId}` "người tạo: nút Sửa mở chế độ sửa (kéo thả và nút lên/xuống, chuyển ngày, khoá, Đổi điểm khác tương tự với 3 gợi ý, Tối ưu lại, thêm điểm Tiện đường; báo khi bản đã cũ và tải lại); người xem: nút Tạo bản của mình". Dòng Vé lịch trình: URL thành "Ảnh tạo từ trang lịch trình mẫu và `/l/{shareId}`".
- **Mục 9:** endpoint thành `GET /v1/itineraries/:shareId/ticket.png?format=story|og` và `GET /v1/cities/:city/itineraries/templates/:slug/ticket.png?format=story|og`; ảnh lưu R2 theo hash nội dung vé, chỉ sinh khi bấm "Tạo vé để chia sẻ" hoặc khi OG được gọi lần đầu, chưa có thì OG dùng ảnh mặc định; QR trỏ tới `/l/{shareId}` hoặc trang mẫu, kèm `utm_source=ticket`; font: file trong repo chỉ cho vé, giấy phép ghi ở `/ghi-nguon`; vé không chứa nơi ở.
- **Mục 12:** dòng Soạn lịch trình mẫu, khung Thông tin lịch trình thêm "gu (tối đa 3), đi cùng ai (S32)".
- **Mục 13:** dòng vé thành `| Vé lịch trình để chia sẻ | 2 | S30 | Khoảng 10 giờ |`; thêm `| Màn tạo và sửa lịch trình | 2 | S38, S40, S42 | Khoảng 22 giờ |`; câu hỏi font thành `- [x] Font: web giữ Google Fonts; vé dùng file font trong repo (19/10/2026)`.

- [ ] **Step 4: Chạy lại lệnh kiểm**

Expected: `stale_exit=1`, không có `MISSING`.

- [ ] **Step 5: Commit**

```bash
git add docs/ui-spec.md
git commit -m "docs: S29 add builder and edit screens to UI spec"
```

---

### Task 6: Rà chéo, data-collection và trạng thái

**Files:**
- Modify: `docs/data-collection.md` (đoạn tab "Tags")
- Modify: `docs/backlog-slice-2.md` (quyết định 14, S30, dòng trạng thái S29)
- Modify: `CLAUDE.md` (mục Trạng thái, dòng lát 2)

**Interfaces:**
- Consumes: toàn bộ thay đổi Task 1–5.

- [ ] **Step 1: Lệnh rà toàn bộ câu cũ**

```bash
cd /c/Users/USER/Desktop/Work/ranhduong
grep -rn "không lặp zone\|stopIndex\|itin:{paramsHash}\|itin:byplace\|cacheInvalidate\|/itineraries/:id\b\|/itineraries/:id/\|11:30–13:00\|id + updatedAt\|cache lịch trình" docs CLAUDE.md --include=*.md \
  | grep -v "docs/superpowers/\|docs/decisions/0007-\|docs/decisions/0014-\|docs/decisions.md" \
  | grep -v -E 'docs/backlog-slice-2\.md:[0-9]+:[0-9]+\. \*\*'; echo "stale_exit=$?"
grep -n "theo phiên bản" docs/backlog-slice-2.md; echo "version_exit=$?"
```

Bộ lọc thứ hai bỏ qua các quyết định đánh số ở mục 2 của backlog, vì chúng cố ý nhắc câu cũ để giải thích đã sửa gì. Expected trước khi sửa Step 3: `stale_exit=1` (Task 1–5 đã dọn) và `version_exit=0` (quyết định 14 và S30 còn "theo phiên bản").

- [ ] **Step 2: Lệnh kiểm nhất quán**

```bash
for s in "Cà phê chill" "Săn mây, view đồi" "Sống ảo" "Thiên nhiên, mạo hiểm" "Ăn sáng, đặc sản"; do
  for f in docs/technical-design.md docs/product-spec.md docs/backlog-slice-2.md; do grep -q -- "$s" $f || echo "MISSING '$s' in $f"; done
done
grep -n "stayLocation" docs/*.md | grep -v "làm tròn\|không trả" ; echo "location_exit=$?"
grep -n "11:30–13:30" docs/technical-design.md docs/ui-spec.md
grep -q "chill.*view-doi.*song-ao.*mao-hiem.*an-sang.*dac-san\|gu của lịch trình" docs/data-collection.md || echo "MISSING tags note"
```

Expected sau Step 3: không có `MISSING`; `location_exit=1` (mọi dòng nhắc `stayLocation` đều nói làm tròn hoặc không trả công khai); `11:30–13:30` có ở cả hai file.

- [ ] **Step 3: Sửa**

- `docs/data-collection.md`, sau câu tab "Tags": "Các thẻ `chill`, `view-doi`, `song-ao`, `mao-hiem`, `an-sang`, `dac-san`, `gia-dinh` được bảng gu của lịch trình dùng (backlog lát 2 mục 2); không đổi tên hay xoá, nếu đổi thì sửa bảng gu trong `packages/contracts` cùng lúc. Lịch trình lát 2 cần thời lượng ghé và thời điểm đẹp của từng điểm."
- `docs/backlog-slice-2.md`: quyết định 14 ("Ảnh lưu R2 theo phiên bản, bản cũ bị xoá") và tiêu chí S30 ("lưu R2 theo phiên bản, xoá bản cũ") đổi thành "lưu R2 theo hash nội dung vé, xoá ảnh cũ"; dòng S29 cột Trạng thái thành "Xong trên `docs/S29-slice-2-backlog`: ADR 0014, technical-design, architecture, product-spec, ui-spec, data-collection khớp 18 quyết định; plan `docs/superpowers/plans/2026-10-19-s29-slice-2-design-docs.md`; chờ merge".
- `CLAUDE.md`, dòng lát 2 ở mục Trạng thái: thay "bằng S29 sửa tài liệu cho khớp các quyết định ở mục 2" thành "S29 (tài liệu khớp quyết định, ADR 0014) đã xong trên `docs/S29-slice-2-backlog`; story tiếp theo S30".

- [ ] **Step 4: Chạy lại Step 1 và Step 2**

Expected: Step 1 `stale_exit=1` và `version_exit=1`; Step 2 đúng như kỳ vọng ở trên.

- [ ] **Step 5: Commit**

```bash
git add docs/data-collection.md docs/backlog-slice-2.md CLAUDE.md
git commit -m "docs: S29 sweep slice 2 docs and record status"
```
