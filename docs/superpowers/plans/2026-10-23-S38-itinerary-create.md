# S38 — Màn tạo lịch trình

**Goal:** Khách tạo lịch trình bằng các lựa chọn trên `/da-lat/tao-lich-trinh`, xử lý thiếu điểm/lỗi mạng và chuyển đến `/l/{shareId}`.
**Spec:** `docs/backlog-slice-2.md` S38 và §2; `docs/product-spec.md` §8; `docs/ui-spec.md` §3, §5, §6, §11; `docs/technical-design.md` §6, §7, §11; ADR 0008–0011, 0014.
**Architecture:** Nuxt page → feature tạo lịch trình → entity API/shared utilities. Form dùng ItineraryRequest có sẵn; chỉ POST từ client với credentials, không tự retry request ghi. MapLibre tải theo ý định. CityPublic bổ sung center tùy chọn của cụm, suy từ bbox polygon hiện có; không hard-code tọa độ.

## Global Constraints

- Node 24, pnpm 12.9.1; TypeScript strict; không thêm dependency.
- FSD chỉ import tầng thấp hơn; tên component Rd…, chữ tiếng Việt, tokens hiện có.
- 390px trước; vùng bấm tối thiểu 44×44px; tôn trọng prefers-reduced-motion.
- Nơi ở chỉ nằm trong state client, không URL/storage/analytics/payload SSR; API S37 làm tròn và che nơi ở.
- S39 sở hữu trang đích `/l/{shareId}`; S38 chỉ điều hướng đến route này.

## Review Focus

1. Ngày SSR cũ qua nửa đêm: min và validation lấy ngày Việt Nam hiện tại trên client (task 2/3).
2. Bấm liên tiếp hoặc mạng chậm: một POST tại một thời điểm, retry:0, giữ lựa chọn (task 2).
3. Bỏ qua/chuyển cụm sau ghim: xóa tọa độ cũ, không gửi ghim cũ (task 2/3).
4. Lỗi có details sai: parse bằng contract, fallback an toàn; gợi ý sửa đúng trường (task 2).
5. Map lỗi/không JS/ngoài bounds: vẫn đọc SSR và chọn cụm/bỏ qua, không nhận ghim ngoài khung (task 3/4).

### Task 1: Dữ liệu cụm và sitemap

**Files:** `packages/contracts/src/city.ts`, `apps/api/src/modules/cities/cities.service.ts`, `apps/api/src/modules/cities/cities.controller.test.ts`, `apps/api/src/modules/seo/seo.service.ts`, `apps/api/src/modules/seo/seo.http.test.ts`.
**Interfaces:** CityPublic.zones[].center?: GeoPoint; GET city trả center suy từ bbox polygon. Sitemap pages thêm `/{city}/tao-lich-trinh`.
- [x] Viết test HTTP city kiểm center [0.25,0.25]/[0.75,0.75] của cụm giả và sitemap có route tạo; chạy đỏ.
- [x] Bổ sung contract, projection allowlist và sitemap; chạy xanh suite liên quan.
**Acceptance:** Chọn cụm có tác dụng; route tạo có trong sitemap.

### Task 2: State form và API

**Files:** `apps/web/app/features/itinerary-create/lib/create-flow.ts`, `create-flow.test.ts`, `apps/web/app/entities/itinerary/api/guest-itineraries.ts`.
**Interfaces:** createItineraryFlow(city, create, navigate) trả request, pending, error, submit/applySuggestion/skipStay/selectZone; createGuestItinerary(apiBase,citySlug,input,signal) trả ItineraryUserDetail.
- [x] Test ngày Việt Nam, validation, tối đa 3 gu, chọn cụm/bỏ ghim, lỗi giữ input, suggestion, double submit, success navigation; chạy đỏ.
- [x] Implement state bằng Vue, dùng shared Zod để validate input/errors; POST credentials include/retry 0, parse response.
- [x] Chạy unit test web xanh.
**Acceptance:** Các lựa chọn, đang tạo, thiếu điểm/gợi ý, retry giữ lựa chọn, điều hướng shareId.

### Task 3: Giao diện và lối vào

**Files:** `apps/web/app/features/itinerary-create/ui/RdItineraryCreate.vue`, `RdStayMap.client.vue`, `apps/web/app/pages/[city]/tao-lich-trinh.vue`, `apps/web/nuxt.config.ts`, `apps/web/app/widgets/home-discovery/ui/RdHomeItineraryIntro.vue`, `apps/web/app/pages/[city]/lich-trinh/[template].vue`.
**Interfaces:** RdItineraryCreate({city:CityPublic}); map({city,location?}) emit select GeoPoint, tải sau bấm mở; page SEO qua usePageSeo.
- [x] Form fieldset/chip, native date picker, các bước đánh số, preview tóm tắt; nút Lên lịch giúp mình, skeleton, retry và gợi ý có accessible status/focus.
- [x] Chọn cụm/bỏ qua/map center + nút ghim bằng bàn phím, bounds, attribution/error/retry, cleanup.
- [x] Thêm SSR route/index/canonical/SWR 1 giờ; CTA trang chủ và trang mẫu.
**Acceptance:** Toàn bộ màn hình, lối vào, 390px/44px/reduced motion.

### Task 4: Xác minh và tài liệu

**Files:** `apps/web/tests/listing-ssr.test.ts`, `docs/runbooks/itinerary-create.md`, `docs/backlog-slice-2.md`, `CLAUDE.md`, `docs/decisions.md`.
- [x] SSR kiểm route 200/index/canonical/cache, nội dung form, links, không canvas/worker/placeholders nơi ở; lỗi city 404/503 no-store. Sitemap kiểm ở task 1.
- [x] Chạy `pnpm turbo run lint typecheck test build` và `pnpm --filter @ranhduong/web test:ssr`.
- [ ] Browser 390px/desktop: chọn/bỏ gu, ghim/chọn cụm/bỏ qua, pending/double submit, thiếu điểm/apply, network/retry, success redirect; fixture có tên Giả Lập, không ghi DB thật.
- [x] Review toàn bộ diff; cập nhật runbook/trạng thái với bằng chứng và giới hạn (CI remote/staging/điện thoại thật/Sentry chưa kiểm nếu không có môi trường).

## Kết quả thực hiện — 24/10/2026

- 20/20 task workspace, 1.734 unit/integration test và 115 production SSR test đạt ở bản cuối; `git diff --check` đạt.
- Review độc lập chỉ ra lỗi recovery sau khi POST thành công nhưng navigation lỗi; đã thêm test hồi quy đỏ → xanh, khóa lựa chọn sau tạo và cho mở lại lịch qua nửa đêm mà không POST/validate lại.
- Sửa hai nhánh UI được review lưu ý: map lỗi không nhận click, và lỗi tải component có fallback. Không thêm dependency.
- Giữ thay đổi tại workspace hiện tại, chưa commit/merge/push/deploy. Những việc đó không nằm trong yêu cầu triển khai mã của phiên này.
- Chưa thực hiện bước browser: inventory không có browser và mở Chrome trả `Browser is not available: chrome`. Checklist trực quan/staging/điện thoại/Sentry còn chờ ở runbook.
- Quyết định phạm vi: `/l/{shareId}` theo S39 và idempotency server không mở rộng ở S38; nếu cần nghiệm thu hành trình hiển thị cuối, phải hoàn tất S39 trước. Center cụm là trung điểm bbox từ polygon thật, hiển thị rõ là ước lượng; không suy ra địa chỉ nơi ở.
