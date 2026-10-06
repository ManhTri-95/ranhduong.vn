# Quyết định kiến trúc (ADR)

Mỗi quyết định quan trọng một file `NNNN-ten-ngan.md`, dưới 40 dòng, gồm ba phần: Bối cảnh, Quyết định, Hệ quả. Đổi quyết định thì viết ADR mới, đặt ADR cũ thành "Bị thay bởi ADR NNNN", không xoá.

Quyết định nhỏ (thêm thư viện, đổi phiên bản, cấu hình) ghi một dòng vào [../decisions.md](../decisions.md).

| ADR | Quyết định |
| --- | --- |
| [0001](0001-google-places-place-id-only.md) | Google Places chỉ dùng `place_id` và link chỉ đường |
| [0002](0002-keep-mongodb-over-postgres.md) | Giữ MongoDB, không chuyển sang PostgreSQL |
| [0003](0003-nuxt-on-vps-behind-cloudflare.md) | Nuxt SSR trên VPS sau Cloudflare, chưa lên Workers |
| [0004](0004-admin-spa-on-cloudflare-pages.md) | Admin là app Vue 3 + Vite riêng trên Cloudflare Pages, sau Cloudflare Access |
| [0005](0005-modular-monolith-nestjs.md) | Một API NestJS dạng monolith có module, worker cùng codebase |
| [0006](0006-point-ledger-and-atomic-limits.md) | Sổ cái điểm append-only, thao tác có giới hạn số lượng làm nguyên tử |
| [0007](0007-in-memory-itinerary-llm-narrative-only.md) | Lịch trình tính trong bộ nhớ, LLM chỉ viết mô tả |
| [0008](0008-maplibre-openfreemap.md) | Bản đồ MapLibre + OpenFreeMap, style tự sửa |
| [0009](0009-server-sessions-and-guest-id.md) | Phiên phía server trong Redis, ID khách tạm bằng cookie |
| [0010](0010-stable-public-urls-and-slugs.md) | URL công khai ổn định, slug không dấu, đổi slug thì 301 |
| [0011](0011-shared-zod-contracts.md) | Kiểu dữ liệu dùng chung định nghĩa bằng Zod trong `packages/contracts` |
| [0012](0012-self-counted-place-metrics.md) | Tự đếm số liệu địa điểm qua Redis, không lưu sự kiện thô |
| [0013](0013-self-curated-verified-data.md) | Dữ liệu tự curate, thu thập thủ công, luôn ghi nguồn xác minh |

Khuôn mẫu:

```markdown
# ADR NNNN: <quyết định, một câu>

- Trạng thái: Đề xuất | Đã chấp nhận | Bị thay bởi ADR NNNN
- Ngày: YYYY-MM-DD
- Nguồn: <tài liệu, mục, hoặc spec trong docs/superpowers/>

## Bối cảnh
## Quyết định
## Hệ quả
```
