# CLAUDE.md

Hướng dẫn cho người và AI làm việc trong repo này. Đọc hết trước khi sửa code.

## Tổng quan

**Rành Đường** (`ranhduong.vn`) là cẩm nang số Đà Lạt trên web: bản đồ địa điểm được curate và xác minh với chủ quán, lịch trình theo cụm khu vực, sau này thêm đóng góp cộng đồng, tích điểm, voucher và gói cho chủ quán.
Một người làm part-time. Lát 1 (bản đồ, trang địa điểm, danh sách curate, 5 lịch trình mẫu, SEO, công cụ nhập liệu) phải ra mắt trước 15/11/2026.
Kiến trúc: monorepo pnpm + Turborepo; web Nuxt 4 SSR, admin Vue 3 SPA, API NestJS + MongoDB; mọi dữ liệu có `cityId` để mở thành phố mới chỉ bằng dữ liệu.

## Cấu trúc

```text
apps/web            Nuxt 4 SSR, chỉ web khách, tổ chức theo FSD trong app/
apps/admin          Vue 3 + Vite SPA quản trị, FSD trong src/, deploy Cloudflare Pages (admin.ranhduong.vn)
apps/api            NestJS 12, prefix /v1, Mongoose
packages/contracts  Zod: enum, schema, parser giờ mở cửa (dùng chung web, API, script)
packages/geo        Chuẩn hoá tên, slug, khoảng cách, Jaro-Winkler
packages/ui         Design token CSS (tokens.css)
packages/config     tsconfig và cấu hình ESLint (eslint.mjs) dùng chung
docs/               Nhật ký quyết định
```

## Lệnh

Cài đặt lần đầu (Node 24 theo `.nvmrc`, tối thiểu 22.19; pnpm 12.9.1 qua corepack):

```bash
nvm use && corepack enable && pnpm install
cp .env.example apps/api/.env      # API dev nạp file này qua --env-file; sửa giá trị nếu cần
pnpm infra:up                      # MongoDB, Redis, MinIO (docker compose); tắt: pnpm infra:down
```

Lệnh gốc (`package.json`):

```bash
pnpm install
pnpm infra:up                         # MongoDB, Redis, MinIO (docker compose)
pnpm dev                              # chạy web (:3100), admin (:5174), API (:3101)
pnpm seed                             # tạo/cập nhật thành phố Đà Lạt và 4 cụm (chạy lại không trùng)
pnpm turbo run lint typecheck test build   # phải xanh trước khi commit
pnpm --filter @ranhduong/geo test        # test một package
```

## Quy ước chung

- Code, tên biến, tên file: tiếng Anh. Chữ hiển thị cho người dùng: tiếng Việt theo giọng văn ở Spec UI mục 3. Comment viết tiếng Việt cũng được.
- Mọi kiểu dữ liệu đi qua API, form hoặc import đặt trong `packages/contracts` bằng Zod; API validate input bằng schema đó, không định nghĩa lại ở chỗ khác.
- Toạ độ lưu dạng GeoJSON `[lng, lat]`. Thời gian lưu UTC, hiển thị theo `Asia/Ho_Chi_Minh`. Giờ mở cửa dạng `HH:mm`, ngày 0 = Chủ nhật; đọc chuỗi giờ bằng `parseOpeningHours`.
- Slug không dấu bằng `slugify` trong `packages/geo`.
- Mọi document nghiệp vụ có `cityId`.
- Thao tác có giới hạn số lượng (voucher, suất quà, điểm) dùng `findOneAndUpdate` có điều kiện hoặc transaction, không đọc rồi ghi.
- Không thêm thư viện mới khi chưa cần; nếu thêm, ghi một dòng vào `docs/decisions.md`. Không tự nâng TypeScript lên 7.

## Web (Nuxt, FSD)

- Lớp trong `apps/web/app/`: `pages` (route Nuxt) → `widgets` → `features` → `entities` → `shared`. Chỉ import từ lớp thấp hơn; không import ngang giữa hai slice cùng lớp.
- Không hard-code màu, font, bo góc: dùng biến trong `packages/ui/src/tokens.css`. Component Vue đặt tên `Rd…` và dùng đúng class `rd-…` của design system. Màu nhấn `--accent` luôn đi với chữ `--ink`, không dùng chữ trắng trên nền nhấn.
- Vùng bấm tối thiểu 44×44px; dùng đúng thẻ `<button>`, `<a href>`, `<label>`; nút chỉ có biểu tượng phải có `aria-label`.
- Thiết kế cho màn 390px trước. Tôn trọng `prefers-reduced-motion`.
- Trang công khai render SSR; `/l/**` không index.

