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

- Xong: S01 (khung monorepo, CI, health check, trang `/da-lat` tạm), khung `apps/admin` cho S26, S03 (schema City/Zone/Place, `pnpm seed` Đà Lạt; chờ thử trên staging sau S02, ranh giới cụm chờ chủ dự án duyệt), S10 (trang danh mục `/da-lat/{ca-phe,an-uong,tham-quan,hoat-dong}` và khu vực `/da-lat/khu-vuc/{slug}`, lọc thẻ, phân trang cursor; nhánh dựa trên S09 chưa merge; đã kiểm SSR bằng curl và phía client bằng Chrome headless ở 390px; chờ chủ dự án thử tay trên trình duyệt, staging và điện thoại thật), S04 (đăng nhập admin bằng Google: OAuth PKCE phía API, phiên Redis, `AdminGuard`, `OriginGuard`, trang `/dang-nhap`; runbook `docs/runbooks/admin-login.md`; chờ cấu hình Cloudflare Access và thử staging), S05 (form địa điểm `/dia-diem/:id` trong admin: ghim MapLibre, bảng giờ kèm ô dán mẫu Sheet, cảnh báo nghi trùng, nguồn xác nhận, lưu nháp trên máy, kích hoạt có điều kiện; route `/v1/admin/...` trong `AdminModule`; chờ thử staging và điện thoại thật).
- Tiếp theo: S02 hạ tầng (`ranhduong.vn`, `api.ranhduong.vn`, `media.ranhduong.vn`).
