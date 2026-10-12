# S22 Notebook Map Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Track completed steps here.

**Goal:** Áp dụng bản đồ sổ tay theo S22, Spec UI §6 và §8.

**Architecture:** Giữ nguồn tile/glyph OpenFreeMap và luồng S12. Style JSON cùng sprite 1x/2x được phục vụ từ web; ghim GeoJSON dùng symbol layer theo danh mục chính, lựa chọn dùng HTML marker riêng. Bản đồ lịch trình dùng chung style mặc định.

**Tech Stack:** Nuxt 4, Vue 3, MapLibre GL 6.13; sharp hiện có ở API để xuất sprite, không thêm dependency.

**Spec:** `docs/backlog.md` S22, `docs/ui-spec.md` §4/6/8/11, `docs/decisions/0008-maplibre-openfreemap.md`.

## Global Constraints

- TypeScript strict; FSD chỉ import lớp thấp hơn; chữ giao diện tiếng Việt.
- Dùng design token; GeoJSON `[lng, lat]`; giữ lazy loading, maxBounds/minZoom, attribution và danh sách thay thế.
- Ghim chọn lớn hơn 25%; translateY -40px → 4px → 0, 700ms ease-out; reduced motion giữ trạng thái cuối.
- Không đổi route, thêm dependency hay ghi dữ liệu địa điểm thật.

## Review Focus

- Style override không có sprite riêng vẫn hiển thị đủ sáu danh mục.
- Chọn trước lúc map load, đổi danh mục và tải viewport không mất/còn sót marker.
- Chọn cùng ghim hoặc cập nhật dữ liệu không chạy lại animation; retry/unmount dọn marker cũ.
- Transform định vị của MapLibre không bị animation ghi đè; cụm vẫn tính cả điểm đang chọn.
- 390px, màn retina, giảm chuyển động, lỗi tải sprite/style vẫn có danh sách và retry.

### Task 1: Style và sprite trong repo

**Files:** `apps/web/public/maps/notebook/style.json`, `sprite{,@2x}.{json,png}`, `apps/web/app/entities/place/lib/map-pin.ts`, `apps/web/scripts/generate-map-sprites.mjs`, `apps/web/nuxt.config.ts`, `.env.example`.

**Interfaces:** `placePinSvg(category: PlaceCategory, fill?: string, stroke?: string): string` xuất SVG giọt nước 36×44 từ hình vẽ vector tĩnh. Sprite IDs `rd-pins:pin-{category}`.

- [x] Tải Positron gốc, sửa màu/lớp theo token; bỏ POI/airport/shield và building, giữ địa danh Noto Sans tiếng Việt.
- [x] Vẽ sáu biểu tượng cafe/food/attraction/activity/stay/shop; xuất atlas PNG+JSON 1x/2x bằng sharp hiện có.
- [x] Mở/chỉnh/export style bằng Maputnik; xác minh schema MapLibre, sprite bounds/ratio và tính lặp lại của script xuất.
- [x] Chuyển default `NUXT_PUBLIC_MAP_STYLE_URL` sang `/maps/notebook/style.json`, vẫn hỗ trợ URL override.

### Task 2: Ghim danh mục và chọn có chuyển động

**Files:** `apps/web/app/features/place-map/lib/map-layers.ts`, `apps/web/app/features/place-map/ui/RdPlaceMap.client.vue`, `apps/web/app/features/itinerary-map/ui/RdItineraryMap.client.vue`, `apps/web/app/shared/lib/map-style.ts`, `apps/web/app/shared/lib/map-style.test.ts`.

**Interfaces:** Giữ `addPlaceLayers`, `updatePlaceLayers`; bổ sung hàm cập nhật filter chọn; HTML marker dùng `placePinSvg` từ entities.

- [x] Thay ghim chữ/circle bằng symbol, bottom anchor, sprite danh mục; giữ cluster/count hiện có. Runtime thêm sprite khi style override không có.
- [x] HTML marker ở lựa chọn, SVG 45×55 (125%); ẩn ghim symbol trùng nhưng giữ điểm trong source để count không đổi.
- [x] Đồng bộ lựa chọn khi load/props đổi; chỉ tạo lại khi slug đổi, dọn khi mất lựa chọn/retry/unmount.
- [x] Animation trên phần tử con; tắt animation khi reduced motion, giữ định vị và vùng bấm 44px.

### Task 3: Kiểm chứng và tài liệu

**Files:** `docs/runbooks/notebook-map.md`, `docs/runbooks/assets/s22-*.png`, `docs/backlog.md`, `docs/decisions.md`, `CLAUDE.md`.

- [x] Chạy `pnpm turbo run lint typecheck test build` và `pnpm --filter @ranhduong/web test:ssr`; tất cả xanh.
- [x] Chrome headless với fixture rõ tên Giả Lập: 390px/desktop/retina, đủ sáu biểu tượng, cluster click, chọn/list/clear, đổi danh mục, retry, reduced motion, style override, itinerary/lazy loading, attribution, console/hydration.
- [x] Review toàn diff theo Spec, chụp ảnh; ghi bằng chứng và cập nhật story là code xong, chờ staging/điện thoại thật/CI/Sentry.

## Execution Notes

- Baseline: 18 file / 78 test web xanh. Working tree ban đầu sạch; triển khai trên nhánh `feat/S22-notebook-map` tại workspace hiện có.
- User đã yêu cầu thực hiện S22; triển khai liên tục trong phiên này. Không commit/push/deploy tự động.
- Review tìm lỗi URL sprite tương đối: MapLibre 6.13 chỉ resolve URL tuyệt đối, nên dùng helper shared qua `setStyle`/`transformStyle` ở cả hai bản đồ; bốn unit test và test browser xác minh local/remote URL. Lỗi load handler xoá thông báo sau sprite failure được tái hiện trên build cũ, sửa và kiểm JSON/PNG/style failure + retry trên build cuối.
- Ghi nguồn thiết kế Positron ở `/ghi-nguon`, link cạnh cả hai bản đồ và giữ giấy phép upstream trong thư mục style; không thay route.