## Quy trình với Superpowers

- **Story đã có trong `docs/backlog.md` (lát 1) hoặc `docs/backlog-slice-2.md` (lát 2)**: bỏ qua brainstorming, dùng `superpowers:writing-plans` ngay. Trước khi viết plan, đọc story, tiêu chí nghiệm thu, các mục liên quan theo bản đồ tài liệu và các ADR liên quan. Plan phải ghi rõ tiêu chí nghiệm thu nào được kiểm ở bước nào.
- **Ý tưởng mới, thay đổi hướng, hoặc việc không có trong backlog**: bắt đầu bằng `superpowers:brainstorming`. Nếu kết quả đổi quyết định kiến trúc thì áp dụng mục "Nguồn chuẩn" ở trên trước khi viết plan.
- Nhánh: `feat/S05-place-form`. Commit theo Conventional Commits (`feat:`, `fix:`, `chore:`…), có ID story, ví dụ `feat: S05 add place form`.
- Story xong khi đạt definition of done ở backlog mục 6: đạt tiêu chí nghiệm thu, CI xanh, đã thử trên staging và trên điện thoại thật, logic có điều kiện có unit test.

## Vùng TDD

**Bắt buộc TDD** (viết test trước, thấy test đỏ, rồi mới viết code):
- `apps/api`: domain logic, service, validation (schema Zod, guard, policy, chuyển trạng thái).
- Logic lịch trình (lọc, chấm điểm, sắp tuyến, xếp giờ, kiểm tra lỗi khi soạn lịch trình mẫu).
- Điểm thưởng, check-in, quà, voucher, kể cả trường hợp chạy đồng thời.
- Logic có điều kiện trong `packages/contracts` và `packages/geo` (giờ mở cửa, slug, chống trùng) cũng phải có unit test theo definition of done.
- `apps/api` test bằng Vitest (`pnpm --filter @ranhduong/api test`); test tích hợp cần MongoDB (`pnpm infra:up`), mỗi file test lấy database riêng qua `src/testing/mongo.ts`.

**Không ép TDD**: trang hiển thị nội dung, styling, layout theo design system. Kiểm tra bằng typecheck, lint và xem trên trình duyệt ở 390px trước, rồi desktop.

## Nguyên tắc cứng

- **TypeScript strict** ở mọi package. Không tắt `strict`, `noUncheckedIndexedAccess`, và không dùng `any` hay `@ts-ignore` để lách lỗi kiểu.
- **Không bao giờ tự bịa dữ liệu thực tế về địa điểm**: giờ mở cửa, giá, địa chỉ, số điện thoại, toạ độ, ảnh. Dữ liệu thật chỉ đến từ quy trình trong `docs/data-collection.md`. Seed và test chỉ dùng dữ liệu giả có tên rõ là giả. Thiếu dữ liệu thì để trống và hỏi.
- **Tuân thủ điều khoản Google Places** ([ADR 0001](docs/decisions/0001-google-places-place-id-only.md)): chỉ lưu `place_id`, chỉ đường bằng URL Google Maps; không lưu hay cache giờ mở cửa, rating, review, ảnh, toạ độ của Google; không dùng Google Maps JS.
- Không viết code scrape Facebook, Google Maps hay trang khác. Ảnh phải có `source`, `credit`, `license`. `verifySource` là `owner` khi quán đã xác nhận, `admin` khi chỉ dựa trên Facebook hoặc là điểm công cộng.
- **SEO là ưu tiên** ([ADR 0010](docs/decisions/0010-stable-public-urls-and-slugs.md)): URL slug ổn định, sinh bằng `slugify`; **không đổi hay xoá route công khai khi chưa hỏi**; đổi slug thì lưu `slugHistory` và trả 301. Trang công khai render SSR; `/l/**` không index.

## Quy ước

