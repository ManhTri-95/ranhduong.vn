# Admin trên Cloudflare Pages (S26)

`apps/admin` build ra file tĩnh và deploy lên Cloudflare Pages (ADR 0004): nhánh `main` ra admin staging, tag `v*` ra `admin.ranhduong.vn`. Job `deploy-admin` trong `.github/workflows/ci.yml` chỉ chạy sau khi job `check` xanh. Cloudflare Access chặn trước, API kiểm `ADMIN_EMAILS` lần hai ([admin-login.md](admin-login.md)).

## 1. Tạo dự án Pages (một lần)

1. Tạo dự án Direct Upload, nhánh production tên `production`:

   ```bash
   pnpm dlx wrangler@4.147.0 login
   pnpm dlx wrangler@4.147.0 pages project create ranhduong-admin --production-branch=production
   ```

2. Tạo API token: My Profile → API Tokens → Create Token → Custom, quyền *Account → Cloudflare Pages → Edit*, chỉ cho tài khoản của dự án. Lấy Account ID ở trang tổng quan Workers & Pages.
3. Không bật Web Analytics cho dự án: script của nó không nằm trong CSP (mục 5) nên sẽ bị chặn.

## 2. GitHub

| Nơi đặt | Tên | Giá trị |
| --- | --- | --- |
| Biến repo (Settings → Variables) | `ADMIN_PAGES_PROJECT` | `ranhduong-admin`. Chưa đặt thì job deploy bỏ qua, CI vẫn xanh |
| Secret repo | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Token và Account ID ở mục 1 |
| Environment `admin-staging`, biến | `VITE_API_BASE` | URL API staging + `/v1` (tên miền chốt ở S02) |
| | `VITE_WEB_BASE` | Web staging |
| | `VITE_MEDIA_BASE` | Domain ảnh staging (bucket media) |
| | `VITE_MAP_STYLE_URL` | Tuỳ chọn; để trống là positron của OpenFreeMap |
| | `VITE_UPLOAD_ORIGIN` | Tuỳ chọn; để trống là `https://*.r2.cloudflarestorage.com` |
| Environment `admin-production`, biến | như trên | `https://api.ranhduong.vn/v1`, `https://ranhduong.vn`, `https://media.ranhduong.vn` |

Build `pages` dừng và nêu tên biến nếu thiếu `VITE_API_BASE`, `VITE_WEB_BASE`, `VITE_MEDIA_BASE` hoặc giá trị không phải URL http(s); biến để trống coi như chưa đặt. Có thể đặt Required reviewers cho `admin-production`.

## 3. Domain

- **Production:** Workers & Pages → `ranhduong-admin` → Custom domains → thêm `admin.ranhduong.vn`.
- **Staging:** sau khi đã có một lần deploy từ `main`, thêm `admin.staging.ranhduong.vn` ở Custom domains rồi sửa bản ghi CNAME của nó sang `main.ranhduong-admin.pages.dev`. Bản ghi phải proxied, nếu không domain sẽ trỏ về production ([Add a custom domain to a branch](https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/)).
- Không dùng thẳng `*.pages.dev` để làm việc: trình duyệt không gửi cookie phiên `.ranhduong.vn` tới API từ site khác ([admin-login.md](admin-login.md) mục 2).

## 4. Access, API, R2

- **Access:** làm theo [admin-login.md](admin-login.md) mục 3 cho `admin.ranhduong.vn`, `admin.staging.ranhduong.vn`, URL preview và alias `ranhduong-admin.pages.dev`.
- **API:** `WEB_ORIGINS` và `ADMIN_URL` theo bảng ở [admin-login.md](admin-login.md) mục 2. Từ S26, API dừng khi khởi động nếu một mục trong `WEB_ORIGINS` không phải origin (có đường dẫn, `*`, thiếu `https://`); dấu `/` cuối và chữ hoa được tự chuẩn hoá.
- **R2:** CORS bucket upload thêm origin admin staging bên cạnh production ([photo-upload.md](photo-upload.md)).

## 5. Header và CSP

Build `pages` sinh `dist/_headers` từ biến ở mục 2 (`apps/admin/build/pages.ts`); bản build thường (`pnpm build`, CI) không có file này.

| Nguồn | Vì sao |
| --- | --- |
| `script-src 'self'` | Vite không chèn script inline |
| `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` | CSS Google Fonts; `unsafe-inline` cho thuộc tính `style` |
| `font-src 'self' https://fonts.gstatic.com` | File font |
| `img-src 'self' data: blob: <media>` | Ảnh địa điểm, xem trước ảnh chọn từ máy |
| `connect-src 'self' <api> <upload> <style bản đồ> https://tiles.openfreemap.org` | API, PUT presigned lên R2, style/tile/glyph/sprite bản đồ |
| `worker-src 'self'` | Worker MapLibre nằm trong `assets/` |
| `frame-ancestors 'none'`, `X-Frame-Options: DENY` | Không cho nhúng admin vào trang khác |

