# S17 — SEO kỹ thuật

Code trên `feat/S17-technical-seo`. Các trang nội dung công khai có title, description, canonical, OG/Twitter và BreadcrumbList trong HTML SSR. Trang địa điểm thêm loại theo danh mục chính/phụ, địa chỉ/toạ độ/giờ khi đã có dữ liệu; chỉ đưa rating của nền tảng khi đủ 3 đánh giá. Trang đã đóng không quảng bá giờ cũ. Ca 24h chuẩn hoá thành 00:00–23:59 theo Google; đóng lúc 24:00 thành 00:00 ngày kế, ca cũ có hai đầu 07:00 giống nhau tách qua hai ngày để giữ đúng khoảng mở. Danh sách dùng ItemList; mẫu lịch trình dùng TouristTrip, giữ thứ tự các ngày và lần ghé lặp lại, bỏ điểm không còn công khai.

## Cấu hình Nuxt khi chạy server

```dotenv
NUXT_PUBLIC_SITE_URL=https://ranhduong.vn
NUXT_PUBLIC_INDEXABLE=true
NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
```

Staging đặt `NUXT_PUBLIC_SITE_URL=https://staging.ranhduong.vn` và `NUXT_PUBLIC_INDEXABLE=false`. Khi đó robots chặn toàn bộ, HTTP thêm `X-Robots-Tag: noindex, nofollow`, HTML có noindex và sitemap con rỗng. Đặt biến trên tiến trình Nuxt production, không chỉ lúc build. Khởi động lại sau khi đổi cấu hình; nếu tái sử dụng cache/CDN giữa môi trường, xoá cache cũ trước khi mở staging. Không dùng chung cache staging và production.

Canonical và OG URL bỏ query/fragment. Trang thẻ/cursor `noindex, follow`; tìm kiếm `no-store` và noindex. `/l/**`, `/owner/**`, `/admin/**` noindex/no-store. Robots public chặn các khu riêng tư và URL tìm kiếm có query. Admin nằm trên host riêng: HTML admin đã có noindex; duy trì Cloudflare Access của S04/S26.

## Sitemap và cache

`/sitemap.xml` trỏ tới 4 sitemap ở gốc:

- `/sitemap-pages.xml`: thành phố active, 4 danh mục công khai, bản đồ và các cụm hiện có.
- `/sitemap-places.xml`: địa điểm active/closed, chỉ slug chính.
- `/sitemap-lists.xml`: danh sách published.
- `/sitemap-itineraries.xml`: mẫu published/public, cấu trúc đọc được qua service chi tiết.

API nguồn `/v1/seo/sitemap/{pages|places|lists|itineraries}` trả DTO được validate bằng contracts. Module SEO gọi service của module nghiệp vụ; repository chỉ đọc collection của mình. Không đưa nháp, địa điểm hidden/suspected/merged, mẫu riêng tư/cá nhân, thành phố tắt hoặc tổ hợp query vào sitemap. `lastmod` dùng `updatedAt` đã lưu; thiếu thì bỏ, không thay bằng thời điểm request. Sitemap XML escape nội dung, URL tuyệt đối và UTF-8.

Sitemap và các trang công khai SWR 1 giờ; lịch trình mẫu SWR 1 ngày. Lỗi 404/503 `no-store`, lỗi nguồn sitemap trả 503 và hồi phục trên cùng URL. Cache tách query. Hiện giới hạn 50.000 URL mỗi loại; nếu mở rộng vượt ngưỡng, chia shard trước khi tăng dữ liệu. Thêm thành phố thì thêm `routeRules` cụ thể cùng prefix như Đà Lạt (hạn chế Nitro đã ghi ở S10). Invalidation theo sự kiện khi sửa dữ liệu chưa thuộc triển khai này; dữ liệu hiển thị theo TTL hiện có.

## Ảnh OG 1200×630