- Code, tên biến, tên file bằng tiếng Anh. Chữ hiển thị cho người dùng bằng tiếng Việt, theo giọng văn ở Spec UI mục 3. Comment tiếng Việt được.
- Mọi kiểu dữ liệu đi qua API, form, import hoặc sự kiện đặt trong `packages/contracts` bằng Zod; API validate input bằng đúng schema đó, không định nghĩa lại ở nơi khác ([ADR 0011](docs/decisions/0011-shared-zod-contracts.md)).
- Toạ độ lưu GeoJSON `[lng, lat]`. Thời gian lưu UTC, hiển thị theo `Asia/Ho_Chi_Minh`. Giờ mở cửa dạng `HH:mm`, ngày 0 = Chủ nhật; đọc chuỗi giờ bằng `parseOpeningHours`.
- Mọi document nghiệp vụ có `cityId`. Thao tác có giới hạn số lượng (voucher, suất quà, điểm) dùng `findOneAndUpdate` có điều kiện hoặc transaction, không đọc rồi ghi ([ADR 0006](docs/decisions/0006-point-ledger-and-atomic-limits.md)).
- API: biến môi trường đọc qua `loadEnv()` (Zod), không đọc `process.env` rải rác. Lỗi trả `{ code, message, details? }` với mã lỗi ở technical-design mục 6. CORS có `credentials` chỉ cho các nguồn trong `WEB_ORIGINS`; request ghi dữ liệu kiểm `Origin` theo cùng danh sách.
- Web và admin: không hard-code màu, font, bo góc, chỉ dùng biến trong `packages/ui/src/tokens.css`. Component Vue đặt tên `Rd…` và dùng đúng class `rd-…` của design system. `--accent` luôn đi với chữ `--ink`, không dùng chữ trắng trên nền nhấn.
- Vùng bấm tối thiểu 44×44px; dùng đúng thẻ `<button>`, `<a href>`, `<label>`; nút chỉ có biểu tượng phải có `aria-label`. Thiết kế cho 390px trước. Tôn trọng `prefers-reduced-motion`.
- Admin gọi API qua `src/shared/api/client.ts` (ofetch, `credentials: 'include'`); không có code admin trong `apps/web`.

## Trạng thái

- S37 code xong trong workspace: `POST /v1/cities/:city/itineraries`, `GET /v1/itineraries/:shareId`, gid UUID v4/HttpOnly/1 năm và `canEdit`; giới hạn trượt nguyên tử 10/giờ/gid + 60/giờ/IP dùng chung bộ giới hạn với S18. Snapshot địa điểm 10 phút, xoá ngay khi repository ghi; planner S34–S35 chạy mỗi lần, vị trí nơi ở làm tròn 0,005° trước xếp tuyến/lưu. ShareId base62 20 ký tự unique, version/key/detours đã lưu; DTO công khai chung che nơi ở/quyền sở hữu/khoá vé và điểm không còn active. Quyền riêng tư/lastmod đã cập nhật. 20 task workspace, 612 test API, 85 SSR đạt; review độc lập không có vấn đề quan trọng. Runbook `docs/runbooks/guest-itineraries.md`; chưa kiểm trực quan (phiên không có browser), CI remote, staging, điện thoại thật hoặc Sentry 24 giờ. Copy/HTML/ảnh vé khách ở S39, sửa/tối ưu ở S40/S42 dùng lại DTO này.

- S36 đã triển khai và hợp nhất vào `main` (commit triển khai `1125268`): admin `/do-phu-lich-trinh` và GET chỉ đọc có AdminGuard chạy S34–S35 cho 420 tổ hợp (1–5 ngày, 2 nhịp, 7 ngày khởi hành, 5 gu riêng lẻ + mặc định); chọn ngày/phương tiện/nhóm, lỗi thiếu điểm/bữa theo ngày/cụm, số điểm đủ dữ liệu theo cụm/danh mục chính-phụ; không lưu lịch trình. Snapshot active, mẫu published và lượt xem 30 ngày có số hôm nay; review độc lập đã sửa điểm đã ẩn làm lệch trọng số. 20 task workspace, 84 SSR, Chrome 390px/desktop đạt; ổn định test S30 dùng thời hạn thật bằng đồng hồ giả, không đổi service vé. Runbook `docs/runbooks/itinerary-coverage.md`; chờ CI remote, dữ liệu thật/staging, điện thoại thật và Sentry 24 giờ.

