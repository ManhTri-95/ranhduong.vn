# ADR 0009: Phiên phía server trong Redis, ID khách tạm bằng cookie

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 5, 13; [architecture.md](../architecture.md) mục 3, 6, 7; [product-spec.md](../product-spec.md) mục 3

## Bối cảnh

Khách xem mọi thứ mà không cần đăng nhập; chỉ khi muốn giữ điểm, đua top hoặc nhận quà mới cần đăng nhập. Web, API và admin nằm ở các subdomain khác nhau của `ranhduong.vn`. Phiên phải thu hồi được khi đăng xuất, xoá tài khoản hoặc đổi vai trò. OTP SMS và Zalo ZNS cần có pháp nhân.

## Quyết định

- OAuth Authorization Code + PKCE xử lý phía server, với Google và Zalo (Social API cơ bản). `state` và `code_verifier` lưu Redis 10 phút.
- Phiên là session ID ngẫu nhiên trong cookie `sid` (`HttpOnly; Secure; SameSite=Lax; Domain=.ranhduong.vn`), dữ liệu phiên ở Redis (`sess:{sid}`, 30 ngày, gia hạn khi dùng).
- Khách chưa đăng nhập có cookie `gid` (UUID v4, httpOnly, 1 năm). Khi đăng nhập, gộp check-in, đóng góp, lịch trình và điểm sang user trong một transaction.
- Chống CSRF bằng `SameSite=Lax` cộng kiểm `Origin` cho mọi request ghi dữ liệu. `returnTo` chỉ nhận đường dẫn nội bộ.
- OTP SMS và Zalo ZNS để giai đoạn 2. Lát 1 chỉ admin đăng nhập ([ADR 0004](0004-admin-spa-on-cloudflare-pages.md)).

## Hệ quả

- Redis là thành phần bắt buộc. Xoá Redis thì mọi người phải đăng nhập lại, mức này chấp nhận được.
- Điểm của ID khách tạm chỉ được tính vào bảng xếp hạng kể từ khi gộp.
- Quyền kiểm bằng NestJS Guard đọc `roles` từ phiên; quyền theo quán kiểm `place.ownerId`.