Worker ảnh tạo thêm `{key}/og.webp` bằng sharp đã có, tự xoay/cắt cover, bỏ metadata và xoá cùng các bản 400/800/1200 khi dọn ảnh. Trang có cover dùng bản này. Trang không có ảnh dùng `/og-default.png`, 1200×630; tái tạo bằng `node apps/web/scripts/generate-og-default.mjs` (màu đọc từ design tokens).

Ảnh đã xử lý trước S17 cần backfill **trước khi bật phiên bản web này**. Dùng cấu hình API của môi trường tương ứng, build API rồi chạy:

```powershell
pnpm turbo run build --filter=@ranhduong/api
pnpm --filter @ranhduong/api media:backfill:og
pnpm --filter @ranhduong/api media:backfill:og --apply
```

Lệnh đầu là dry-run. `--apply` chỉ tạo derivative còn thiếu từ bản WebP công khai 1200px, không đụng ảnh gốc; chạy lại bỏ qua bản đã có. Cần quyền list/get/put ở bucket công khai. Lỗi quyền/storage dừng với exit 1. Kiểm GET một URL `{mediaBase}/{key}/og.webp` sau khi backfill. Không chạy backfill production trong phiên triển khai code này.

## Search Console

1. Tạo Domain property `ranhduong.vn` và thêm TXT DNS theo mã tài khoản Google cung cấp, hoặc tạo URL-prefix property `https://ranhduong.vn/` và chọn HTML tag.
2. Với HTML tag, chỉ đặt **giá trị content** vào `NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION`; deploy/khởi động Nuxt rồi kiểm source HTML `/da-lat` có đúng token. Không đặt token giả hoặc dán cả thẻ meta.
3. Bấm Verify trong Search Console bằng tài khoản sở hữu. Domain property đã xác minh DNS không cần meta token. Giữ bản ghi/token sau khi Verify.
4. Gửi `https://ranhduong.vn/sitemap.xml` trong mục Sitemaps. Dùng URL Inspection và Live Test cho trang chủ, một danh mục, địa điểm, curate và mẫu lịch trình.
5. Kiểm canonical Google chọn, khả năng index, JSON-LD bằng Rich Results Test và Schema Markup Validator. TouristTrip/ItemList vẫn là dữ liệu schema ngay cả khi công cụ Google không cung cấp rich result tương ứng.

Chưa xác minh property thật trong phiên này: chưa có token/thông tin DNS hoặc quyền tài khoản Search Console. Sau deploy cần ghi kết quả Verify, sitemap submission và URL Inspection vào đây; không đánh dấu story Done trước khi hoàn thành.

Nguồn chuẩn: [Google: sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Google: robots](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec), [Google: xác minh property](https://support.google.com/webmasters/answer/9008080), [Schema.org TouristTrip](https://schema.org/TouristTrip), [Schema.org OpeningHoursSpecification](https://schema.org/OpeningHoursSpecification).

## Kiểm tra đã chạy

- `pnpm turbo run lint typecheck test build`: 20/20 task xanh; Vitest API 334, web 72, contracts 318, geo 37, admin 110 test xanh.
- `pnpm --filter @ranhduong/web test:ssr`: 59/59 test xanh trên Nuxt production. Kiểm head/JSON-LD, query canonical, thứ tự ItemList, giờ/geo, sitemap XML/lastmod/SWR, lỗi nguồn/cache/recovery, staging noindex, token xác minh giả lập và PNG thực 1200×630.
- Đã xem ảnh OG mặc định. Giao diện nội dung không thay đổi.

Review độc lập phát hiện giờ mở cả ngày và thành phố cũ có slug sai; đã tái hiện test đỏ, sửa và chạy test xanh. Chờ CI remote, backfill ảnh cũ nếu có, deploy/staging, Search Console thật, Android/iPhone thật và Sentry 24 giờ theo definition of done. Không ghi story là Xong chỉ vì test local xanh.
