# S12: bản đồ địa điểm công khai

Code đã triển khai trên `feat/S12-public-map`, tách từ `main` trước khi sửa code. Route `/{city}/ban-do` có khung và danh sách SSR; MapLibre chỉ khởi chạy trên client khi mở bản đồ. S22 tiếp tục làm style sổ tay và sprite ghim riêng.

## Cấu hình và API

- `NUXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/positron`: runtime config Nuxt, đổi được khi triển khai mà không sửa component. Không cần API key.
- `City.center`, `City.mapBounds` từ API quyết định tâm và maxBounds; minZoom là 11. Khung Đà Lạt dùng dữ liệu seed S03, không tạo khung riêng trong frontend.
- API hiện có `GET /v1/cities/:city/places` nhận `bbox=west,south,east,north` hoặc `near=lat,lng&radius=metres` (radius 1–50000). Không kết hợp hai chế độ; query sai trả 400 `VALIDATION_FAILED`.
- Chỉ query địa lý trả `PlaceCard.location`. Chỉ địa điểm active của đúng thành phố, có vị trí trong vùng, được đưa lên bản đồ. Lọc danh mục tính cả danh mục phụ.
- Giữ giới hạn 50 điểm mỗi trang và cursor hiện có. Web tải hết các trang của viewport, loại slug lặp, kiểm schema mỗi trang và huỷ truy vấn khi vùng/danh mục đổi.

## Kiểm đã chạy ở local

Node 24, pnpm 12.9.1; test API dùng database MongoDB tạm. Không chèn dữ liệu giả vào database thật.

```bash
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

Cả 20 task workspace và 29 test SSR đã xanh. Test mới gồm 17 ca schema địa lý, 10 ca HTTP API, 6 ca tải dữ liệu/GeoJSON và 3 ca SSR bản đồ. Review độc lập không còn lỗi đáng kể sau các bản sửa.

| Tiêu chí S12 | Bằng chứng |
| --- | --- |
| Tải theo vùng đang xem | HTTP kiểm bbox và bán kính; Chrome xác nhận query đổi khi zoom/chọn cụm; tất cả bbox nằm trong City.mapBounds |
| Lọc danh mục | HTTP và Chrome kiểm danh mục chính/phụ; bộ lọc cập nhật query URL và có form GET khi tắt JavaScript |
| Gom cụm | GeoJSON source có cluster; Chrome với 65 điểm: bấm cụm phóng tới mức tách điểm |
| Bấm marker mở thẻ | Chrome bấm điểm sau khi tách cụm: mở đúng thẻ và link trang địa điểm; danh sách có nút Xem ghim cho bàn phím |
| Nguồn OSM | OpenStreetMap, OpenMapTiles, OpenFreeMap luôn nằm trên bảng địa điểm, vừa màn 390px; không bị cắt hoặc che |
| Chỉ tải khi mở bản đồ | Chrome kiểm trang chủ không tải MapLibre, worker, CSS bản đồ, style hoặc tile; mở route bản đồ mới tải |
| Tile và style cấu hình | Chrome dùng positron thật của OpenFreeMap, xem được đường và nhãn Đà Lạt, glyph tiếng Việt; fixture địa điểm đều mang tên Giả Lập |
| maxBounds/minZoom | Dùng khung seed Đà Lạt; Chrome thu nhỏ tới giới hạn, nút Thu nhỏ bị vô hiệu hoá; query không vượt khung |

Chrome headless kiểm 390×844 và 1440×900: không tràn ngang; nút lọc ít nhất 44px; có đủ danh sách/thẻ/thu gọn; desktop danh sách trái và bản đồ phải, thu gọn vẫn mở lại được. Không có lỗi console hoặc hydration trong lượt kiểm cuối với OpenFreeMap thật.

Ảnh kiểm tra dùng địa điểm giả: [điện thoại](assets/s12-map-mobile.png), [thẻ đang chọn](assets/s12-map-selected.png), [desktop](assets/s12-map-desktop.png).

## Lỗi và hồi quy

- API lỗi: giữ các địa điểm đã tải, hiện thông báo và Thử lại. Lỗi SSR trả 503 no-store; thành phố không có trả 404.
- Style/tile hoặc WebGL lỗi: danh sách vẫn sử dụng được, có nút Thử lại bản đồ. Import JS/CSS lỗi thì nút thử lại tải lại URL hiện tại: Chrome giữ lỗi import cho cùng URL nên chỉ gọi lại import không đủ.
- Các chế độ bảng trên điện thoại có chiều cao cố định. Chrome đã tái hiện test đỏ khi danh mục rỗng gây 5 request do resize; bản sửa chỉ gọi 1 request và không lặp.
- Nested reactive nội dung trong `<noscript>` gây lệch hydration khi JavaScript bật; đã thay bằng chữ tĩnh và kiểm Chrome không còn cảnh báo.
- Khi chọn địa điểm trước lúc map tải xong, load handler đồng bộ tâm với lựa chọn. Callback của map cũ bị bỏ qua sau retry hoặc unmount.

## Nghiệm thu còn lại

- [ ] Commit/PR, CI remote và merge theo quy trình dự án.
- [ ] Staging sau S02: cấu hình API public/internal và style URL; kiểm tile/glyph/worker sau proxy và chính sách CSP thực tế.
- [ ] Điện thoại thật Android/iPhone: kéo, pinch zoom, chọn cụm/ghim, cuộn danh sách, vùng an toàn, xoay màn hình, quay lại từ trang địa điểm.
- [ ] Kiểm dữ liệu địa điểm thật nằm trong khung đã duyệt; khung seed hiện vẫn là bản phác thảo S03.
- [ ] Theo dõi Sentry 24 giờ. Chỉ chuyển story sang Xong khi đủ definition of done.
