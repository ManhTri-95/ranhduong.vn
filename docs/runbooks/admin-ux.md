# S28 — Nền UX admin dùng chung (giai đoạn 1)

Spec: `docs/superpowers/specs/2026-10-14-admin-ux-foundation-design.md`. Plan: `docs/superpowers/plans/2026-10-14-s28-admin-ux-phase1.md`.

## Dùng

- **Menu:** từ 1280px thanh bên bên trái; hẹp hơn thì bấm nút ☰ ở thanh trên. "Địa điểm" và "Lịch trình mẫu" mở lại bộ lọc lần trước trong tab đó.
- **Danh sách địa điểm:** tab trạng thái là link (mở tab mới được). Cột **Còn thiếu** cho biết còn thiếu Vị trí, Giờ mở cửa, Nguồn xác nhận hay Nguồn ảnh. Ô **Xếp** có thêm "Lâu chưa sửa". **Xoá bộ lọc** giữ tab và cách xếp. Từ form quay lại (breadcrumb, menu, Back) thì về đúng bộ lọc và chỗ đang cuộn.
- **Form địa điểm:** từ 1024px có cột phụ: danh sách điều kiện (bấm để tới mục), **Xác minh** (nguồn xác nhận, ngày xác minh, Đánh dấu đã xác minh), **Trên web** (Ẩn, Đã đóng cửa, Hiện lại, Mở lại, Xoá nháp). Các nút này khoá khi còn thay đổi chưa lưu. **Bỏ thay đổi** hỏi lại rồi trả form về bản đã lưu.
- **Form lịch trình:** bấm "✕ lỗi · ⚠ nhắc" ở đầu trang để tới vấn đề đầu tiên. Mỗi điểm là một hàng gọn, bấm để mở. Công khai lần đầu và Chuyển về nháp có hỏi lại.
- **Rời trang:** chỉ hỏi khi có thay đổi chưa lưu mà trình duyệt không giữ được bản trên máy (chế độ riêng tư, hết chỗ).

## Cấu hình

`VITE_WEB_BASE` (mặc định `http://localhost:3100`) cho link "Xem trên web". Staging, production đặt URL web tương ứng trên Cloudflare Pages.

## Kiểm tra

- `pnpm turbo run lint typecheck test build`.
- Trình duyệt ở 320, 390, 768, 1024, 1280, 1440px: không cuộn ngang; ngăn trượt mở/đóng bằng Esc và nền mờ; viền focus thấy được trong thanh bên; tiêu đề bảng dính; thanh lưu không che ô đang nhập; giảm chuyển động thì không có hiệu ứng.

## Chưa làm (giai đoạn 2)

Bản đồ tuyến, tay cầm kéo và vạch thả, "Đã có ở Ngày N", gợi ý "HH:mm, nhận 24:00", hoàn tác dời ghim, thu gọn form upload ảnh, hàng giờ gọn trên desktop; chuyển Danh sách gợi ý, Báo cáo, Mùa, danh sách Lịch trình sang component. Xoá, sắp xếp, chọn ảnh bìa cần API mới (story riêng).