- S35 đã triển khai trên `main`: hàm thuần `generateItinerary` ở `apps/api/src/modules/itineraries/planner/` chạy S34 rồi từng ngày sắp tuyến (nearest neighbor + 2-opt, ghim bình minh 04:45/buổi tối, nơi ở chỉ để sắp tuyến), xếp giờ bằng `scheduleDay` trong contracts (tách từ `analyzeTemplate`, S15 không đổi), chờ quán mở, đổi/bỏ điểm sai giờ, chèn bữa trong `MEAL_WINDOWS` theo phút thêm vào tuyến rồi mức giá của ngày (`ItineraryPlace.priceLevel`), tiện đường dưới 10 phút, kết thúc trước 21:30, chiều mưa ưu tiên mái che; gợi ý thiếu điểm chạy thử cả quy trình, mẫu S35 làm thiếu thì tạo từ đầu. p95 16,7 ms với 200 điểm giả; 20 task workspace, 84 SSR và review độc lập (đã sửa 5 lỗi) đạt. Đã nối vào endpoint báo cáo S36; API tạo/đọc của khách thuộc S37. Runbook `docs/runbooks/itinerary-route-schedule.md`; chờ CI remote.

- S34 code xong trên `feat/S34-itinerary-place-selection`: `Zone.adjacentZones` trong contracts/seed (Đà Lạt cấm Bắc–Đông, `CitySeed` kiểm đối xứng), `CitiesService.itineraryZones`; hàm thuần `planItinerary` ở `apps/api/src/modules/itineraries/planner/` lọc ứng viên theo ngày, chấm điểm (gu chỉ cộng, mái che ngày mưa theo `City.seasons`), mẫu gần nhất chỉ thay điểm không hợp, tạo từ đầu bằng vét cạn tổ hợp cụm (4 ngày đầu không lặp cụm, ngày 5 thong thả), `NOT_ENOUGH_PLACES` kèm gợi ý đã chạy thử. Chưa có endpoint (S36/S37). 20 task workspace, 84 SSR đạt. Runbook `docs/runbooks/itinerary-place-selection.md`; chờ CI remote và `pnpm seed` lại để ghi bảng kề.

- S33 code xong trên `feat/S33-itinerary-data-reminders`: danh sách admin nhắc thiếu thời lượng, thời điểm đẹp, cụm, quá hạn/chưa xác minh và sắp tới hạn (7 ngày trước mốc 90 ngày); lọc từng nhắc, giữ URL và số đếm tab, bảng/thẻ điện thoại, không chặn kích hoạt. Contracts/API truyền hai trường mới, dữ liệu cũ vẫn đọc được; 20 task workspace, 84 SSR, Chrome 390px/desktop và review độc lập đạt. Runbook `docs/runbooks/itinerary-data-reminders.md`; chờ CI remote, staging, điện thoại thật và Sentry 24 giờ.

- S32 code xong trong workspace: admin lịch trình có chip Gu tối đa 3 và Đi cùng ai, contracts dùng enum S31, lưu riêng `params.tags`/`params.with` khỏi `style`; mở/lưu mẫu cũ và khôi phục nháp cũ/mới, bỏ chọn không suy lại từ phong cách; preview điện thoại/Google giữ nguyên. 20 task workspace, 84 SSR, Chrome 390px/desktop và review độc lập đạt. Runbook `docs/runbooks/template-trip-preferences.md`; chờ CI remote, staging, điện thoại thật và Sentry 24 giờ.

- S31 code xong trong workspace: `TripWith`/`TripInterest`, bảng gu/thẻ/thời điểm đẹp, nhãn tiếng Việt, `MEAL_WINDOWS` dùng chung S15; `ItineraryRequest` kiểm ngày Việt Nam tại mỗi lần parse, factory `createItineraryRequestSchema(City.mapBounds)` kiểm nơi ở; `ItineraryNarrative` có cấu trúc và chống trùng ngày/key. Không thêm dependency; 591 test contracts, 20 task workspace và 84 SSR đạt; review độc lập không có lỗi cần sửa. Runbook `docs/runbooks/trip-contracts.md`; chờ CI remote và nghiệm thu triển khai.