Kèm `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`. Không đặt `Cache-Control`: mặc định của Pages (`public, max-age=0, must-revalidate` + ETag) đúng với "admin không cache".

Console có một báo cáo CSP `script-src eval`: Zod tự thử `Function('')` trong try/catch để chọn cách kiểm nhanh hơn, bị chặn thì dùng cách thường. Không ảnh hưởng chức năng.

Khi thêm nguồn mới (ví dụ Sentry ở S19), sửa `pagesHeaders` và test `apps/admin/build/pages.test.ts`.

## 6. Fallback SPA và bản deploy mới

- Không có `_redirects`: dự án không có `404.html` nên Pages trả `index.html` cho mọi đường dẫn không phải file. Mở thẳng `/dia-diem/<id>` vẫn vào app.
- Đường dẫn chunk không còn (sau deploy, hoặc khi phiên Access hết hạn và request chunk bị chuyển sang trang đăng nhập Access) cũng nhận về HTML, nên `import()` của route lỗi. Router tải lại toàn trang tới trang đích một lần (`sessionStorage`, khoá `rd-admin:chunk-reload`, 10 giây). Vẫn lỗi thì hiện "Chưa mở được trang này…" với nút Tải lại trang, không tải lại liên tục.

## 7. Phát hành và quay lui

- Merge vào `main` → deploy staging. Thử staging (mục 8), rồi tạo tag `v*` → deploy production.
- Quay lui: Workers & Pages → `ranhduong-admin` → Deployments → bản trước → Rollback. Không cần build lại.

## 8. Kiểm sau deploy

1. `curl -sI https://admin.staging.ranhduong.vn/dia-diem/khong-co` (qua Access cần cookie hoặc service token; hoặc xem tab Network): `200`, `content-security-policy` đúng origin staging, `x-robots-tag: noindex, nofollow`.
2. Ẩn danh với email ngoài danh sách: Access chặn ở cả domain, URL preview và `ranhduong-admin.pages.dev`.
3. Email trong danh sách: đăng nhập Google, mở thẳng `/dia-diem/<id>`, bản đồ hiện, upload một ảnh thử, console không có vi phạm CSP ngoài `script-src eval` ở mục 5.
4. Điện thoại thật (Android, iPhone): mở danh sách và form địa điểm.

## 9. Kết quả thử local (19/10/2026)

Bản build `pages` với giá trị local chạy trên `wrangler pages dev` 4.147.0 (cổng 8788), API riêng ở cổng 3111 có `WEB_ORIGINS` gồm `http://localhost:8788`, phiên admin tạo thẳng trong Redis, Chrome headless qua CDP:

- Wrangler đọc 1 rule header, không cảnh báo `_redirects`. `/dia-diem/khong-co` trả `200 text/html` kèm đủ header ở mục 5; chunk không tồn tại cũng trả `200 text/html`.
- Chưa có phiên: chuyển sang `/dang-nhap?returnTo=/dia-diem`. Preflight từ `http://localhost:8788` nhận `Access-Control-Allow-Origin` đúng nguồn và `Allow-Credentials: true`.
- 1440px: `/dia-diem`, form địa điểm (bản đồ hiện, 7/7 request OpenFreeMap 200), `/lich-trinh/<id>`, `/bao-cao`, `/mua`, `/danh-sach`, `/import` mở được; thanh bên 232px; không tràn ngang; chỉ có báo cáo CSP `script-src eval` của Zod. 390px: thanh trên 56px, danh sách dạng thẻ, form có bản đồ, không tràn ngang.
- Xoá chunk Báo cáo khi đang mở `/dia-diem` rồi bấm Báo cáo: trang tải lại đúng một lần tới `/bao-cao`, sau đó hiện thông báo; trả file lại và bấm Tải lại trang thì mở được.
- `pnpm turbo run lint typecheck test build`: 20/20 task xanh (admin 214, API 412, contracts 436, geo 37, web 144 test); `pnpm --filter @ranhduong/web test:ssr`: 81 test xanh. Workflow kiểm bằng actionlint 1.7.7, 0 lỗi.
- Chưa thử upload ảnh: image `minio/minio` không còn pull được từ Docker Hub nên MinIO local không chạy. CSP đã mở origin upload (`VITE_UPLOAD_ORIGIN`); kiểm upload trên staging (mục 8).
