# S30 Vé lịch trình dạng ảnh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sinh vé lịch trình dạng ảnh (story 1080×1920, OG 1200×630) cho lịch trình mẫu bằng Satori + resvg trong worker, dùng làm ảnh xem trước khi dán link và cho khách lưu hoặc gửi từ màn xem trước trên web.

**Architecture:** Module mới `apps/api/src/modules/tickets`. API dựng `TicketData` (contracts) từ `ItineraryTemplateDetail` + `City`, băm nội dung thành `hash` và đọc `tickets/{hash}/{format}.png` trên bucket công khai R2. Chưa có ảnh thì xếp job BullMQ `itinerary.ticket` (jobId theo hash) rồi chờ tối đa 4 giây (OG) hoặc 8 giây (story) bằng cách đọc lại R2. Worker dựng cả hai ảnh, ghi R2, đổi `Itinerary.ticketKey` (không đổi `updatedAt`) và xoá ảnh cũ. Hết giờ chờ hoặc hạ tầng lỗi thì OG trả ảnh mặc định `no-store`, story trả 503 `Retry-After`. Web đặt `og:image` của trang mẫu là URL vé, thêm nút "Tạo vé để chia sẻ" mở `<dialog>` xem trước. Nút gửi dùng Web Share kèm file; máy không hỗ trợ thì có "Lưu ảnh" và "Sao chép link".

**Tech Stack:** NestJS 12, BullMQ 6, `@aws-sdk/client-s3`, Satori 0.33.5, `@resvg/resvg-js` 2.6.2, `uqr` 0.1.3, Zod 4, Vitest 5, Nuxt 4, Vue 3.

**Spec:** `docs/backlog-slice-2.md` S30 (dòng 93) và mục 2 quyết định 7, 14, 17; `docs/ui-spec.md` mục 3 (giọng văn), 4 (nút nét đứt), 5 (thanh hành động lịch trình), 9 (vé); `docs/technical-design.md` mục 3 (`ticketKey`), 6 (endpoint vé), 10 (job `itinerary.ticket`), 11 (OG lịch trình); `docs/architecture.md` mục 5, 9 (sinh vé trong worker); ADR 0014 (đọc công khai không dùng ObjectId).

## Tiêu chí nghiệm thu ↔ bước kiểm

| Tiêu chí S30 | Kiểm ở |
| --- | --- |
| Satori + resvg trong worker | Task 4 (render thật, test kích thước PNG); Task 8 (processor chạy trong `worker.ts`, test với Redis thật) |
| Font Lora, Be Vietnam Pro, Patrick Hand có tiếng Việt, nằm trong repo, chỉ dùng cho vé | Task 3 (file và giấy phép, test thiếu glyph); Task 4 (render chữ có dấu, không gọi `loadAdditionalAsset`) |
| Giấy phép font ghi ở `/ghi-nguon` | Task 9 (mục `#font-ve`, test SSR) |
| QR có `utm_source=ticket`, trỏ tới trang mẫu | Task 2 (test `qrUrl`); Task 4 (QR vẽ từ `qrUrl`); Task 11 Step 4 (quét QR trên ảnh thật) |
| Story 1080×1920, OG 1200×630 | Task 1 (`TICKET_SIZE`); Task 4 (test kích thước) |
| Tối đa 8 điểm rồi "+ x điểm" | Task 2 (test cắt điểm, ngân sách dòng); Task 4 (ảnh mẫu nhiều điểm) |
| Áp cho lịch trình mẫu; S39 áp cho lịch trình của khách | Task 6–8 (endpoint theo slug); `TicketsService.ensure` dùng lại được cho S39 |
| Sinh khi bấm "Tạo vé" hoặc khi OG được gọi lần đầu | Task 7 (GET xếp job khi thiếu ảnh); Task 10 (nút gọi URL story); Task 11 Step 3 |
| Lưu R2 theo hash nội dung, xoá ảnh cũ | Task 5 (storage), Task 6 (`swapTicketKey`), Task 7 (test `generate`); Task 11 Step 3 (sửa mẫu, kiểm MinIO) |
| Chưa sinh xong thì OG dùng ảnh mặc định | Task 7 (test hết giờ chờ, hạ tầng lỗi); Task 8 (test header `no-store`) |
| URL ảnh không chứa ObjectId | Task 7 (test khoá R2); Task 9 (test `og:image`) |
| Màn xem trước, Web Share kèm file; không hỗ trợ thì "Lưu ảnh", "Sao chép link" | Task 10 (test lib, Chrome 390px/desktop) |
| Dán link vào Zalo, Messenger hiện ảnh vé | Task 9 (meta OG trỏ ảnh vé); Task 11 runbook. Thử thật **chờ S02** (staging có basic auth chặn crawler, xem runbook) |
| Ghi thư viện mới vào `docs/decisions.md` | Task 3 |

Ngoài phạm vi: vé của `/l/{shareId}` (S39), đếm `ticket_create`/`ticket_share`/`utm_source=ticket` (S41), xoá cache Cloudflare theo sự kiện, màn dead-letter queue.

## Global Constraints

- Node 24, pnpm 12.9.1; TypeScript strict, không `any`, không `@ts-ignore`, không nâng TypeScript lên 7.
- Ghim đúng bản (không `^`): `satori` **0.33.5** (22/9/2026; từ 2/10/2026 đã có hơn 50 bản mới nên không lấy bản mới nhất), `@resvg/resvg-js` **2.6.2**, `uqr` **0.1.3**. Thêm `@ranhduong/ui: workspace:*` vào API để đọc `tokens.css`. Web không thêm thư viện.
- Không dùng `createElement` của `satori/jsx`: hàm này luôn đặt `children` là mảng, nên Satori 0.33.5 báo lỗi "more than one child" kể cả khi chỉ có một chữ. Dùng helper `h()` riêng: không có con thì `children` là `undefined`, một con thì là chính con đó. `div` có hơn một con phải `display: 'flex'`; chữ cần cắt dòng dùng `display: 'block'` kèm `lineClamp`. Đã chạy thử: chữ có dấu ở cả ba font, `lineClamp`, viền nét đứt và QR `data:` URI đều đúng; một vé mất khoảng 120 ms.
- Màu vé đọc từ `packages/ui/src/tokens.css`, không ghi mã hex trong code vé. Màu nhấn là `City.accent`, chữ trên nền nhấn luôn là `--ink`.
- Font chỉ nằm ở `apps/api/assets/ticket/fonts/` và chỉ dùng cho vé; web vẫn tải Google Fonts.
- Endpoint và khoá R2 không chứa ObjectId: `GET /v1/cities/:city/itineraries/templates/:slug/ticket.png?format=story|og`, khoá `tickets/{hash}/{story|og}.png`, `hash` là 32 ký tự hex.
- Dữ liệu test và ảnh mẫu chỉ dùng tên có chữ "Giả Lập". Không bịa dữ liệu địa điểm thật.
- Chữ cố định (giọng Spec UI mục 3):
  - Vé: `VÉ LỊCH TRÌNH · {formatTripLength viết hoa}`, `Mình đi theo lịch này nè, bạn đi chung không?`, `+ {x} điểm`, `NGÀY {n}`, `Các điểm ghé đang được cập nhật`.
  - API 503: `Vé đang được in, thử lại sau vài giây nhé.`
  - Web: `Tạo vé để chia sẻ`, `Vé lịch trình`, `Gửi vé`, `Lưu ảnh`, `Sao chép link`, `Đóng`, `Thử lại`, `Đang in vé…`, `Vé đang được in, chờ vài giây rồi bấm Thử lại nhé.`, `Chưa tải được vé, có thể mạng đang chập chờn.`, `Đã chép link lịch trình.`, `Bạn chọn và chép đường dẫn bên dưới nhé.`, `Đã mở bảng chia sẻ.`, `Đã đóng bảng chia sẻ.`
- Web: vùng bấm tối thiểu 44px (nút thanh đáy 52px), thiết kế 390px trước, nút chỉ có biểu tượng có `aria-label`, tôn trọng `prefers-reduced-motion`, chỉ dùng biến trong `tokens.css` và class `rd-…` có sẵn.
- Nhánh `feat/S30-itinerary-ticket`; commit Conventional Commits có `S30`. Không đổi route công khai của web.

## Review Focus