- S30 code xong trên `feat/S30-itinerary-ticket`: module `tickets` dựng vé story 1080×1920/OG 1200×630 bằng Satori 0.33.5 + resvg trong worker, font Lora/Be Vietnam Pro/Patrick Hand ở `apps/api/assets/ticket` (OFL, ghi ở `/ghi-nguon`), QR `utm_source=ticket` theo `SITE_URL`, tối đa 8 điểm và nhãn ngày; R2 `tickets/{hash}`, `ticketKey` không đổi `updatedAt`, xoá ảnh cũ; API chờ 4 giây (OG, hết giờ thì ảnh mặc định no-store) và 8 giây (story, hết giờ thì 503 Retry-After). Trang mẫu dùng vé làm `og:image`, nút nét đứt và màn xem trước Web Share kèm file/Lưu ảnh/Sao chép link. 20 task workspace, 84 SSR, chạy thật với worker/S3 local, Chrome 390px/desktop đạt. Runbook `docs/runbooks/itinerary-ticket.md`; chờ S02, Zalo/Messenger thật, điện thoại thật và Sentry 24 giờ.

- S26 code xong trên `feat/S26-admin-pages`: `build:pages` bắt buộc biến `VITE_*` và sinh `_headers` (CSP theo origin, noindex) bằng `apps/admin/build/pages.ts`; bỏ `_redirects` (fallback SPA của Pages); router tải lại một lần khi chunk lỗi; CI `deploy-admin` qua wrangler 4.148.0 đã khoá, chưa đặt `ADMIN_PAGES_PROJECT` thì bỏ qua; API chặn `WEB_ORIGINS` sai. Đã thử `wrangler pages dev` và Chrome 390px/desktop, chưa thử upload. Runbook `docs/runbooks/admin-pages.md`; chờ dự án Pages/token/GitHub environments, S02, Access, staging, điện thoại thật và Sentry 24 giờ.

- S21 code xong: admin `/import` 3 bước, tải mẫu `apps/admin/public/samples/dia-diem-mau.csv`, parser CSV dùng schema form hiện tại/6 danh mục/website và indoor cũ; bảng lỗi có cách sửa/nghi trùng, tạo nháp và retry giữ file. API preview/commit riêng, kiểm lại trước ghi, unique khoá nguồn theo city chống CSV chạy đồng thời/nhập lại sau sửa. Runbook `docs/runbooks/csv-import.md`; chờ CI remote, staging, điện thoại thật và Sentry 24 giờ.

- S28 giai đoạn 1 code xong trên `feat/S28-admin-ux`: khung trang admin (thanh bên từ 1280px, ngăn trượt), component dùng chung `apps/admin/src/shared/ui` với luật lint chặn import tầng trên; danh sách địa điểm cột Còn thiếu/Cập nhật, ô Xếp, Xoá bộ lọc, thẻ điện thoại, nhớ bộ lọc và vị trí cuộn; form địa điểm hai cột, cột phụ xác minh/đổi trạng thái, Bỏ thay đổi, chặn rời trang; lịch trình hai cột, hàng điểm gọn, thanh lưu dính, hỏi lại khi công khai/chuyển nháp. Runbook `docs/runbooks/admin-ux.md`; chờ kiểm trình duyệt có phiên admin, CI remote, staging và điện thoại thật.

- S25 code xong trên `feat/S25-ui-motion`: timeline cuộn tới một lần/mốc 400ms/nét nối 600ms/stagger 500ms/hàng đợi, hai bản đồ ghim rơi 700ms trên child, banner mùa 4s sau cuộn/pause ngoài viewport-tab ẩn, live reduced motion về trạng thái cuối. 20 task workspace, 107 test web, 75 SSR và Chrome 390px/desktop/focus/không JS/hai map đạt; review độc lập sạch. Runbook `docs/runbooks/ui-motion.md` ghi bản sửa fixture S24 SSR sát biên 1ms; chờ CI remote, staging, điện thoại thật và Sentry 24 giờ.

