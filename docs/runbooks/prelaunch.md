# Trang giới thiệu trước khi ra mắt

Account triển khai: `bootrancntt@gmail.com` (`480adcbbd23ed4b4da40f804166ce84b`), đã ghi cố định trong `apps/web/prelaunch/wrangler.jsonc`.

Bản công khai: https://ranhduong-prelaunch.bootrancntt.workers.dev

Đã deploy ngày 2026-10-07. Tên miền `ranhduong.vn` chưa được gắn vào Worker.

Trang tĩnh nằm trong `apps/web/prelaunch/src`, dùng bộ token và component CSS của `packages/ui`. Bản build nằm trong `apps/web/prelaunch/dist` (không commit). Trang không gọi API và chạy được khi backend chưa triển khai.

Web sản phẩm Nuxt SSR vẫn theo [ADR 0003](../decisions/0003-nuxt-on-vps-behind-cloudflare.md). Landing page có Worker riêng tên `ranhduong-prelaunch`; cấu hình trong `apps/web/prelaunch/wrangler.jsonc`.

## Build và xem tại máy

Từ thư mục gốc của repo, với Node 24 và pnpm 12.9.1:

```bash
pnpm install --frozen-lockfile
pnpm --filter @ranhduong/web build:prelaunch
pnpm --filter @ranhduong/web preview:prelaunch
```

Wrangler in địa chỉ xem tại máy. Trên Windows PowerShell nếu bị chặn `pnpm.ps1`, dùng `pnpm.cmd` thay cho `pnpm`.

Kiểm tra trang ở 390px và desktop; link trong trang cuộn tới phần giới thiệu tính năng. URL không tồn tại trả 404 và có link về trang đầu. Trang chưa có form nhận email.

## Deploy Cloudflare

```bash
pnpm --filter @ranhduong/web exec wrangler whoami
# Nếu chưa đăng nhập:
pnpm --filter @ranhduong/web exec wrangler login

pnpm --filter @ranhduong/web build:prelaunch
pnpm --filter @ranhduong/web exec wrangler deploy --config prelaunch/wrangler.jsonc --dry-run
pnpm --filter @ranhduong/web deploy:prelaunch
```

Lệnh deploy build lại trang trước khi tải lên. Cấu hình chỉ định account `480adcbbd23ed4b4da40f804166ce84b`; phiên Wrangler phải có quyền truy cập account đó. Kiểm tra quyền từ `whoami`, tên Worker và URL mà Wrangler trả về. Không lưu token trong repo.

Trong Cloudflare Workers Builds, dùng thư mục gốc repo, build command `pnpm --filter @ranhduong/web build:prelaunch`, deploy command `pnpm --filter @ranhduong/web exec wrangler deploy --config prelaunch/wrangler.jsonc`. Build CI cần cài dependency đúng lockfile; runtime workerd đã được cho phép build trong `pnpm-workspace.yaml`.

## Gắn tên miền

Khi `ranhduong.vn` đã có zone hoạt động trong đúng account, vào Worker `ranhduong-prelaunch` → Settings → Domains & Routes → Add → Custom Domain, nhập `ranhduong.vn`. Kiểm tra DNS hiện tại trước khi thay một record đã phục vụ website khác. Nếu muốn cả `www.ranhduong.vn`, thêm riêng tên đó hoặc cấu hình redirect trong Cloudflare.

Sau khi gắn, mở HTTPS và kiểm tra trang chính, stylesheet, favicon và một URL không tồn tại. Khi có tên miền chính thức, bổ sung canonical và `og:url` cho tên miền đó.

Khi ra mắt sản phẩm, chuyển tên miền sang web SSR theo runbook hạ tầng S02. Landing page không thay đổi route hay dữ liệu của app Nuxt.

Tài liệu: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/), [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