1. **Hạ tầng vé lỗi khi crawler gọi OG** (Redis hoặc worker dừng, R2 lỗi): OG vẫn trả 200 ảnh mặc định `no-store`, không 500, để link dán vào Zalo vẫn có ảnh. Story trả 503 `Retry-After: 3` (Task 7 test "Redis/R2 lỗi"; Task 8 test header).
2. **Đổi `ticketKey` làm đổi `updatedAt`**: sitemap `lastmod` và thứ tự danh sách soạn mẫu bị đổi theo mỗi lần sinh vé. Swap dùng `timestamps: false`, và khoá cũ trùng khoá mới thì không xoá ảnh đang dùng (Task 6 và Task 7 test).
3. **Nội dung quay về bản đã từng sinh** (sửa mẫu rồi hoàn tác) hoặc job cùng hash đã failed: vẫn phải sinh lại được. Job xong thì xoá ngay (`removeOnComplete: true`); job failed thì `retry()` khi có request mới (Task 5 test hàng đợi).
4. **Nội dung xấu**: tiêu đề 200 ký tự có emoji, tên điểm dài, mẫu 5 ngày nhiều điểm, mẫu không còn điểm công khai. Vẫn ra PNG đúng kích thước, nhãn ngày không đẩy cuống vé ra ngoài ảnh (Task 2 test ngân sách dòng; Task 4 test và ảnh mẫu `story-dai.png`).
5. **Web Share bị huỷ, không nhận file, clipboard bị chặn**: không báo thành công giả; huỷ thì báo đã đóng; không nhận file thì hiện "Lưu ảnh" và "Sao chép link"; clipboard lỗi thì hiện ô link để chép tay; đóng màn xem trước thì thu hồi object URL (Task 10 test lib).

---

### Task 1: Hợp đồng vé trong contracts

**Files:**
- Create: `packages/contracts/src/ticket.ts`, `packages/contracts/src/ticket.test.ts`
- Modify: `packages/contracts/src/index.ts` (thêm `export * from './ticket.js';`)

**Interfaces:**
- Consumes: `HexColor`, `ObjectIdString` (`common.ts`), `TemplateTime` (`itinerary-admin.ts`), `TripDays`, `ItineraryTransport` (`itinerary.ts`).
- Produces:
  - `TicketFormat = z.enum(['story', 'og'])`, `TicketQuery = z.object({ format: TicketFormat })` (khoá lạ như `utm_source` bị bỏ).
  - `TICKET_SIZE: Record<TicketFormat, { width: number; height: number }>`, `TICKET_MAX_STOPS = 8`, `TICKET_OG_STOPS = 3`.
  - `TicketHash = z.string().regex(/^[0-9a-f]{32}$/)`.
  - `TicketStop = z.object({ day: 1..5, number: 1..20, start: TemplateTime, name: z.string().min(1).max(200) })`.
  - `TicketData = z.object({ cityName, title (1..200), days: TripDays, transport: ItineraryTransport, season (max 100, '' khi không có), accent: HexColor, stops: z.array(TicketStop).max(8), stopTotal: int ≥ 0, shortLink: string min 1, qrUrl: z.httpUrl() })`, refine `stopTotal >= stops.length`.
  - `TicketJob = z.object({ itineraryId: ObjectIdString, hash: TicketHash, data: TicketData })`. Kiểu TS cùng tên qua `z.infer`.

- [ ] **Step 1: Tạo nhánh**

```bash
git switch -c feat/S30-itinerary-ticket
```

- [ ] **Step 2: Viết test đỏ** `packages/contracts/src/ticket.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { TICKET_MAX_STOPS, TICKET_OG_STOPS, TICKET_SIZE, TicketData, TicketHash, TicketJob, TicketQuery } from './ticket.js';

const stop = (number: number, day = 1) => ({ day, number, start: '08:00', name: `Quán Giả Lập ${number}` });
const data = {
  cityName: 'Thành phố Giả Lập', title: 'Lịch trình Giả Lập', days: 2, transport: 'motorbike', season: '', accent: '#E9B824',
  stops: [stop(1), stop(2)], stopTotal: 2, shortLink: 'ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap',
  qrUrl: 'https://ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap?utm_source=ticket',
};

describe('S30 ticket contracts', () => {
  it('format bắt buộc, chỉ story hoặc og; bỏ tham số lạ', () => {
    expect(TicketQuery.parse({ format: 'story', utm_source: 'x' })).toEqual({ format: 'story' });
    for (const bad of [{}, { format: 'png' }]) expect(TicketQuery.safeParse(bad).success).toBe(false);
  });
  it('story 1080×1920, og 1200×630, tối đa 8 điểm, OG 3 điểm', () => {
    expect(TICKET_SIZE).toEqual({ story: { width: 1080, height: 1920 }, og: { width: 1200, height: 630 } });
    expect([TICKET_MAX_STOPS, TICKET_OG_STOPS]).toEqual([8, 3]);
  });
  it('hash là 32 ký tự hex thường', () => {
    expect(TicketHash.safeParse('a'.repeat(32)).success).toBe(true);
    for (const bad of ['A'.repeat(32), 'a'.repeat(31), '0123456789abcdef01234567']) expect(TicketHash.safeParse(bad).success).toBe(false);
  });
  it('TicketData chặn 9 điểm, stopTotal nhỏ hơn số điểm hiện và QR không phải http(s)', () => {
    expect(TicketData.safeParse(data).success).toBe(true);
    expect(TicketData.safeParse({ ...data, stops: Array.from({ length: 9 }, (_, i) => stop(i + 1)), stopTotal: 9 }).success).toBe(false);
    expect(TicketData.safeParse({ ...data, stopTotal: 1 }).success).toBe(false);
    expect(TicketData.safeParse({ ...data, qrUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
  it('TicketJob cần itineraryId dạng ObjectId và hash hợp lệ', () => {
    expect(TicketJob.safeParse({ itineraryId: '0123456789abcdef01234567', hash: 'b'.repeat(32), data }).success).toBe(true);
    expect(TicketJob.safeParse({ itineraryId: 'lich-trinh-gia-lap', hash: 'b'.repeat(32), data }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Chạy để thấy đỏ**

Run: `pnpm --filter @ranhduong/contracts exec vitest run src/ticket.test.ts`
Expected: FAIL, không tìm thấy `./ticket.js`.

- [ ] **Step 4: Viết `ticket.ts`** theo Interfaces, có comment một dòng trỏ Spec UI mục 9.

- [ ] **Step 5: Chạy lại, build contracts**

Run: `pnpm --filter @ranhduong/contracts exec vitest run src/ticket.test.ts` → PASS. Run: `pnpm turbo run build typecheck --filter=@ranhduong/contracts` → xanh.

- [ ] **Step 6: Commit** — `git add packages/contracts/src && git commit -m "feat: S30 add ticket contracts"`

---

### Task 2: Dữ liệu vé, cắt điểm và hash nội dung

**Files:**
- Create: `apps/api/src/modules/tickets/ticket-data.ts`, `apps/api/src/modules/tickets/ticket-data.test.ts`

**Interfaces:**
- Consumes: Task 1; `ItineraryTemplateDetail`, `formatTripLength` (contracts).
- Produces:
  - `TICKET_RENDER_VERSION = 1`. Đổi layout, nhãn hoặc bản thư viện thì tăng số này để mọi vé sinh lại.
  - `TICKET_STORY_ROWS = 10`: ngân sách dòng của story. Mỗi điểm tốn 1 dòng; với chuyến nhiều ngày, điểm đầu của mỗi ngày tốn thêm 1 dòng cho nhãn `NGÀY n`.
  - `interface TicketContext { cityName: string; citySlug: string; accent: string; siteUrl: string }`
  - `templateTicketData(detail: ItineraryTemplateDetail, ctx: TicketContext): TicketData`
  - `ticketRows(data: TicketData, format: TicketFormat): { stops: TicketStop[]; more: number; dayLabels: boolean }`: story lấy `data.stops`, `more = stopTotal - stops.length`, `dayLabels = days > 1`; og lấy 3 điểm đầu, `more = stopTotal - số điểm lấy`, `dayLabels = false`.
  - `ticketHash(data: TicketData): string`: sha256 của `JSON.stringify({ v: TICKET_RENDER_VERSION, data })`, lấy 32 ký tự hex đầu.
  - `ticketPrefix(hash) = 'tickets/{hash}'`, `ticketObjectKey(hash, format) = 'tickets/{hash}/{format}.png'`.

Quy tắc của `templateTicketData`:
- Duyệt mọi ngày, mọi điểm theo thứ tự; bỏ ô có `place === null`, đánh số lại 1, 2… trong từng ngày.
- `stopTotal` là số điểm công khai. `stops` cắt theo `TICKET_MAX_STOPS` và `TICKET_STORY_ROWS`, dừng ở điểm đầu tiên vượt một trong hai giới hạn.
- `path = /{citySlug}/lich-trinh/{slug}`. `qrUrl` dựng bằng `URL` từ `siteUrl` và `path`, đặt `utm_source=ticket`. `shortLink = url.host + url.pathname`.
- `season`, `transport`, `title` chép từ `detail`; `days` là `detail.days.length`. `cityName`, `accent` lấy từ `ctx`.

- [ ] **Step 1: Viết test đỏ** `ticket-data.test.ts`. Dựng `detail` bằng `ItineraryTemplateDetail.parse` từ object thường. Điểm giả có dạng `{ slug, name: 'Quán Giả Lập n', category: 'cafe', alsoCategories: [], unconfirmed: true }`, điểm đã ẩn là `place: null`. Các test:

```ts
it('QR tới trang mẫu có utm_source=ticket; đường dẫn rút gọn không có giao thức', () => {
  const data = templateTicketData(detail([[1, 2]]), ctx);
  expect(data.qrUrl).toBe('https://ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap?utm_source=ticket');
  expect(data.shortLink).toBe('ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap');
});
it('bỏ ô điểm không còn công khai và đánh số lại trong từng ngày', () => {
  const data = templateTicketData(detail([[1, null, 3], [4]]), ctx);
  expect(data.stops.map((s) => [s.day, s.number, s.name])).toEqual([[1, 1, 'Quán Giả Lập 1'], [1, 2, 'Quán Giả Lập 3'], [2, 1, 'Quán Giả Lập 4']]);
  expect(data.stopTotal).toBe(3);
});
it('chuyến một ngày: tối đa 8 điểm rồi + x điểm; OG 3 điểm', () => {
  const data = templateTicketData(detail([Array.from({ length: 12 }, (_, i) => i + 1)]), ctx);
  expect([data.stops.length, data.stopTotal]).toEqual([8, 12]);
  expect(ticketRows(data, 'story')).toMatchObject({ more: 4, dayLabels: false });
  expect(ticketRows(data, 'og')).toMatchObject({ more: 9 });
  expect(ticketRows(data, 'og').stops).toHaveLength(3);
});
it('nhãn ngày tính vào ngân sách 10 dòng', () => {
  const data = templateTicketData(detail([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]), ctx);
  expect(data.stops.map((s) => s.day)).toEqual([1, 1, 2, 2, 3, 3]);
  expect(ticketRows(data, 'story')).toMatchObject({ more: 4, dayLabels: true });
});
it('mẫu không còn điểm công khai vẫn có dữ liệu vé', () => {
  expect(templateTicketData(detail([[null]]), ctx)).toMatchObject({ stops: [], stopTotal: 0 });
});
it('hash ổn định, đổi theo tên điểm, giờ, tiêu đề, URL web; khoá không chứa ObjectId', () => {
  const base = ticketHash(templateTicketData(detail([[1, 2]]), ctx));
  expect(ticketHash(templateTicketData(detail([[1, 2]]), ctx))).toBe(base);
  expect(base).toMatch(/^[0-9a-f]{32}$/);
  for (const changed of [detail([[1, 3]]), detail([[1, 2]], { title: 'Lịch trình Giả Lập khác' })]) expect(ticketHash(templateTicketData(changed, ctx))).not.toBe(base);
  expect(ticketHash(templateTicketData(detail([[1, 2]]), { ...ctx, siteUrl: 'https://staging.ranhduong.vn' }))).not.toBe(base);
  expect(ticketObjectKey(base, 'og')).toBe(`tickets/${base}/og.png`);
});
```

Helper `detail(days: (number | null)[][], extra?)`: mỗi số `n` thành điểm `Quán Giả Lập n` giờ `08:00`; tham số thứ hai ghi đè trường của `ItineraryTemplateDetail`. Thêm một test đổi giờ `start` của một điểm thì hash đổi. `ctx = { cityName: 'Thành phố Giả Lập', citySlug: 'da-lat', accent: '#E9B824', siteUrl: 'https://ranhduong.vn' }`.

- [ ] **Step 2: Chạy để thấy đỏ** — `pnpm --filter @ranhduong/api exec vitest run src/modules/tickets/ticket-data.test.ts` → FAIL (module chưa có).

- [ ] **Step 3: Viết `ticket-data.ts`** theo Interfaces. Trả `TicketData.parse(...)` để dữ liệu ra luôn hợp lệ. Hash bằng `createHash('sha256')` của `node:crypto`.

- [ ] **Step 4: Chạy lại** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S30 build ticket data and content hash"`