- S24 code xong trên `feat/S24-weather-rain-mode`: chủ dự án chốt WeatherAPI Free thay Open-Meteo/WMO; key server-only, cache Redis riêng tối đa 15 phút/tuổi quan sát 30 phút, timeout 3 giây, null khi lỗi. Tile SSR/source/disclaimer/expiry; home no-store giữ dữ liệu mới. Rain URL chọn sẵn chip mái che full/partial, lọc trước pagination và form GET giữ danh mục/chip. 20 task workspace, 75 SSR và Chrome 390px/desktop/bản đồ/không JS/expiry xanh; review độc lập sạch. Runbook `docs/runbooks/weather-rain-mode.md`; chờ API key/dữ liệu thật, CI remote, staging, điện thoại thật và Sentry 24 giờ.

- S23 code xong trên `feat/S23-seasonal-ui`: admin `/mua` chỉnh mùa/lịch trình nổi bật, CAS theo updatedAt và khôi phục input; `/now` cache Redis/HTTP 15 phút tới nửa đêm, ưu tiên hoa và khoảng MM-DD qua năm mới; web SSR áp dụng --accent theo route, banner SVG/giảm chuyển động và promotion không trùng. 20 task workspace, 69 test SSR, Chrome 390px/desktop/chuyển trang/expiry/retry/401 recovery xanh; review độc lập đã kiểm và sửa lỗi bỏ lời nhắc khôi phục xoá bản nhập mới. Runbook `docs/runbooks/seasonal-ui.md`; chờ CI remote, staging, ngày mùa/lịch trình thật, điện thoại thật và Sentry 24 giờ.

- S22 code xong trên `feat/S22-notebook-map`: style Positron xuất qua Maputnik theo Spec UI §6, JSON/sprite sáu danh mục 1x/2x trong repo, HTML ghim chọn +25% và rơi 700ms/giảm chuyển động; nền lịch trình dùng chung. Normalize sprite URL theo domain, giữ lỗi tải/retry, cluster/lazy/maxBounds/nguồn và ghi nguồn thiết kế. 20 task workspace, 82 test web/64 SSR, Chrome 390px/desktop/retina/URL override/lỗi sprite và review xanh sau bản sửa. Runbook `docs/runbooks/notebook-map.md`; chờ commit/PR, CI remote, staging (S02), điện thoại thật và Sentry 24 giờ.

- S20 code xong: ba trang SSR tĩnh `/dieu-khoan`, `/quyen-rieng-tu`, `/ghi-nguon` và footer chung; SEO/sitemap, nội dung quyền riêng tư theo S18, email liên hệ runtime, nguồn ảnh mở sẵn và OSM cạnh hai bản đồ. Consent trên trang pháp lý nằm trong luồng trang, kể cả URL có `/` cuối. 20 task workspace, kiểm lại web, 64 test SSR, Chrome 390px/desktop/tắt JavaScript và review độc lập xanh. Runbook `docs/runbooks/legal-pages.md`; chờ email liên hệ thật, CI remote, deploy/staging (S02), điện thoại thật và Sentry 24 giờ.

- S18 code xong trên `feat/S18-tracking-reports`: `POST /events` lô tối đa 20, giới hạn 120/phút trượt qua nửa đêm, Redis chống trùng lượt xem với salt ngày; cron API 00:15/catch-up ghi `place_metrics` idempotent. Admin `/bao-cao` xem tuần thứ Hai–Chủ nhật với số liệu live. Umami mặc định opt-in, bỏ query/referrer/PII, thu hồi giữa tab/DNT/staging; nút tuỳ chọn cuối trang không che liên hệ mobile. 20 task workspace, 59 test SSR, Chrome 390px/desktop và review/hồi quy xanh. Runbook `docs/runbooks/tracking-reports.md`; chờ CI remote, instance Umami thật, deploy/staging/proxy allowlist, điện thoại thật và Sentry 24 giờ.

- S17 code xong trên `feat/S17-technical-seo`: metadata/OG/canonical SSR, JSON-LD địa điểm/curate/TouristTrip/breadcrumbs, sitemap index và lastmod thực qua service DTO, robots và runtime staging noindex/Search Console token. Worker tạo OG 1200×630, PNG mặc định và CLI backfill ảnh cũ. 20 task workspace và 59 test SSR xanh, review độc lập/test hồi quy đã sửa; runbook `docs/runbooks/technical-seo.md`. Chờ CI remote, backfill nếu có, deploy/staging, Search Console thật, điện thoại thật và Sentry 24 giờ.

