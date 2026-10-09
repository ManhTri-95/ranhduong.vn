# S10: kiểm trang danh mục và khu vực

S10 đã xong code ở local trên `feat/S10-category-zone-pages`, cập nhật từ `main` ngày 2026-10-09. Story chưa đạt đủ DoD: còn merge lên main remote, CI, staging sau S02, điện thoại thật và theo dõi Sentry 24 giờ.

## Kiểm tự động

Node 24, pnpm 12.9.1. MongoDB và Redis cần cho suite API; suite SSR web dùng API giả lập riêng, không cần MinIO hay cấu hình đăng nhập.

```bash
docker compose up -d mongo redis
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

`test:ssr` cần bản `.output` mới, nên luôn chạy sau build. CI chạy hai lệnh cuối theo thứ tự này. Test khởi động API fixture và Nuxt trên cổng ngẫu nhiên, rồi dừng cả hai sau khi kiểm; tên dữ liệu giả có chữ "Giả Lập". Không dùng `.env` hay database đang làm việc. `typecheck` kiểm strict cả file test và cấu hình SSR; server test cố định biến cổng/host Nitro và bỏ cấu hình socket/TLS kế thừa để không ảnh hưởng máy đang làm việc.

| Tiêu chí | Bằng chứng |
| --- | --- |
| Lọc thẻ theo "và"; đếm thẻ trước khi lọc | Test contracts, `place-listing.test.ts`, endpoint thật trong `places.controller.test.ts`, query/chip web |
| Cursor; không trùng hoặc sót khi chèn/ẩn chỗ ở cursor | Test cursor contracts, logic API, HTTP endpoint, `appendUnique`; kiểm trình duyệt bấm hai lần liên tiếp |
| 4 URL danh mục, URL khu vực và SSR | `tests/listing-ssr.test.ts`; đã kiểm local với Nest/MongoDB thật trong database test riêng |
| SWR 1 giờ trên trang gốc, lọc thẻ, trang sau | Test SSR kiểm `s-maxage=3600`, `stale-while-revalidate`; HTML đã cache vẫn trả 200 khi API tạm lỗi, URL query mới trả 503 |
| Trang lọc/trang sau noindex, follow | Test query web và meta trong HTML production |
| Slug sai 404; API lỗi 503; lỗi không cache | Test SSR kiểm `no-store` cho 404 HTML/JSON, 503 và phục hồi cùng URL |
| Tìm kiếm S09 không bị cache | Test SSR `/da-lat/tim-kiem?q=...` vẫn `no-store` |

## Kết quả kiểm local ngày 2026-10-09

- Kiểm cuối: 20 task lint/typecheck/test/build thành công, 703 test unit/tích hợp và 20 test SSR qua. Test hồi quy SSR đã được thấy đỏ trên bản cũ rồi xanh sau sửa; strict typecheck cho test và trường hợp biến Nitro kế thừa cũng đã kiểm.
- Kiểm HTTP với Nest/MongoDB thật: 27 request qua; 25 quán cà phê giả lập, 28 địa điểm trong cụm; trang sau lần lượt 5 và 8 địa điểm; lọc hai thẻ còn 8.
- Chrome headless 390×844: không tràn ngang, chip cao ít nhất 44px; lọc thẻ, URL sắp a-z, giữ focus chip, tải thêm giữ URL và chuyển focus tới thẻ mới; bấm liên tiếp không nhân đôi địa điểm.
- API tạm lỗi khi tải thêm: giữ 20 thẻ đã tải, hiện thông báo; bật API rồi bấm lại tải đủ 25. Cụm rỗng gợi ý đúng cụm khác.
- Tắt JavaScript thật trong Chrome: form GET lọc thẻ, link cursor và "Về đầu danh sách" chạy được.
- Desktop 1440px: 3 cột, không tràn ngang. Không có exception JavaScript hay cảnh báo hydration trong các luồng đã kiểm.

Cache S10 dùng rule `/da-lat/...` cụ thể để cùng nhánh tĩnh với trang chủ. Khi thêm thành phố, thêm rule tương ứng vào `nuxt.config.ts`; route Nuxt vẫn dùng `[city]`. Không đổi URL công khai.

## Phần còn chờ

- Push/merge phần bổ sung lên main remote và kiểm CI.
- Deploy staging sau S02, kiểm lại URL, header cache, tắt JavaScript, retry và link trên dữ liệu đã xác minh.
- Thử tay trên Android và iPhone nếu có; kiểm focus, cuộn ngang chip và mạng yếu.
- Theo dõi Sentry 24 giờ.
- S11: giữ các trang đã tải và vị trí cuộn khi Back từ trang chi tiết. S17: canonical, OG, JSON-LD và sitemap. S02: chuẩn hoá cache key query lạ.