---

### Task 3: Font, màu và ảnh mặc định cho vé

**Files:**
- Create: `apps/api/assets/ticket/fonts/{Lora-Bold,BeVietnamPro-Regular,BeVietnamPro-SemiBold,BeVietnamPro-Bold,PatrickHand-Regular}.ttf`, `apps/api/assets/ticket/fonts/{Lora,BeVietnamPro,PatrickHand}-OFL.txt`, `apps/api/assets/ticket/README.md`, `apps/api/assets/ticket/og-default.png` (sinh ra)
- Create: `apps/api/src/modules/tickets/ticket-assets.ts`, `apps/api/src/modules/tickets/ticket-assets.test.ts`
- Modify: `apps/api/package.json` (dependencies), `pnpm-lock.yaml`, `apps/web/scripts/generate-og-default.mjs`, `docs/decisions.md`

**Interfaces:**
- Produces:
  - `TICKET_ASSET_DIR = join(__dirname, '..', '..', '..', 'assets', 'ticket')`. `src/modules/tickets` và `dist/modules/tickets` cùng độ sâu nên đường dẫn đúng cả khi test lẫn khi chạy bản build.
  - `interface TicketColors { paper; paperRaised; ink; inkSoft; mist; line; note; accent: string }`
  - `readTokensCss(): string`: đọc `require.resolve('@ranhduong/ui/tokens.css')`.
  - `ticketColors(tokensCss: string, accent: string): TicketColors`: đọc `--paper`, `--paper-raised`, `--ink`, `--ink-soft`, `--mist`, `--line`, `--note`; thiếu token thì ném `Error('Thiếu token --{tên} trong tokens.css')`.
  - `loadTicketFonts(dir = join(TICKET_ASSET_DIR, 'fonts')): Font[]` (kiểu `Font` của satori): `Lora` 700, `Be Vietnam Pro` 400/600/700, `Patrick Hand` 400, `style: 'normal'`.
  - `readDefaultOg(): Buffer`: đọc `og-default.png`.

- [ ] **Step 1: Thêm thư viện**

```bash
pnpm --filter @ranhduong/api add satori@0.33.5 @resvg/resvg-js@2.6.2 uqr@0.1.3 --save-exact
pnpm --filter @ranhduong/api add "@ranhduong/ui@workspace:*"
```

Kiểm `apps/api/package.json` ghi đúng `0.33.5`, `2.6.2`, `0.1.3`, không có `^`.

- [ ] **Step 2: Tải font ghim theo commit** vào `apps/api/assets/ticket/fonts/`, rồi kiểm SHA-256 khớp bảng (`sha256sum *.ttf`):

| File | Nguồn | SHA-256 |
| --- | --- | --- |
| `Lora-Bold.ttf` | `https://raw.githubusercontent.com/cyrealtype/Lora-Cyrillic/2d53b449b60e185b39f671b44fded83e0910ad30/fonts/ttf/Lora-Bold.ttf` | `32baf740eac1bf3f257904a6cf89e4e067ca1566b375bf22f743a26fc88b3791` |
| `BeVietnamPro-Regular.ttf` | `https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/bevietnampro/BeVietnamPro-Regular.ttf` | `cd1ef6e9d7db28ad5cdb88a65ccbe693870e60d340b791f349d248342b4fe4c3` |
| `BeVietnamPro-SemiBold.ttf` | cùng thư mục, `BeVietnamPro-SemiBold.ttf` | `bd8e27eb02720b9d91e59e4f10a90878643219f25ce6a8d9a4f06a8a88d3bb71` |
| `BeVietnamPro-Bold.ttf` | cùng thư mục, `BeVietnamPro-Bold.ttf` | `7f738fe5c43c8872807b20e2d30d42163618de8a4daf7f48a939adac32c16847` |
| `PatrickHand-Regular.ttf` | `https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/patrickhand/PatrickHand-Regular.ttf` | `0f173b3e6cb6d1af25babf7f0057c5ac4ee11f9992b0469bb817e967ef4ad0fc` |

Giấy phép: `Lora-OFL.txt` lấy từ `…/Lora-Cyrillic/2d53b44…/OFL.txt`; `BeVietnamPro-OFL.txt`, `PatrickHand-OFL.txt` lấy từ `OFL.txt` cùng thư mục trên google/fonts. Lora trên google/fonts chỉ có bản variable, mà Satori không đọc variable font, nên lấy bản tĩnh từ repo gốc. `README.md` ghi: bảng nguồn và SHA-256, tên tác giả theo dòng Copyright của từng OFL, giấy phép SIL OFL 1.1, câu "Chỉ dùng cho vé lịch trình; web tải Google Fonts", và cách sinh lại `og-default.png`.

