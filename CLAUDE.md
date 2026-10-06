# CLAUDE.md

Hướng dẫn cho người và AI làm việc trong repo này. Đọc hết trước khi sửa code.

## Dự án

**Rành Đường** (`ranhduong.vn`): cẩm nang số Đà Lạt trên web. Bản đồ địa điểm được curate và xác minh với chủ quán, lịch trình mẫu theo cụm khu vực, sau này có đóng góp cộng đồng, tích điểm, voucher và gói cho chủ quán. Một người làm part-time, mục tiêu ra mắt lát 1 trước 15/11/2026.

## Tài liệu (nguồn sự thật, đọc trước khi làm một story)

- Spec sản phẩm: https://claude.ai/code/artifact/b5687d63-6a70-42d9-aec3-9b2ec024424c
- Thiết kế kỹ thuật (data model, API, thuật toán, SEO, vận hành): https://claude.ai/code/artifact/a7c1ac68-212f-46dd-ac13-98c125730021
- Backlog lát 1 (story S01–S25, tiêu chí nghiệm thu): https://claude.ai/code/artifact/96adba21-d45c-44a3-a6ab-0312e907d5a6
- Kiến trúc hệ thống (triển khai, phân lớp NestJS, luồng chính, cache, mở rộng): https://claude.ai/code/artifact/d5c5198d-94ce-4f1d-977b-7995cc3a7058
- Spec UI (token, component, màn hình, bản đồ, giọng văn): https://claude.ai/code/artifact/2db077a1-70d1-4827-a1bf-f1de9f0e77ba
- Design system (token, class `rd-…`, component có xem trước, brand book): https://claude.ai/artifact/TZnHy2ugtDautrGXuGhjLT
- Bản mẫu UI: https://claude.ai/artifact/M81fn6X8fzBBqpnNYviz3v
- Quy trình thu thập dữ liệu (cột Google Sheet, định dạng giờ mở cửa): https://claude.ai/code/artifact/59b55066-ec2b-4cc7-8c3c-1c303fd92f83
- Quyết định kỹ thuật: `docs/decisions.md`

Nếu code và tài liệu mâu thuẫn, hỏi lại thay vì tự chọn.

## Cấu trúc

```text
apps/web            Nuxt 4 SSR, chỉ web khách, tổ chức theo FSD trong app/
apps/admin          Vue 3 + Vite SPA quản trị, FSD trong src/, deploy Cloudflare Pages (admin.ranhduong.vn)
apps/api            NestJS 12, prefix /v1, Mongoose
packages/contracts  Zod: enum, schema, parser giờ mở cửa (dùng chung web, API, script)
packages/geo        Chuẩn hoá tên, slug, khoảng cách, Jaro-Winkler
packages/ui         Design token CSS (tokens.css)
packages/config     tsconfig dùng chung
docs/               Nhật ký quyết định
```

## Lệnh

```bash
pnpm install
pnpm infra:up                         # MongoDB, Redis, MinIO (docker compose)
pnpm dev                              # chạy web (:3000), admin (:5174), API (:3001)
pnpm turbo run typecheck test build   # phải xanh trước khi commit
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

## Admin (Vue 3 + Vite)

- App riêng ở `apps/admin`, build tĩnh lên Cloudflare Pages tại `admin.ranhduong.vn`, có Cloudflare Access chặn trước; không có code admin trong `apps/web`.
- Cùng quy ước FSD và token với web; gọi API qua `src/shared/api/client.ts` (ofetch, `credentials: 'include'`).
- Thiết kế theo Spec UI mục 12 và các màn hình quản trị trong bản mẫu UI.

## API (NestJS)

- Mỗi nghiệp vụ một module (`places`, `submissions`, `itineraries`…), theo danh sách ở thiết kế kỹ thuật mục 2.
- Biến môi trường đọc qua `loadEnv()` (Zod), không đọc `process.env` rải rác.
- CORS có `credentials` chỉ cho các nguồn trong `WEB_ORIGINS` (production: `https://ranhduong.vn`, `https://admin.ranhduong.vn`); kiểm `Origin` theo cùng danh sách cho request ghi dữ liệu.
- Lỗi trả về `{ code, message, details? }` với mã lỗi ở thiết kế kỹ thuật mục 6.

## Quy tắc dữ liệu (bắt buộc)

- Google Places: chỉ lưu `place_id`. Không lưu giờ mở cửa, rating, review, ảnh của Google.
- Không viết code scrape Facebook, Google Maps hay trang khác.
- Ảnh phải có nguồn (`source`, `credit`, `license`); không dùng ảnh khi chưa có quyền.
- `verifySource`: `owner` khi quán đã xác nhận, `admin` khi chỉ dựa trên Facebook hoặc là điểm công cộng.

## Làm một story

1. Đọc story và tiêu chí nghiệm thu trong backlog, cùng phần liên quan trong thiết kế kỹ thuật và Spec UI.
2. Nhánh `feat/S05-place-form`; commit theo Conventional Commits (`feat:`, `fix:`, `chore:`…), ghi ID story trong commit.
3. Logic có điều kiện (giờ mở cửa, slug, chống trùng, điểm) phải có unit test.
4. Xong khi đạt definition of done ở backlog mục 6: đạt tiêu chí, CI xanh, đã thử trên staging và điện thoại thật.

## Trạng thái

- Xong: S01 (khung monorepo, CI, health check, trang `/da-lat` tạm), khung `apps/admin` cho S26.
- Tiếp theo: S02 hạ tầng (`ranhduong.vn`, `api.ranhduong.vn`, `media.ranhduong.vn`), S03 schema City/Zone/Place, S04 đăng nhập admin.
