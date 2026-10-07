# ADR 0004: Admin là app Vue 3 + Vite riêng trên Cloudflare Pages, sau Cloudflare Access

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [architecture.md](../architecture.md) mục 2, 3; [backlog.md](../backlog.md) mục 2, S04, S26; [ui-spec.md](../ui-spec.md) mục 12; [decisions.md](../decisions.md)

## Bối cảnh

Trang quản trị không cần SEO và chỉ một nhóm email được dùng. Lát 1 cần công cụ nhập liệu dùng tốt trên điện thoại từ tuần 2. Để admin chung trong Nuxt thì sau này vẫn phải tách ra; tách từ đầu chỉ tốn thêm khoảng 5 giờ (S26).

## Quyết định

- `apps/admin` là SPA Vue 3 + Vite theo FSD, build ra file tĩnh, deploy Cloudflare Pages tại `admin.ranhduong.vn` (nhánh `main` ra bản xem trước, tag `v*` ra production).
- Cloudflare Access chặn trước, chỉ email được phép mới tải được trang.
- API xác thực lần hai: đăng nhập Google OAuth với danh sách email (`ADMIN_EMAILS`, S04). Cookie phiên đặt ở `.ranhduong.vn`.
- API bật CORS có `credentials` chỉ cho các nguồn trong `WEB_ORIGINS` (production: `https://ranhduong.vn`, `https://admin.ranhduong.vn`) và kiểm `Origin` theo cùng danh sách cho request ghi dữ liệu.
- Không có code admin trong `apps/web`. Trang chủ quán sau này làm theo cùng mô hình.

## Hệ quả

- Hai lớp chặn: một email phải nằm trong cả Cloudflare Access lẫn `ADMIN_EMAILS`.
- Admin dùng chung `packages/contracts` và token `packages/ui` với web khách; gọi API qua `src/shared/api/client.ts` (`credentials: 'include'`).
- VPS chỉ còn phục vụ web khách, API và worker. Admin không đi qua Tunnel; chỉ các lệnh gọi API mới đi qua.
- Local: admin chạy ở `:5174`, nằm trong `WEB_ORIGINS` mặc định.