- [ ] **Step 3: Ảnh OG mặc định cho API.** Sửa `generate-og-default.mjs` để ghi cùng một PNG ra `apps/web/public/og-default.png` và `apps/api/assets/ticket/og-default.png`. Chạy `node apps/web/scripts/generate-og-default.mjs`. `git diff --stat apps/web/public/og-default.png` có thể không đổi.

- [ ] **Step 4: Viết test đỏ** `ticket-assets.test.ts`:

```ts
it('màu vé lấy đủ từ tokens.css, accent từ thành phố', () => {
  const colors = ticketColors(readTokensCss(), '#E9B824');
  for (const value of Object.values(colors)) expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  expect(colors.accent).toBe('#E9B824');
  expect(() => ticketColors(':root { --paper: #F7F2E8; }', '#E9B824')).toThrow(/--paper-raised/);
});
it('đủ 5 file font tĩnh, mỗi họ font kèm OFL, ảnh mặc định 1200×630', async () => {
  expect(loadTicketFonts().map((f) => `${f.name} ${f.weight}`)).toEqual(['Lora 700', 'Be Vietnam Pro 400', 'Be Vietnam Pro 600', 'Be Vietnam Pro 700', 'Patrick Hand 400']);
  for (const family of ['Lora', 'BeVietnamPro', 'PatrickHand']) expect(readFileSync(join(TICKET_ASSET_DIR, 'fonts', `${family}-OFL.txt`), 'utf8')).toContain('SIL OPEN FONT LICENSE');
  expect(await sharp(readDefaultOg()).metadata()).toMatchObject({ width: 1200, height: 630, format: 'png' });
});
```

- [ ] **Step 5: Chạy để thấy đỏ**, viết `ticket-assets.ts`, chạy lại → PASS. Run: `pnpm --filter @ranhduong/api exec vitest run src/modules/tickets/ticket-assets.test.ts`.

- [ ] **Step 6: Ghi `docs/decisions.md`** (ngày 2026-10-19), mỗi dòng một quyết định:
  - Vé dùng `satori` 0.33.5 (HTML sang SVG), `@resvg/resvg-js` 2.6.2 (SVG sang PNG, binary dựng sẵn cho Windows/Linux), `uqr` 0.1.3 (QR, MIT, không phụ thuộc); ghim đúng bản. Satori từ 2/10 ra hơn 50 bản. Nâng bản thì tăng `TICKET_RENDER_VERSION` và xem lại ảnh mẫu. Không dùng `satori/jsx`.
  - API phụ thuộc `@ranhduong/ui` để đọc màu vé từ `tokens.css`. Font vé nằm ở `apps/api/assets/ticket`; image Docker của S02 phải chép thư mục này.

- [ ] **Step 7: Commit** — `git add apps/api apps/web/scripts pnpm-lock.yaml docs/decisions.md && git commit -m "feat: S30 add ticket fonts, colors and default image"`

---

### Task 4: Dựng ảnh vé bằng Satori + resvg

**Files:**
- Create: `apps/api/src/modules/tickets/ticket-layout.ts`, `apps/api/src/modules/tickets/ticket-renderer.ts`, `apps/api/src/modules/tickets/ticket-renderer.test.ts`, `apps/api/src/seed/render-ticket-sample.ts`
- Modify: `apps/api/package.json` (script `"ticket:sample": "node dist/seed/render-ticket-sample.js"`)

**Interfaces:**
- Consumes: Task 1–3.
- Produces:
  - `ticket-layout.ts`: `interface TicketNode { type: string; props: { style?: CSSProperties; src?: string; width?: number; height?: number; children?: TicketChild | TicketChild[] } }`, `type TicketChild = TicketNode | string`. `CSSProperties` import type từ `satori/jsx`. Helper `h(type, props, ...children)` theo quy tắc ở Global Constraints. `ticketQrDataUri(url: string, colors: TicketColors): string` dùng `renderSVG(url, { ecc: 'M', border: 1, blackColor: colors.ink, whiteColor: colors.paperRaised })`, trả `data:image/svg+xml;base64,…`. `ticketElement(data: TicketData, format: TicketFormat, colors: TicketColors): TicketNode` lấy điểm qua `ticketRows`.
  - `ticket-renderer.ts`: `renderTicketPng(data, format, assets: { fonts: Font[]; tokensCss: string }, onMissingGlyph: (code: string, segment: string) => void): Promise<Buffer>`. Gọi `satori` với kích thước `TICKET_SIZE[format]` và `loadAdditionalAsset` gọi `onMissingGlyph` rồi trả `[]`. Sau đó `new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render().asPng()`.
  - `@Injectable() class TicketRenderer { render(data, format): Promise<Buffer>; defaultOg(): Buffer }`: font và tokens nạp ở lần `render` đầu, ảnh mặc định nạp ở lần `defaultOg` đầu, rồi giữ trong bộ nhớ. Nhờ vậy tiến trình API (chỉ gọi `defaultOg`) không nạp font. Thiếu glyph thì `Logger.warn` (mã ngôn ngữ và đoạn chữ), không ném lỗi.

Bố cục (px). Mọi màu lấy từ `TicketColors`; nét đứt là viền `dashed` 3px.

| Khối | Story 1080×1920 | OG 1200×630 |
| --- | --- | --- |
| Nền | `ink`, lề ngang 72, trên 88 | `ink`, lề 56 |
| Đầu | "Rành Đường" Lora 700 56 `paperRaised`; tên thành phố Be Vietnam Pro 600 30 `mist` | (nằm ở cột phải của thẻ) |
| Thẻ vé | `paperRaised`, bo 32, cách đầu 40 | `paperRaised`, bo 28, hàng ngang: cột trái co giãn, đường đứt dọc `line`, cột phải rộng 300 |
| Phần trên | lề 56/56/32; eyebrow Be Vietnam Pro 700 26 `inkSoft` giãn chữ 3; tiêu đề Lora 700 68 cao dòng 1.12, `lineClamp: 2`; chip cách 24: mùa (nền `accent`, chữ `ink`, chỉ khi có), phương tiện viết hoa chữ đầu (nền `mist`), Be Vietnam Pro 700 26, lề 8/20, bo tròn | cột trái lề 44: eyebrow 22; tiêu đề Lora 700 52 `lineClamp: 2` |
| Điểm | lề ngang 56; dòng 84: giờ Be Vietnam Pro 600 28 `inkSoft` rộng 104; vòng 48 nền `ink` số `paperRaised` (điểm cuối chuyến nền `accent` số `ink`, chỉ khi `more === 0`); tên Be Vietnam Pro 700 34 `ink` một dòng `textOverflow: ellipsis`; nét đứt dọc giữa hai vòng liền nhau cùng ngày; nhãn `NGÀY n` cao 44, 24 `inkSoft`; dòng `+ x điểm` 28 `inkSoft`; không có điểm thì câu "Các điểm ghé đang được cập nhật" | 3 dòng cao 50: giờ 24, vòng 34, tên 28; `+ x điểm` 24 |
| Răng cưa | cao 72: hai hình tròn 72 màu `ink` lòi nửa ra ngoài mép trái, phải; giữa là nét đứt ngang `line` | — |
| Cuống | lề 24/56/56, hàng: trái co giãn gồm câu viết tay Patrick Hand 42 `ink` cao dòng 1.25, đường dẫn rút gọn Be Vietnam Pro 600 24 `inkSoft` cách 20, `wordBreak: 'break-all'`; phải QR 232 trên `paperRaised`, viền 2 `line`, bo 16, lề 12 | cột phải lề 40: "Rành Đường" Lora 700 40 `ink`, tên thành phố 24 `inkSoft`, chân cột là host của `shortLink` 22 `inkSoft`. OG không có QR |

- [ ] **Step 1: Viết test đỏ** `ticket-renderer.test.ts`. Khai báo đầu file: `assets = { fonts: loadTicketFonts(), tokensCss: readTokensCss() }`, `colors = ticketColors(assets.tokensCss, '#E9B824')`, `data` là `TicketData` giả giống `data` ở test Task 1 (2 ngày, 2 điểm, mùa rỗng). Kiểm kích thước bằng `sharp(...).metadata()`:

