# Đăng nhập admin: Google OAuth và Cloudflare Access

Một email muốn vào admin phải qua hai lớp (ADR 0004): Cloudflare Access trước `admin.ranhduong.vn`, và `ADMIN_EMAILS` của API. Thêm hay bớt admin thì luôn sửa **cả hai** nơi.

## 1. Google OAuth client cho API

Làm ở Google Cloud Console → Google Auth Platform (tên mục có thể khác chút tuỳ phiên bản console).

1. **Branding:** tên ứng dụng "Rành Đường Quản trị", email hỗ trợ của bạn.
2. **Audience:** External. Publishing status chọn *In production*: API chỉ xin scope `openid email` nên Google không yêu cầu xác minh ứng dụng. Nếu để *Testing* thì phải thêm từng admin vào Test users, thành ra một danh sách thứ ba phải giữ khớp.
3. **Clients → Create client → Web application**, tên `ranhduong-api`. Authorized redirect URIs:
   - `http://localhost:3101/v1/auth/google/callback`
   - `https://api.ranhduong.vn/v1/auth/google/callback`
   - URL callback của API staging (chốt tên miền ở S02), dạng `https://<api staging>/v1/auth/google/callback`
4. Chép Client ID và Client secret vào `apps/api/.env` (local), và vào secrets của VPS/GitHub Actions (staging, production). Không commit.

## 2. Biến môi trường theo môi trường

| Biến | Local | Staging | Production |
| --- | --- | --- | --- |
| `API_PUBLIC_URL` | `http://localhost:3101` | URL API staging (S02) | `https://api.ranhduong.vn` |
| `ADMIN_URL` | `http://localhost:5174` | URL admin staging (S02, S26) | `https://admin.ranhduong.vn` |
| `WEB_ORIGINS` | `http://localhost:3100,http://localhost:5174` | web staging, admin staging | `https://ranhduong.vn,https://admin.ranhduong.vn` |
| `SESSION_COOKIE_DOMAIN` | để trống | `.staging.ranhduong.vn` | `.ranhduong.vn` |
| `SESSION_COOKIE_NAME` | `sid` | `sid_staging` | `sid` |
| `ADMIN_EMAILS` | email của bạn | danh sách admin | danh sách admin |

- Staging phải dùng tên cookie khác production: cookie `sid` của production đặt ở `.ranhduong.vn` nên cũng được gửi tới API staging.
- Admin staging phải chạy trên một subdomain của `ranhduong.vn` (ví dụ `admin.staging.ranhduong.vn`, gắn vào nhánh `main` của dự án Pages), không dùng thẳng `*.pages.dev`. `pages.dev` là site khác `ranhduong.vn`, nên trình duyệt không gửi cookie `SameSite=Lax` tới API.
- Nếu staging bật basic auth (technical-design mục 13), thì API staging và admin staging phải nằm ngoài basic auth; admin staging đã có Access chặn.

## 3. Cloudflare Access (lớp 1)

Đường dẫn trong dashboard lấy theo tài liệu Cloudflare (10/2026): <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/>, <https://developers.cloudflare.com/pages/configuration/preview-deployments/>, <https://developers.cloudflare.com/pages/platform/known-issues/>.

1. **Cách đăng nhập:** Zero Trust → Integrations → Identity providers → Add new identity provider → Google. Dùng một OAuth client Google **riêng** (không dùng chung client của API), với redirect URI `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`. Nếu chưa muốn tạo client thứ hai, có thể tạm dùng One-time PIN (mã gửi qua email).
2. **Policy dùng lại được:** Zero Trust → Access controls → Policies → Add a policy. Tên "Quản trị Rành Đường", Action *Allow*, Include → *Emails*: đúng danh sách `ADMIN_EMAILS` của production. Session duration: 24 giờ.
3. **Ứng dụng cho tên miền riêng:** Access controls → Applications → Create new application → Self-hosted and private → Add public hostname → `admin.ranhduong.vn` (và hostname admin staging). Gắn policy ở bước 2; chọn cách đăng nhập ở bước 1.
4. **Bản preview của Pages:** Workers & Pages → dự án admin → Settings → General → Enable access policy. Bước này chỉ che các URL preview (`<hash>.<project>.pages.dev`), chưa che `<project>.pages.dev`. Gắn policy ở bước 2 vào ứng dụng Access vừa được tạo tự động.
5. **Alias `<project>.pages.dev`:** làm theo mục "Enable Access on your `*.pages.dev` domain" trong trang known issues của Pages (sửa ứng dụng Access tự tạo: bỏ `*` ở ô Subdomain, rồi bảo vệ lại bản preview). Gắn cùng policy.
6. **Kiểm tra** (cửa sổ ẩn danh, mỗi lần một tài khoản):
   - Email ngoài danh sách: `admin.ranhduong.vn`, `<project>.pages.dev` và một URL preview đều bị Access chặn, không tải được trang admin.
   - Email trong danh sách: qua Access, tới trang `/dang-nhap` của admin, đăng nhập Google lần hai (lớp API) rồi vào được `/dia-diem`.
   - Xem Zero Trust → Logs → Access để thấy các lượt bị chặn và được cho qua.

## 4. Thêm hoặc bớt admin

- **Thêm:** thêm email vào policy "Quản trị Rành Đường", rồi thêm vào `ADMIN_EMAILS` và khởi động lại API.
- **Bớt:** xoá email khỏi policy, thu hồi phiên Access của người đó trong Zero Trust (mục Users), rồi xoá khỏi `ADMIN_EMAILS` và khởi động lại API. API kiểm lại danh sách ở mỗi request, nên phiên cũ của người đó nhận 403 ngay sau khi API khởi động lại.
