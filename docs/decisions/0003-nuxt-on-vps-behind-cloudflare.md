# ADR 0003: Nuxt SSR chạy trên VPS sau Cloudflare, chưa lên Workers

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [architecture.md](../architecture.md) mục 2, 3, 7, 9, 11; [technical-design.md](../technical-design.md) mục 1, 11, 13

## Bối cảnh

Web khách cần SSR cho SEO (trang địa điểm, danh sách, lịch trình mẫu). Ngân sách hạ tầng MVP dưới khoảng 600 nghìn đồng/tháng, một người vận hành. Nuxt gọi API trong gần như mọi trang, nên đặt hai thứ cạnh nhau thì gọi được qua mạng nội bộ. Cloudflare Workers là phương án edge nhưng chưa có số liệu cho thấy cần.

## Quyết định

- Nuxt 4 SSR (Node) chạy container `web` trên một VPS Docker Compose, cùng `api`, `worker`, `redis` và `cloudflared`.
- Mọi traffic đi qua Cloudflare: DNS, CDN, WAF; cache trang công khai theo `routeRules` (SWR); Cloudflare Tunnel để VPS chỉ mở cổng SSH.
- R2 lưu ảnh (`media.ranhduong.vn`, cache dài vì tên file có hash), ảnh vé và bản backup.
- Nuxt gọi API qua `http://api:3001`, không đi vòng ra Internet.
- Chưa build preset Cloudflare và chưa chạy trên Workers. Chỉ chuyển ở bước 5 của kế hoạch mở rộng, khi render SSR chiếm phần lớn CPU của VPS dù đã cache ở Cloudflare; khi đó Nuxt gọi API qua `api.ranhduong.vn`.

## Hệ quả

- VPS là điểm lỗi duy nhất ở MVP, mức này chấp nhận được. Bật tuỳ chọn phục vụ bản cache khi origin lỗi để trang đã cache vẫn hiển thị.
- Khi dữ liệu đổi, worker xoá cache Cloudflare theo đúng các URL liên quan, không xoá toàn bộ.
- Staging chạy cùng VPS bằng một Compose project riêng (`staging.`). GitHub Actions build image lên GHCR; merge vào `main` tự deploy staging, tag `v*` deploy production.
- Còn mở: Cloudflare Tunnel hay reverse proxy Caddy, nhà cung cấp và vị trí VPS (architecture mục 11).