```ts
const vietnamese = { ...data, title: 'Đường đèo Giả Lập: ngắm mây ở đồi chè, ăn bánh căn', stops: [{ day: 1, number: 1, start: '05:00', name: 'Đồi Giả Lập ưa nhìn' }], stopTotal: 1 };
it.each(['story', 'og'] as const)('%s: PNG đúng kích thước, chữ có dấu không thiếu glyph', async (format) => {
  const missing = vi.fn();
  const png = await renderTicketPng(vietnamese, format, assets, missing);
  expect(await sharp(png).metadata()).toMatchObject({ format: 'png', ...TICKET_SIZE[format] });
  expect(missing).not.toHaveBeenCalled();
});
it('tiêu đề 200 ký tự có emoji, 8 điểm tên dài, 5 ngày, mẫu rỗng vẫn ra PNG', async () => {
  const missing = vi.fn();
  for (const sample of [longFiveDays, { ...data, stops: [], stopTotal: 0 }]) {
    expect((await sharp(await renderTicketPng(sample, 'story', assets, missing)).metadata()).height).toBe(1920);
  }
  for (const [code] of missing.mock.calls) expect(code).toBe('emoji');
});
it('QR là SVG dùng màu ink/paperRaised', () => {
  const svg = Buffer.from(ticketQrDataUri(data.qrUrl, colors).split(',')[1]!, 'base64').toString();
  expect(svg).toContain(colors.ink);
});
```

`longFiveDays` dựng bằng `templateTicketData` từ một `ItineraryTemplateDetail` 5 ngày × 3 điểm, tiêu đề `'Lịch trình Giả Lập '.repeat(10).slice(0, 199) + '🌼'`, tên điểm dài 120 ký tự.

- [ ] **Step 2: Chạy để thấy đỏ** — `pnpm --filter @ranhduong/api exec vitest run src/modules/tickets/ticket-renderer.test.ts` → FAIL.

- [ ] **Step 3: Viết `ticket-layout.ts` và `ticket-renderer.ts`** theo Interfaces và bảng bố cục. `import satori, { type Font } from 'satori'`; `index.d.ts` của satori import kiểu `react` (repo không có) nên `ReactNode` thành kiểu bất kỳ dưới `skipLibCheck`; truyền thẳng `TicketNode`, không ép kiểu `any`.

- [ ] **Step 4: Chạy lại** → PASS.

- [ ] **Step 5: CLI ảnh mẫu** `render-ticket-sample.ts`: đọc `--out <thư mục>` bằng `node:util` `parseArgs`, rồi ghi `story.png`, `og.png` (2 ngày, 5 điểm, có mùa) và `story-dai.png` (`longFiveDays`). Toàn bộ dữ liệu "Giả Lập", `siteUrl` `https://ranhduong.vn`. Chạy:

```bash
pnpm --filter @ranhduong/api build && pnpm --filter @ranhduong/api ticket:sample --out "<scratchpad>/ticket-sample"
```

Expected: ba file PNG. Lệnh này cũng kiểm `TICKET_ASSET_DIR` đúng khi chạy từ `dist`. Mở từng ảnh xem bằng mắt: đủ dấu, không chữ tràn, cuống vé và QR nằm trong ảnh, điểm cuối màu nhấn, OG đọc được ở cỡ thu nhỏ. Lệch thì chỉnh số ở bảng bố cục rồi chạy lại.

- [ ] **Step 6: Commit** — `git commit -m "feat: S30 render ticket images with satori and resvg"`

---

### Task 5: Lưu ảnh vé trên R2 và hàng đợi job

**Files:**
- Create: `apps/api/src/shared/storage/r2-client.ts`, `apps/api/src/shared/redis/queue-connection.ts`
- Create: `apps/api/src/modules/tickets/ticket.storage.ts`, `ticket.storage.test.ts`, `ticket.queue.ts`, `ticket.queue.test.ts`
- Modify: `apps/api/src/modules/media/media.storage.ts`, `media.queue.ts`, `media.processor.ts`, `media.processor.test.ts` (chỉ đổi import)

**Interfaces:**
- Produces:
  - `createR2Client(env: Env): S3Client`: chuyển nguyên cấu hình client từ `MediaStorage` sang; `MediaStorage` gọi hàm này.
  - `queueRedisOptions(url: string)`: chuyển nguyên `mediaRedisOptions` sang; media dùng tên mới.
  - `@Injectable() class TicketStorage implements OnApplicationShutdown`:
    - `read(key): Promise<Buffer | null>`: lỗi `NoSuchKey` hoặc 404 trả `null`; ảnh từ 5 MB trở lên ném lỗi.
    - `write(key, body): Promise<void>`: ghi `R2_BUCKET`, `ContentType: 'image/png'`, `CacheControl: 'public, max-age=31536000, immutable'`.
    - `remove(keys: string[]): Promise<void>`.
  - `TICKET_QUEUE = 'itinerary-ticket'`, token `TICKET_QUEUE_PREFIX` (mặc định `'bull'`), `@Injectable() class TicketQueue`:
    - `request(job: TicketJob): Promise<void>`: jobId `ticket-{hash}`. Job đang failed thì `retry()`; đang chờ hoặc đang chạy thì không làm gì; chưa có thì `add('itinerary.ticket', job, { jobId, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: { age: 7 * 86400 } })`.

- [ ] **Step 1: Viết test đỏ.** `ticket.storage.test.ts` dùng server HTTP giả như `media.storage.test.ts`, ghi lại method, đường dẫn và header của từng request:
  - GET trả 404 kèm `<Error><Code>NoSuchKey</Code></Error>` thì `read` ra `null`; GET 200 thì ra đúng bytes.
  - `write('tickets/{hash}/og.png', …)` PUT vào `/ranhduong-media/tickets/{hash}/og.png` với `content-type: image/png` và `cache-control` có `immutable`.
  - `remove` gửi một DELETE cho mỗi khoá.

  `ticket.queue.test.ts` dùng Redis thật với prefix ngẫu nhiên và `Queue` để kiểm:
  - Gọi `request` hai lần cùng hash thì chỉ có 1 job đang chờ, `opts.attempts` là 3.
  - Job bị `Worker` test ném `UnrecoverableError` thành failed; gọi `request` lần nữa thì job về `waiting`.
  - Hai hash khác nhau thành hai job.

- [ ] **Step 2: Chạy để thấy đỏ** — `pnpm infra:up`, rồi `pnpm --filter @ranhduong/api exec vitest run src/modules/tickets/ticket.storage.test.ts src/modules/tickets/ticket.queue.test.ts` → FAIL.

- [ ] **Step 3: Viết code** theo Interfaces và đổi import trong media.

- [ ] **Step 4: Chạy lại test vé và test media** — `pnpm --filter @ranhduong/api exec vitest run src/modules/tickets src/modules/media` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: S30 add ticket storage and queue"`

---

### Task 6: `ticketKey` và nguồn dữ liệu vé trong module lịch trình

**Files:**
- Modify: `apps/api/src/modules/itineraries/schemas/itinerary.schema.ts`, `itineraries.repository.ts`, `itineraries.service.ts`
- Test: `apps/api/src/modules/itineraries/itineraries.repository.test.ts`, `apps/api/src/modules/itineraries/template-detail.http.test.ts`

**Interfaces:**
- Produces:
  - Schema thêm `ticketKey: { type: String }` (không trả ra API công khai).
  - `ItinerariesRepository.publishedTemplate` trả kiểu có `_id: Types.ObjectId`.
  - `ItinerariesRepository.swapTicketKey(id: string, key: string): Promise<string | undefined>`: gọi `findOneAndUpdate({ _id, ticketKey: { $ne: key } }, { $set: { ticketKey: key } }, { returnDocument: 'before', projection: { ticketKey: 1 }, timestamps: false })`, trả `ticketKey` cũ. Trả `undefined` khi khoá đã trùng, chưa có khoá cũ hoặc không có bản ghi.
  - `ItinerariesService.templateTicketSource(citySlug, slug): Promise<{ id: string; detail: ItineraryTemplateDetail }>`: tách phần thân `templateDetail` thành hàm riêng `loadTemplate`; `templateDetail` gọi lại hàm đó. Lỗi 404 giữ như cũ.
  - `ItinerariesService.swapTicketKey(id, key)` gọi thẳng repository.

- [ ] **Step 1: Viết test đỏ.**
  - Repository: chèn mẫu có `ticketKey: 'tickets/' + 'a'.repeat(32)` và `updatedAt` cố định, rồi `swapTicketKey(id, 'tickets/' + 'b'.repeat(32))`. Kết quả là khoá `a…`, document có khoá `b…`, `updatedAt` không đổi. Gọi lại cùng khoá `b…` thì trả `undefined`. Mẫu chưa có khoá thì trả `undefined` và đặt khoá.
  - HTTP test S16: `t.app.get(ItinerariesService).templateTicketSource('thanh-pho-gia-lap', 'lich-trinh-gia-lap')` trả `id` bằng `_id` đã chèn và `detail` bằng body của GET chi tiết. Mẫu `draft` thì reject với status 404. Body GET chi tiết không chứa `ticketKey`.

- [ ] **Step 2: Chạy để thấy đỏ** — `pnpm --filter @ranhduong/api exec vitest run src/modules/itineraries` → FAIL ở các test mới.

- [ ] **Step 3: Viết code** theo Interfaces.

- [ ] **Step 4: Chạy lại** cả thư mục `itineraries` → PASS, test S15, S16 cũ vẫn xanh.