- S16 code xong trong working tree: trang SSR `/da-lat/lich-trinh/{slug}` đọc mẫu S15, timeline theo ngày, bản đồ ghim số lazy và chọn/focus hai chiều, chỉ đường từng điểm; chia sẻ Zalo/Messenger qua bảng chia sẻ thiết bị, copy/chép tay fallback. API chỉ đọc published/public đúng thành phố, giữ ô điểm không còn active mà không lộ ghi chú, kiểm mẫu cũ hỏng; SWR 1 ngày và 404/503 no-store. 20 task workspace, 45 test SSR và Chrome 390px/desktop xanh; review/hồi quy đã sửa; runbook `docs/runbooks/public-itinerary.md`. Chờ commit/PR, CI remote, staging, chia sẻ Android/iPhone thật và Sentry 24 giờ.
- Xong: S01 (khung monorepo, CI, health check, trang `/da-lat` tạm), khung `apps/admin` cho S26, S03 (schema City/Zone/Place, `pnpm seed` Đà Lạt; chờ thử trên staging sau S02, ranh giới cụm chờ chủ dự án duyệt), S04 (đăng nhập admin bằng Google: OAuth PKCE phía API, phiên Redis, `AdminGuard`, `OriginGuard`, trang `/dang-nhap`; runbook `docs/runbooks/admin-login.md`; chờ cấu hình Cloudflare Access và thử staging), S05 (form địa điểm `/dia-diem/:id` trong admin: ghim MapLibre, bảng giờ kèm ô dán mẫu Sheet, cảnh báo nghi trùng, nguồn xác nhận, lưu nháp trên máy, kích hoạt có điều kiện; route `/v1/admin/...` trong `AdminModule`; chờ thử staging và điện thoại thật), S27 (danh mục phụ `alsoCategories` tối đa 2 và mức mái che `cover` thay `indoor`; lọc, thẻ, tìm, form admin; chờ thử staging), S07 (danh sách `/dia-diem` trong admin: tab trạng thái có số đếm, tìm, lọc, xếp; Đã xác minh, ẩn, hiện lại, đã đóng cửa, mở lại, xoá hẳn nháp; chờ thử staging).
- Tiếp theo: S02 hạ tầng (`ranhduong.vn`, `api.ranhduong.vn`, `media.ranhduong.vn`).
- Lát 2: backlog `docs/backlog-slice-2.md` (S29–S47) đã duyệt 19/10/2026. S29 (tài liệu khớp quyết định, ADR 0014) đã xong trên `docs/S29-slice-2-backlog`; story tiếp theo S30, các story code bắt đầu sau khi ra mắt lát 1 (16/11).
- S14 code xong trên `feat/S14-curated-lists`: admin `/danh-sach` tạo/sửa tiêu đề, mô tả, chọn và đổi thứ tự địa điểm, nháp/công khai, giữ bản đang soạn và khôi phục sau hết phiên; API/module curated-lists, slug ổn định/chống trùng đồng thời. Trang SSR `/da-lat/top/{slug}` và liên kết trang chủ, chỉ hiện active theo thứ tự. 20 task workspace, 37 test SSR và Chrome 390px/desktop xanh; review độc lập đã kiểm/sửa Enter công khai ngoài ý muốn. Runbook `docs/runbooks/curated-lists.md`; chờ PR, CI remote, staging, điện thoại thật và Sentry 24 giờ.
- S15 code xong trong working tree main: admin `/lich-trinh` soạn 1–5 ngày, kéo thả/nút đổi thứ tự/chuyển ngày, ghi chú/mô tả/metadata, giữ giờ sửa tay/tự tính giờ, xem trước điện thoại/Google. API kiểm lỗi/nhắc theo UI §12 trước công khai, bảo vệ tham chiếu nháp với lease Redis, chuẩn hoá mẫu cũ; local recovery giữ input nhập dở và chặn rời trang khi storage lỗi. Runbook `docs/runbooks/template-editor.md`; chờ commit/PR, CI remote, staging, điện thoại thật và Sentry 24 giờ. Trang khách đầy đủ thuộc S16.
- S13 code xong trên `feat/S13-place-search`: tìm không dấu theo tên/tên khác, danh mục chính/phụ và thẻ; gợi ý trên trang chủ/trang kết quả với debounce, huỷ request cũ, combobox/bàn phím/chạm, bộ gõ tiếng Việt và retry. Giữ form GET/SSR, no-store/noindex. Atlas Search bật bằng `PLACE_SEARCH_INDEX`, index ở `apps/api/config/place-search-index.json`; local dùng cách tìm trong bộ nhớ. Chrome 390px/desktop, không JavaScript và review độc lập đã kiểm; runbook `docs/runbooks/place-search.md`; chờ PR, CI remote, Atlas thật, staging, điện thoại thật/Safari và Sentry 24 giờ.
- S12 code xong trên `feat/S12-public-map`: route bản đồ SSR, API bbox/near, tải đầy đủ viewport, lọc danh mục chính/phụ, gom cụm, chọn ghim và thẻ/danh sách; lazy MapLibre/OpenFreeMap với style runtime, City.mapBounds/minZoom 11, nguồn OSM luôn thấy. 20 task workspace/29 test SSR xanh; Chrome 390px/desktop với tile thật, retry API/import, không JavaScript và review độc lập đã kiểm. Runbook `docs/runbooks/public-map.md`; chờ commit/PR, CI remote, staging, điện thoại thật và Sentry 24 giờ. Style sổ tay/sprite riêng thuộc S22.
- S11 code xong trên `feat/S11-place-detail`: API/trang SSR `/{city}/dia-diem/{slug}`, ảnh và nguồn, giờ mở cửa Việt Nam cập nhật trên client, cảnh báo xác minh, liên hệ, gần đó, 301 từ slugHistory/merged, trang đã đóng cửa; Back giữ danh sách đã tải và vị trí cuộn. 20 task workspace/26 test SSR xanh; đã thử Chrome 390px/desktop, tắt JavaScript, retry và review độc lập. `payloadExtraction: 'client'` giữ dữ liệu SSR khi API lỗi một phần. Runbook `docs/runbooks/place-detail.md`; chờ commit/PR, CI remote, staging (S02), điện thoại thật và Sentry 24 giờ.
- S10 code xong: trang danh mục `/da-lat/{ca-phe,an-uong,tham-quan,hoat-dong}` và khu vực `/da-lat/khu-vuc/{slug}`, lọc thẻ, phân trang cursor; nhánh `feat/S10-category-zone-pages` đã cập nhật main. Đã sửa cache SWR 1 giờ trên bản production và 404 no-store, thêm `pnpm --filter @ranhduong/web test:ssr` chạy sau build trong CI. Đã thử SSR với API/MongoDB thật, Chrome headless 390px/desktop, form GET khi tắt JavaScript và retry tải thêm; runbook `docs/runbooks/category-zone-pages.md`. Chờ merge lên main remote, CI, staging (S02), điện thoại thật và Sentry 24 giờ; giữ các trang đã tải khi Back làm ở S11.
- S09 code xong: trang chủ `/da-lat` SSR, danh mục, tối đa 6 quán nổi bật, lịch trình mẫu published và trang tìm kiếm tối giản `/da-lat/tim-kiem` (GET, không dấu, noindex, không cache); API công khai `/v1/cities/:city`, `/places`, `/itineraries/templates`. Lint, typecheck, test, build xanh; đã thử SSR, Chrome 390px/desktop, GET khi tắt JavaScript và retry sau lỗi API. Phần bổ sung đã commit riêng Task 13/14, chưa mở PR; chờ merge, CI, staging (S02), điện thoại thật và theo dõi Sentry 24 giờ.
- S06 code xong: presigned PUT bucket riêng tư, worker BullMQ sinh WebP 400/800/1200 bỏ metadata, form ghi nguồn ảnh, tiếp tục upload sau đăng nhập, dọn ảnh nháp; đã thử S3 local và Chrome 375px/desktop; runbook `docs/runbooks/photo-upload.md`; chờ R2 staging và điện thoại thật.
- S08 code xong: `pnpm import:osm` (Overpass, dry-run, JSON offline), nháp với ID node/way/relation, unique theo cityId, chạy lại/đồng thời không trùng hoặc ghi đè dữ liệu; đã kiểm CLI trong MongoDB tạm và truy vấn Overpass thật; runbook `docs/runbooks/osm-import.md`; chờ staging và thử nháp trong admin trên điện thoại thật.
