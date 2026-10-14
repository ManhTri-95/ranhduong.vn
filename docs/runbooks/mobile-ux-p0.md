# Mobile UX P0: bản đồ, trang địa điểm, nền tảng

13/10/2026. Đợt sửa trước ra mắt sau audit UX 4 trang (trang chủ, địa điểm, bản đồ, tìm kiếm). Chủ dự án chốt phạm vi "P0 + nền tảng trước ra mắt"; trang chủ, tìm kiếm và bố cục desktop riêng để ngay sau ra mắt.

## Đã làm

- **Nền tảng:** token chuyển động (`--dur-micro/standard/panel`, `--ease-out`, `--press-scale`) và chừa chỗ đáy (`--action-bar-height`, `--float-clearance`) trong `packages/ui/src/tokens.css`. Phản hồi bấm bằng thuộc tính `scale` (không đè `transform` định vị của nút nổi, marker), hover chỉ trên thiết bị có chuột, `.rd-quiet` 13px, `rd-chip--outline`, thẻ gọn `rd-place--compact`, khung xương `rd-skeleton`.
- **Chừa chỗ cuối trang:** bỏ `padding-bottom: 160px` ở footer, consent và trang địa điểm. Trang có thanh cố định đặt `data-rd-bottom` (`action` hoặc `float`) trên `body`; `apps/web/app/assets/base.css` chừa đúng chiều cao thanh.
- **Chưa có ảnh:** `RdCategoryGlyph` vẽ nét danh mục từ `CATEGORY_GLYPH` (cùng nguồn với sprite ghim, test giữ nguyên SVG sprite). Trang địa điểm dùng dải 72px thay khung 3:2.
- **Quán chưa xác nhận:** `placeStatusText` hiện trạng thái với chip viền, không nền nhấn, kèm "Thông tin chưa được quán xác nhận" trên thẻ và trang địa điểm (chủ dự án chốt 13/10/2026).
- **Trang địa điểm:** trạng thái ngay dưới tên; ghi chú dài chữ nội dung; thẻ giờ có "Hôm nay" (tính theo giờ Việt Nam trên trình duyệt) và "Giờ từng ngày" thu gọn, tô dòng hôm nay; mục Liên hệ; 3 chỗ gần đây dạng gọn và `<details>` "Xem thêm gần đây"; thanh đáy chỉ Chỉ đường và Gọi (80px thay vì 133px); ảnh phụ cuộn ngang.
- **Bản đồ:** toàn màn hình, header nổi một hàng chip ("Trú mưa được" đứng đầu), sheet kéo ba mức (`widgets/place-map/lib/map-sheet.ts`), chỉ dịch bản đồ khi ghim bị che (`features/place-map/lib/map-camera.ts`). Giữ khung nhìn, ghim, mức sheet và vị trí cuộn khi Back (`useState`, không đưa vào URL vì `/da-lat/ban-do` cache SWR theo cả query). Footer nằm cuối danh sách; `app.vue` ẩn footer với trang có `fullscreen: true`.

## Đã kiểm

- `eslint`, `nuxt typecheck` + `tsc -p tsconfig.ssr.json`, 128 unit test web, `nuxt build` và 75 test SSR production đều xanh.
- Chrome headless qua CDP (giả lập 390×844 có cảm ứng, 320px, 1440px; xem ghi chú trong bộ nhớ dự án về giới hạn 500px của `--window-size`). Đã kiểm: không tràn ngang ở 320/390px; thanh địa điểm 77px; trạng thái nằm trong màn hình đầu (y≈384); bản đồ cao đúng 844px, không cuộn trang. Đã thử cử chỉ chạm thật qua `Input.dispatchTouchEvent`: vuốt nhanh lên mở rộng, kéo chậm xuống thu gọn (`inert`), vuốt nhanh xuống về nửa, nhích nhỏ giữ nguyên, chạm/bấm thanh kéo đổi mức. Chọn ghim từ danh sách về mức nửa. Vào địa điểm rồi Back giữ mức sheet và địa điểm đang chọn. Giảm chuyển động: transition 0s. Không có cảnh báo hydration (lần tải đầu sau khi sửa template có thể lấy HTML SWR cũ trong dev, tải lại là hết).
- Dữ liệu local không có ảnh nào, nên phần ảnh bìa và dải ảnh phụ chỉ được kiểm bằng test SSR `with-photo`, chưa nhìn trên trình duyệt.

## Còn chờ

- Điện thoại thật Android và iPhone: vùng an toàn, cử chỉ kéo sheet và kéo bản đồ cùng lúc, thanh địa chỉ co giãn (dvh).
- Cập nhật artifact Design System (claude.ai) theo các mục Spec UI đã sửa ở mục 2, 4, 5, 8.
- CI remote, staging, Sentry 24 giờ.

## Để sau ra mắt (từ audit)

- Trang chủ: ô tìm kiếm bắt đầu ở y≈553 vì ô thời tiết và phần miễn trừ chiếm khoảng 270px; chip danh mục xuống 2 hàng; thẻ lịch trình chưa có fallback ảnh; chưa có "Xem tất cả".
- Tìm kiếm: nút xoá chữ, trạng thái đang tải khi submit; `rd-btn--secondary` trong `RdSearchForm` chưa có trong `components.css`.
- Bản đồ hiện 6 danh mục, trang chủ chỉ có 4 `PUBLIC_CATEGORIES`, cần chủ dự án chọn. Desktop trang chủ vẫn là bản mobile kéo giãn.
- "Lưu"/"Đã lưu" và thanh điều hướng dưới: không làm khi chưa có đăng nhập cho khách.