- [ ] **Step 5: Commit** — `git commit -m "feat: S30 track ticket key on itineraries"`

---

### Task 7: `TicketsService`: phục vụ ảnh và sinh vé

**Files:**
- Create: `apps/api/src/modules/tickets/tickets.service.ts`, `apps/api/src/modules/tickets/tickets.service.test.ts`
- Modify: `apps/api/src/config/env.ts`, `apps/api/src/config/env.test.ts`, `.env.example`

**Interfaces:**
- Consumes: `CitiesService.getPublic`, `ItinerariesService.templateTicketSource` và `swapTicketKey` (Task 6), `TicketStorage`, `TicketQueue` (Task 5), `TicketRenderer` (Task 4), hàm của Task 2.
- Produces:
  - Env `SITE_URL: httpUrl('http://localhost:3100')`, comment: "URL web khách cho QR và đường dẫn trên vé (S30); production https://ranhduong.vn, staging https://staging.ranhduong.vn". Thêm vào `.env.example` ở khối API.
  - `type TicketImage = { status: 'ready'; body: Buffer } | { status: 'fallback'; body: Buffer } | { status: 'pending' }`
  - Token `TICKET_WAIT` (tuỳ chọn, mặc định `{ og: 4000, story: 8000, pollMs: 250 }`).
  - `class InvalidTicketJob extends Error`.
  - `TicketsService.templateTicket(citySlug, slug, format): Promise<TicketImage>`: lấy `getPublic` và `templateTicketSource`, dựng `TicketData` với `siteUrl: env.SITE_URL`, rồi gọi `ensure`. Lỗi 404 từ hai service đi thẳng ra ngoài.
  - `TicketsService.ensure(itineraryId, data, format): Promise<TicketImage>` (S39 dùng lại). Các bước:
    1. Đọc `ticketObjectKey(hash, format)`; có thì `ready`.
    2. Không có thì `queue.request({ itineraryId, hash, data })` và đọc lại mỗi `pollMs` tới hạn chờ của format.
    3. Hết hạn, hoặc storage/queue ném lỗi (ghi `Logger.warn`): OG trả `{ status: 'fallback', body: renderer.defaultOg() }`, story trả `pending`.
  - `TicketsService.generate(job: TicketJob): Promise<void>`. Các bước:
    1. `ticketHash(job.data) !== job.hash` thì ném `InvalidTicketJob`.
    2. Chưa có đủ hai ảnh thì dựng cả story và OG rồi `write`.
    3. `previous = swapTicketKey(itineraryId, ticketPrefix(hash))`.
    4. `previous` có giá trị và khác khoá mới thì `remove([previous/story.png, previous/og.png])`.

- [ ] **Step 1: Viết test đỏ** `env.test.ts`: `SITE_URL` mặc định `http://localhost:3100`; `https://ranhduong.vn/` thành `https://ranhduong.vn`.

- [ ] **Step 2: Viết test đỏ** `tickets.service.test.ts`, khởi tạo `new TicketsService(testEnv({ SITE_URL: 'https://ranhduong.vn' }), cities, itineraries, storage, queue, renderer, { og: 40, story: 40, pollMs: 5 })`. Dùng fake: storage là `Map` có `read`, `write`, `remove`; queue và renderer là `vi.fn`; `getPublic` trả `{ name: 'Thành phố Giả Lập', accent: '#E9B824', … }`. Các test:
  - `ảnh đã có: ready, không xếp job` (tính khoá bằng `ticketHash(templateTicketData(detail, ctx))`).
  - `chưa có: xếp đúng một TicketJob có itineraryId, hash, qrUrl chứa utm_source=ticket, rồi trả ready khi worker giả ghi ảnh sau 10ms`.
  - `hết giờ chờ: og fallback với ảnh mặc định, story pending`.
  - `Redis hoặc R2 lỗi: og fallback, story pending, không ném` (queue reject; storage.read reject).
  - `404 từ lịch trình đi thẳng ra ngoài`.
  - `generate dựng story và og, ghi đúng khoá, đổi ticketKey và xoá hai ảnh cũ`.
  - `generate khi đã có đủ hai ảnh thì không dựng lại, vẫn đổi ticketKey`.
  - `generate không xoá khi swap trả undefined`.
  - `generate từ chối job sai hash bằng InvalidTicketJob`.
  - `mọi khoá ghi khớp /^tickets\/[0-9a-f]{32}\/(story|og)\.png$/ và không chứa itineraryId`.

- [ ] **Step 3: Chạy để thấy đỏ** — `pnpm --filter @ranhduong/api exec vitest run src/config/env.test.ts src/modules/tickets/tickets.service.test.ts` → FAIL.

- [ ] **Step 4: Viết code** theo Interfaces. Inject các phụ thuộc như `MediaService`: `@Inject(Class)` với kiểu `Pick<…>` để test truyền fake được.

- [ ] **Step 5: Chạy lại** → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat: S30 serve and generate itinerary tickets"`

---

### Task 8: Endpoint, module, processor và worker

**Files:**
- Create: `apps/api/src/modules/tickets/tickets.controller.ts`, `tickets.module.ts`, `ticket.processor.ts`, `tickets.http.test.ts`, `ticket.processor.test.ts`
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/worker.ts`

**Interfaces:**
- Produces:
  - `@Controller('cities/:city/itineraries/templates/:slug') TicketsController`, `@Get('ticket.png')`. Validate `city`, `slug` bằng `ZodValidationPipe(Slug)`, query bằng `ZodValidationPipe(TicketQuery)`. Dùng `@Res()` thường, không passthrough, vì phải tự đặt status 503 mà không đi qua filter ghi log lỗi:
    - `ready`: 200, `Content-Type: image/png`, `Cache-Control: public, max-age=3600`, body là bytes.
    - `fallback`: 200 `image/png`, `Cache-Control: no-store`.
    - `pending`: 503, `Cache-Control: no-store`, `Retry-After: 3`, JSON `{ code: 'INTERNAL_ERROR', message: 'Vé đang được in, thử lại sau vài giây nhé.' }`.
    - Lỗi ném ra (404, 400) vẫn qua `ApiExceptionFilter`.
  - `TicketsModule`: imports `CitiesModule`, `ItinerariesModule`; controller `TicketsController`; providers `TicketsService`, `TicketStorage`, `TicketQueue`, `TicketRenderer`; exports `TicketsService`.
  - `TicketProcessor` (chỉ chạy trong worker): `Worker(TICKET_QUEUE, …, { concurrency: 1, prefix, connection: { ...queueRedisOptions(env.REDIS_URL), maxRetriesPerRequest: null } })`. Parse job bằng `TicketJob`; lỗi Zod hoặc `InvalidTicketJob` đổi thành `UnrecoverableError`. Đóng worker khi shutdown.
  - `AppModule` import `TicketsModule`. `WorkerModule` import thêm `TicketsModule`, provider thêm `TicketProcessor`.

- [ ] **Step 1: Viết test đỏ** `tickets.http.test.ts`, dựng module như `admin-media.http.test.ts`: `ConfigModule.register(testEnv({ WEB_ORIGINS: 'http://web.gia-lap.example' }))`, controller thật, `TicketsService` giả, `configureApp`. Các test:
  - `ready`: kiểm 200, header và đúng bytes.
  - `fallback`: kiểm `no-store`.
  - `pending`: kiểm 503, `retry-after: 3` và body JSON.
  - `format=png` hoặc thiếu format: 400 `VALIDATION_FAILED`.
  - Slug `bad_slug`: 400.
  - Service ném 404: 404 `NOT_FOUND`.
  - Request có `Origin: http://web.gia-lap.example` nhận `access-control-allow-origin` đúng nguồn.

  `ticket.processor.test.ts` theo mẫu `media.processor.test.ts`, dùng Redis thật và `TicketsService` giả:
  - Job hợp lệ gọi `generate` một lần với job đã parse.
  - Payload sai (`hash: 'x'`) thành failed sau 1 lần thử, không gọi `generate`.
  - `generate` lỗi tạm thời hai lần thì thành công ở lần thứ 3.

- [ ] **Step 2: Chạy để thấy đỏ** — `pnpm --filter @ranhduong/api exec vitest run src/modules/tickets` → FAIL ở test mới.

- [ ] **Step 3: Viết code** theo Interfaces và nối `AppModule`, `worker.ts`.

- [ ] **Step 4: Chạy toàn bộ API** — `pnpm --filter @ranhduong/api test && pnpm --filter @ranhduong/api typecheck && pnpm --filter @ranhduong/api lint && pnpm --filter @ranhduong/api build` → xanh.

- [ ] **Step 5: Commit** — `git commit -m "feat: S30 expose template ticket endpoint and worker job"`

---

