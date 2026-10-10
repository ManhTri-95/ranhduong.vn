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

- **Story đã có trong `docs/backlog.md`**: bỏ qua brainstorming, dùng `superpowers:writing-plans` ngay. Trước khi viết plan, đọc story, tiêu chí nghiệm thu, các mục liên quan theo bản đồ tài liệu và các ADR liên quan. Plan phải ghi rõ tiêu chí nghiệm thu nào được kiểm ở bước nào.
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

- Xong: S01 (khung monorepo, CI, health check, trang `/da-lat` tạm), khung `apps/admin` cho S26, S03 (schema City/Zone/Place, `pnpm seed` Đà Lạt; chờ thử trên staging sau S02, ranh giới cụm chờ chủ dự án duyệt), S04 (đăng nhập admin bằng Google: OAuth PKCE phía API, phiên Redis, `AdminGuard`, `OriginGuard`, trang `/dang-nhap`; runbook `docs/runbooks/admin-login.md`; chờ cấu hình Cloudflare Access và thử staging), S05 (form địa điểm `/dia-diem/:id` trong admin: ghim MapLibre, bảng giờ kèm ô dán mẫu Sheet, cảnh báo nghi trùng, nguồn xác nhận, lưu nháp trên máy, kích hoạt có điều kiện; route `/v1/admin/...` trong `AdminModule`; chờ thử staging và điện thoại thật), S27 (danh mục phụ `alsoCategories` tối đa 2 và mức mái che `cover` thay `indoor`; lọc, thẻ, tìm, form admin; chờ thử staging), S07 (danh sách `/dia-diem` trong admin: tab trạng thái có số đếm, tìm, lọc, xếp; Đã xác minh, ẩn, hiện lại, đã đóng cửa, mở lại, xoá hẳn nháp; chờ thử staging).
- Tiếp theo: S02 hạ tầng (`ranhduong.vn`, `api.ranhduong.vn`, `media.ranhduong.vn`).
- S14 code xong trên `feat/S14-curated-lists`: admin `/danh-sach` tạo/sửa tiêu đề, mô tả, chọn và đổi thứ tự địa điểm, nháp/công khai, giữ bản đang soạn và khôi phục sau hết phiên; API/module curated-lists, slug ổn định/chống trùng đồng thời. Trang SSR `/da-lat/top/{slug}` và liên kết trang chủ, chỉ hiện active theo thứ tự. 20 task workspace, 37 test SSR và Chrome 390px/desktop xanh; review độc lập đã kiểm/sửa Enter công khai ngoài ý muốn. Runbook `docs/runbooks/curated-lists.md`; chờ PR, CI remote, staging, điện thoại thật và Sentry 24 giờ.
- S13 code xong trên `feat/S13-place-search`: tìm không dấu theo tên/tên khác, danh mục chính/phụ và thẻ; gợi ý trên trang chủ/trang kết quả với debounce, huỷ request cũ, combobox/bàn phím/chạm, bộ gõ tiếng Việt và retry. Giữ form GET/SSR, no-store/noindex. Atlas Search bật bằng `PLACE_SEARCH_INDEX`, index ở `apps/api/config/place-search-index.json`; local dùng cách tìm trong bộ nhớ. Chrome 390px/desktop, không JavaScript và review độc lập đã kiểm; runbook `docs/runbooks/place-search.md`; chờ PR, CI remote, Atlas thật, staging, điện thoại thật/Safari và Sentry 24 giờ.
- S12 code xong trên `feat/S12-public-map`: route bản đồ SSR, API bbox/near, tải đầy đủ viewport, lọc danh mục chính/phụ, gom cụm, chọn ghim và thẻ/danh sách; lazy MapLibre/OpenFreeMap với style runtime, City.mapBounds/minZoom 11, nguồn OSM luôn thấy. 20 task workspace/29 test SSR xanh; Chrome 390px/desktop với tile thật, retry API/import, không JavaScript và review độc lập đã kiểm. Runbook `docs/runbooks/public-map.md`; chờ commit/PR, CI remote, staging, điện thoại thật và Sentry 24 giờ. Style sổ tay/sprite riêng thuộc S22.
- S11 code xong trên `feat/S11-place-detail`: API/trang SSR `/{city}/dia-diem/{slug}`, ảnh và nguồn, giờ mở cửa Việt Nam cập nhật trên client, cảnh báo xác minh, liên hệ, gần đó, 301 từ slugHistory/merged, trang đã đóng cửa; Back giữ danh sách đã tải và vị trí cuộn. 20 task workspace/26 test SSR xanh; đã thử Chrome 390px/desktop, tắt JavaScript, retry và review độc lập. `payloadExtraction: 'client'` giữ dữ liệu SSR khi API lỗi một phần. Runbook `docs/runbooks/place-detail.md`; chờ commit/PR, CI remote, staging (S02), điện thoại thật và Sentry 24 giờ.
- S10 code xong: trang danh mục `/da-lat/{ca-phe,an-uong,tham-quan,hoat-dong}` và khu vực `/da-lat/khu-vuc/{slug}`, lọc thẻ, phân trang cursor; nhánh `feat/S10-category-zone-pages` đã cập nhật main. Đã sửa cache SWR 1 giờ trên bản production và 404 no-store, thêm `pnpm --filter @ranhduong/web test:ssr` chạy sau build trong CI. Đã thử SSR với API/MongoDB thật, Chrome headless 390px/desktop, form GET khi tắt JavaScript và retry tải thêm; runbook `docs/runbooks/category-zone-pages.md`. Chờ merge lên main remote, CI, staging (S02), điện thoại thật và Sentry 24 giờ; giữ các trang đã tải khi Back làm ở S11.
- S09 code xong: trang chủ `/da-lat` SSR, danh mục, tối đa 6 quán nổi bật, lịch trình mẫu published và trang tìm kiếm tối giản `/da-lat/tim-kiem` (GET, không dấu, noindex, không cache); API công khai `/v1/cities/:city`, `/places`, `/itineraries/templates`. Lint, typecheck, test, build xanh; đã thử SSR, Chrome 390px/desktop, GET khi tắt JavaScript và retry sau lỗi API. Phần bổ sung đã commit riêng Task 13/14, chưa mở PR; chờ merge, CI, staging (S02), điện thoại thật và theo dõi Sentry 24 giờ.
- S06 code xong: presigned PUT bucket riêng tư, worker BullMQ sinh WebP 400/800/1200 bỏ metadata, form ghi nguồn ảnh, tiếp tục upload sau đăng nhập, dọn ảnh nháp; đã thử S3 local và Chrome 375px/desktop; runbook `docs/runbooks/photo-upload.md`; chờ R2 staging và điện thoại thật.
- S08 code xong: `pnpm import:osm` (Overpass, dry-run, JSON offline), nháp với ID node/way/relation, unique theo cityId, chạy lại/đồng thời không trùng hoặc ghi đè dữ liệu; đã kiểm CLI trong MongoDB tạm và truy vấn Overpass thật; runbook `docs/runbooks/osm-import.md`; chờ staging và thử nháp trong admin trên điện thoại thật.