### Task 9: Web SSR: `og:image` là vé, ghi nguồn font

**Files:**
- Create: `apps/web/app/entities/itinerary/lib/ticket-url.ts`, `ticket-url.test.ts`
- Modify: `apps/web/app/pages/[city]/lich-trinh/[template].vue`, `apps/web/app/pages/ghi-nguon.vue`, `apps/web/tests/listing-ssr.test.ts`

**Interfaces:**
- Produces:
  - `templateTicketUrl(apiBase: string, citySlug: string, slug: string, format: TicketFormat): string` trả `{apiBase bỏ / cuối}/cities/{city}/itineraries/templates/{slug}/ticket.png?format={format}`.
  - `ticketFileName(slug: string): string` trả `ve-lich-trinh-{slug}.png`.
  - Trang mẫu: `image` của `usePageSeo` là `templateTicketUrl(useRuntimeConfig().public.apiBase, citySlug, slug, 'og')` khi có dữ liệu và không lỗi, ngược lại `undefined` (về `/og-default.png`). Dùng `public.apiBase`, không dùng `useApiBase()` vì SSR có thể trả địa chỉ nội bộ. Bỏ ảnh bìa làm OG của trang mẫu (`photoOgUrl`, `cover`).
  - `/ghi-nguon` thêm `<section id="font-ve">` "Font trên vé lịch trình", liệt kê từng font với tác giả theo dòng Copyright của OFL và link tới nguồn:
    - Lora: The Lora Project Authors (Cyreal).
    - Be Vietnam Pro: The Be Vietnam Pro Project Authors.
    - Patrick Hand: Patrick Wagesreiter.
    - Một link chung `https://openfontlicense.org` "SIL Open Font License 1.1".
    - Một câu: "Ba font này chỉ dùng để in vé lịch trình dạng ảnh; chữ trên web tải từ Google Fonts."

- [ ] **Step 1: Viết test đỏ** `ticket-url.test.ts`: `templateTicketUrl('https://api.ranhduong.vn/v1/', 'da-lat', 'lich-trinh-gia-lap', 'og')` bằng `'https://api.ranhduong.vn/v1/cities/da-lat/itineraries/templates/lich-trinh-gia-lap/ticket.png?format=og'`; `ticketFileName('lich-trinh-gia-lap')` bằng `'ve-lich-trinh-lich-trinh-gia-lap.png'`.

- [ ] **Step 2: Viết test SSR đỏ** trong `listing-ssr.test.ts`. Đưa `apiBase` ra biến cấp file như `base`.
  - `/da-lat/lich-trinh/lich-trinh-gia-lap`: `og:image` và `twitter:image` bằng `${apiBase}/cities/da-lat/itineraries/templates/lich-trinh-gia-lap/ticket.png?format=og`. HTML có link `href="${apiBase}/…/ticket.png?format=story"` với chữ `Tạo vé để chia sẻ` (Task 10 thêm link này; test viết ngay ở đây). Không có chuỗi `0123456789abcdef01234567` trong thẻ `og:image`.
  - Khi `templateFailed`: `og:image` là `https://ranhduong.vn/og-default.png`.
  - `/ghi-nguon` có `id="font-ve"`, `Lora`, `Be Vietnam Pro`, `Patrick Hand`, `SIL Open Font License`.

- [ ] **Step 3: Chạy để thấy đỏ** — `pnpm --filter @ranhduong/web exec vitest run app/entities/itinerary/lib/ticket-url.test.ts` → FAIL. Test SSR chạy ở Task 10 Step 6, sau khi có nút.

- [ ] **Step 4: Viết code** theo Interfaces.

- [ ] **Step 5: Chạy lại unit test web** → PASS. Run: `pnpm --filter @ranhduong/web typecheck`.

- [ ] **Step 6: Commit** — `git commit -m "feat: S30 use ticket as itinerary og image and credit fonts"`

---

### Task 10: Màn xem trước vé và nút "Tạo vé để chia sẻ"

**Files:**
- Create: `apps/web/app/features/itinerary-ticket/lib/ticket.ts`, `ticket.test.ts`, `apps/web/app/features/itinerary-ticket/ui/RdTicketPreview.vue`
- Modify: `apps/web/app/features/itinerary-share/ui/RdItineraryShare.vue` (thêm `<slot />` sau `__buttons`), `apps/web/app/widgets/itinerary-detail/ui/RdItineraryDetail.vue`, `apps/web/app/widgets/itinerary-detail/ui/RdItineraryActionBar.vue`, `apps/web/app/pages/[city]/lich-trinh/[template].vue` (truyền `:ticket="{ url: templateTicketUrl(publicApiBase, citySlug, slug, 'story'), fileName: ticketFileName(slug) }"`)

**Interfaces:**
- Produces (`lib/ticket.ts`, hàm thuần, môi trường truyền vào để test):
  - `TICKET_SHARE_TEXT = 'Mình đi theo lịch này nè, bạn đi chung không?'`
  - `type TicketLoad = { status: 'ready'; blob: Blob } | { status: 'pending' } | { status: 'failed' }`
  - `loadTicket(url: string, fetcher: (url: string) => Promise<Response>): Promise<TicketLoad>`: 200 và `content-type` bắt đầu bằng `image/png` thì `ready`; 503 thì `pending`; mã khác hoặc lỗi mạng thì `failed`.
  - `interface TicketShareEnv { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> }`
  - `canShareTicket(file: File, env): boolean`: có cả `share` lẫn `canShare({ files: [file] })` trả `true`; lỗi thì `false`.
  - `shareTicket(file, { title, url }, env): Promise<'shared' | 'cancelled' | 'failed'>`: gửi `{ files: [file], title, text: `${TICKET_SHARE_TEXT} ${url}` }`; `AbortError` thì `cancelled`.
  - `copyTicketLink(url, copy?: (text: string) => Promise<void>): Promise<'copied' | 'manual'>`.
- `RdTicketPreview.vue`, props `{ open: boolean; url: string; fileName: string; title: string; shareUrl: string }`, emit `update:open`:
  - `<dialog>`, `showModal()` khi `open` thành `true`; Esc và nút `Đóng` (biểu tượng, `aria-label="Đóng"`) thì emit `false`.
  - Mở thì `loadTicket(url, (u) => fetch(u))`. Đang tải hiện khung `rd-skeleton` tỉ lệ 9:16, dòng `Đang in vé…`; `rd-skeleton` đã có nhịp mờ, giảm chuyển động thì tắt nhịp mờ.
  - `ready`: tạo `File([blob], fileName, { type: 'image/png' })` và object URL; `<img alt="Vé lịch trình {title}">` cao tối đa `min(64dvh, 720px)`.
  - `canShareTicket` đúng thì nút chính `Gửi vé`. Sai thì `<a class="rd-btn rd-btn--outline" :href="objectUrl" :download="fileName">Lưu ảnh</a>` và nút `Sao chép link`; chép lỗi thì hiện ô `readonly` chứa `shareUrl`, focus thì chọn hết.
  - `pending` hoặc `failed` thì hiện câu tương ứng ở Global Constraints và nút `Thử lại`.
  - Dòng trạng thái `role="status" aria-live="polite"`. Đóng hoặc unmount thì `URL.revokeObjectURL`.
  - Trên 390px dialog rộng `calc(100% - 2 * var(--space-4))`, tối đa 480px, nút xếp dọc cao 52px. Nền mờ `::backdrop` là `color-mix(in srgb, var(--ink) 50%, transparent)`.
- `RdItineraryDetail.vue`: prop tuỳ chọn `ticket?: { url: string; fileName: string }`, state `ticketOpen`. Có `ticket` thì làm hai việc:
  - Trong slot của `RdItineraryShare`, render `<a class="rd-btn rd-btn--dashed" :href="ticket.url" @click.prevent="ticketOpen = true">Tạo vé để chia sẻ</a>`. Link nằm trong SSR; khi chưa có JavaScript thì mở thẳng ảnh story.
  - Render `RdTicketPreview` và truyền `:ticket="true"` cho cả hai `RdItineraryActionBar`.
- `RdItineraryActionBar.vue`: prop `ticket: boolean`, emit `ticket`. Nút tròn 52px nằm giữa nút Chia sẻ và nút Chỉ đường, `aria-label="Tạo vé để chia sẻ"`, viền `var(--border-strong) dashed var(--ink)`, biểu tượng vé SVG `aria-hidden`.

- [ ] **Step 1: Viết test đỏ** `ticket.test.ts`. Môi trường Node có sẵn `Response`, `Blob`, `File`:

```ts
const file = new File(['x'], 've.png', { type: 'image/png' });
const data = { title: 'Lịch trình Giả Lập', url: 'https://ranhduong.vn/da-lat/lich-trinh/gia-lap' };
it('loadTicket: 200 PNG là ready, 503 là pending, lỗi khác hoặc mạng là failed', async () => {
  const png = new Response(new Blob([new Uint8Array([137, 80])]), { status: 200, headers: { 'content-type': 'image/png' } });
  expect((await loadTicket('u', async () => png)).status).toBe('ready');
  expect((await loadTicket('u', async () => new Response('{}', { status: 503 }))).status).toBe('pending');
  expect((await loadTicket('u', async () => new Response('{}', { status: 404 }))).status).toBe('failed');
  expect((await loadTicket('u', async () => { throw new TypeError('mạng'); })).status).toBe('failed');
});
it('chỉ coi là gửi được file khi có share và canShare nhận file', () => {
  expect(canShareTicket(file, {})).toBe(false);
  expect(canShareTicket(file, { share: async () => {}, canShare: () => false })).toBe(false);
  expect(canShareTicket(file, { share: async () => {}, canShare: () => { throw new Error('x'); } })).toBe(false);
  expect(canShareTicket(file, { share: async () => {}, canShare: () => true })).toBe(true);
});
it('shareTicket gửi file kèm câu rủ và link; huỷ không báo thành công', async () => {
  const share = vi.fn(async () => {});
  expect(await shareTicket(file, data, { share })).toBe('shared');
  expect(share).toHaveBeenCalledWith({ files: [file], title: 'Lịch trình Giả Lập', text: 'Mình đi theo lịch này nè, bạn đi chung không? https://ranhduong.vn/da-lat/lich-trinh/gia-lap' });
  expect(await shareTicket(file, data, { share: async () => { throw new DOMException('x', 'AbortError'); } })).toBe('cancelled');
  expect(await shareTicket(file, data, { share: async () => { throw new Error('x'); } })).toBe('failed');
});
it('copyTicketLink: không có clipboard hoặc bị chặn thì manual', async () => {
  expect(await copyTicketLink('u')).toBe('manual');
  expect(await copyTicketLink('u', async () => { throw new Error('chặn'); })).toBe('manual');
  expect(await copyTicketLink('u', async () => {})).toBe('copied');
});
```

- [ ] **Step 2: Chạy để thấy đỏ** — `pnpm --filter @ranhduong/web exec vitest run app/features/itinerary-ticket` → FAIL.

- [ ] **Step 3: Viết `lib/ticket.ts`**, chạy lại → PASS.

- [ ] **Step 4: Viết `RdTicketPreview.vue` và sửa widget, thanh đáy, slot** theo Interfaces. Cuộn tới mục chia sẻ của nút Chia sẻ cũ giữ nguyên.

- [ ] **Step 5: Lint, typecheck, test web** — `pnpm --filter @ranhduong/web lint && pnpm --filter @ranhduong/web typecheck && pnpm --filter @ranhduong/web test` → xanh.

- [ ] **Step 6: Build và chạy SSR test** — `pnpm turbo run build --filter=@ranhduong/web && pnpm --filter @ranhduong/web test:ssr` → test S30 ở Task 9 xanh, các test SSR cũ vẫn xanh.

- [ ] **Step 7: Thử trên Chrome** với API, worker, MinIO thật (`pnpm infra:up`, `pnpm --filter @ranhduong/api media:setup:local`, `pnpm dev`, `pnpm --filter @ranhduong/api dev:worker`) và một mẫu đã publish trong DB local. Chưa có mẫu thì tạo trong admin `/lich-trinh`, hoặc chèn thẳng vào MongoDB local bằng script tạm trong scratchpad; chỉ dùng địa điểm và mẫu tên "Giả Lập". Ở 390px dùng giả lập thiết bị qua CDP vì headless Chrome trên Windows kẹp tối thiểu 500px; sau đó thử desktop 1280px:
  - Nút nét đứt trong "Rủ bạn đi cùng" và nút tròn ở thanh đáy đều mở dialog.
  - Lần đầu thấy khung chờ rồi ra ảnh vé.
  - Chrome desktop hỗ trợ `canShare` file nên có `Gửi vé`; giả lập `navigator.canShare = undefined` thì có `Lưu ảnh` (tải về đúng tên file) và `Sao chép link`.
  - Esc đóng dialog và focus về nút đã mở.
  - Bật giả lập `prefers-reduced-motion: reduce` thì khung chờ không nhấp nháy.
  - Tắt worker: sau 8 giây hiện câu chờ và `Thử lại`; bật lại worker và bấm `Thử lại` thì ra ảnh.
  - Console không có lỗi.

- [ ] **Step 8: Commit** — `git commit -m "feat: S30 add ticket preview and share actions"`

---

### Task 11: Tài liệu, kiểm toàn bộ và trạng thái

**Files:**
- Create: `docs/runbooks/itinerary-ticket.md`
- Modify: `docs/decisions.md`, `docs/technical-design.md` (mục 6 dòng endpoint vé), `docs/backlog-slice-2.md` (cột Trạng thái S30), `CLAUDE.md` (mục Trạng thái, thêm dòng S30 lên đầu)

- [ ] **Step 1: Kiểm toàn repo** — `pnpm turbo run lint typecheck test build && pnpm --filter @ranhduong/web test:ssr`. Expected: mọi task xanh; ghi số test từng package vào runbook.

- [ ] **Step 2: Kiểm endpoint chạy thật** (cùng môi trường Task 10 Step 7), với `curl -s -D - -o og.png "http://localhost:3101/v1/cities/da-lat/itineraries/templates/<slug>/ticket.png?format=og"`:
  - Lần đầu: `200`, `cache-control: public, max-age=3600` (worker kịp trong 4 giây).
  - Dừng worker và sửa tiêu đề mẫu (trong admin hoặc cập nhật thẳng DB local): `200 no-store` ảnh mặc định; `format=story` trả `503` có `retry-after: 3`.
  - Bật lại worker: ra vé mới.
  - Mở PNG xem bằng mắt.

- [ ] **Step 3: Kiểm ảnh cũ bị xoá** — liệt kê `tickets/` trong bucket MinIO trước và sau khi sửa mẫu (S3 `ListObjectsV2` qua node script tạm trong scratchpad hoặc giao diện MinIO :9001). Chỉ còn thư mục hash mới. `updatedAt` của mẫu chỉ đổi do lần sửa, không đổi do sinh vé.

- [ ] **Step 4: Quét QR** trên `story.png` bằng điện thoại thật: mở đúng `…/lich-trinh/<slug>?utm_source=ticket` (với `SITE_URL` local thì là `http://localhost:3100/...`).

- [ ] **Step 5: Viết runbook** `docs/runbooks/itinerary-ticket.md`:
  - Luồng sinh vé, endpoint, header cache, ảnh mặc định, 503.
  - Biến `SITE_URL` cho API theo môi trường.
  - Thư mục `apps/api/assets/ticket` phải có trong image Docker (S02).
  - Font, nguồn và giấy phép; `TICKET_RENDER_VERSION`; `ticket:sample`.
  - Kiểm link preview:
    - Facebook Sharing Debugger "Scrape Again" sau khi sửa mẫu, vì Facebook giữ ảnh theo URL. URL ảnh không đổi theo nội dung, CDN giữ tối đa 1 giờ.
    - Zalo: dán link vào chat.
    - Staging có basic auth chặn crawler, nên thử preview cần mở riêng đường dẫn trang mẫu và `/v1/.../ticket.png` khỏi basic auth, hoặc thử trên production.
  - Lỗi thường gặp và cách xử lý.
  - Kết quả kiểm đã chạy, các việc chờ: S02, Zalo/Messenger thật, Android/iPhone, Sentry 24 giờ, S39, S41.

- [ ] **Step 6: Cập nhật tài liệu.**
  - `docs/decisions.md`: các dòng `SITE_URL` cho QR và đường dẫn rút gọn; khoá R2 `tickets/{hash}/{format}.png`; API chờ OG 4 giây và story 8 giây bằng đọc lại R2, OG lỗi thì ảnh mặc định `no-store`, story 503 `Retry-After`; không thêm `?v=` vào URL ảnh; màu nhấn vé là `City.accent`.
  - `technical-design.md` mục 6: thêm "story chưa xong trả 503 kèm `Retry-After`".
  - `backlog-slice-2.md`: S30 thành "Code xong trên `feat/S30-itinerary-ticket`…; chờ S02, Zalo/Messenger thật, điện thoại thật".
  - `CLAUDE.md` mục Trạng thái: một dòng S30 cùng giọng các dòng S2x.

- [ ] **Step 7: Commit** — `git add docs CLAUDE.md && git commit -m "docs: S30 add ticket runbook and record status"`

- [ ] **Step 8: Review độc lập** toàn nhánh (`superpowers:requesting-code-review`) theo Review Focus, sửa phát hiện bằng test đỏ trước, rồi chạy lại Step 1.
