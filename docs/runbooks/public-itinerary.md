# S16 — Trang lịch trình mẫu

Trang khách nằm ở `/{city}/lich-trinh/{slug}`; Đà Lạt dùng `/da-lat/lich-trinh/{slug}`. Chọn lịch trình đã công khai từ trang chủ hoặc mở link trong phần xem trước của admin S15. Mẫu còn nháp, loại `user`, `unlisted`, sai thành phố hoặc không tồn tại trả 404.

## Xem lịch và bản đồ

- Tiêu đề, mô tả, mùa, phong cách, số ngày, phương tiện và nhịp độ lấy từ bản đã soạn. Mọi ngày, giờ ghé, ghi chú và nút Chỉ đường render SSR; chưa bật JavaScript vẫn đọc và mở chỉ đường được.
- Link **Ngày 1…5** cuộn tới ngày tương ứng và chọn ngày trên bản đồ. Số bắt đầu lại từ 1 mỗi ngày, giữ nguyên cả khi cùng một địa điểm được ghé nhiều lần. Giờ dùng lịch đã lưu, không tự tính lại theo thời điểm khách mở trang.
- **Xem bản đồ lịch trình** mới tải component, MapLibre, CSS và worker. Ghim số khớp timeline, nét đứt nối các điểm liên tiếp theo thứ tự; đường đi thực tế dùng Google Maps URL. Có `maxBounds` của thành phố, `minZoom: 11`, nguồn OpenFreeMap/OpenMapTiles/OpenStreetMap luôn hiển thị.
- Bấm số ở timeline mở, chọn và cuộn/focus bản đồ; bấm ghim cuộn/focus tiêu đề điểm tương ứng. Ghim của hai lượt ghé cùng vị trí được dịch nhẹ để bấm riêng. Chuyển ngày vẽ lại các ghim và khung nhìn; desktop đặt bản đồ ở cột phải, mobile đặt sau timeline.
- Chỗ không còn active, bị xoá hoặc khác thành phố giữ ô lịch giờ với chữ **Điểm ghé đang cập nhật**; không trả tên, toạ độ, link hay ghi chú riêng của chỗ đó. Đường nối không bắc qua ô bị thiếu. Ngày rỗng có hướng dẫn chọn chỗ trên bản đồ thành phố.
- Thời gian di chuyển là ước lượng đã lưu từ S15; trang nhắc khách xem lại giờ mở cửa ở trang địa điểm trước khi đi.

## Chia sẻ

**Zalo** và **Messenger** mở bảng chia sẻ của thiết bị để khách chọn ứng dụng. Danh sách đích phụ thuộc thiết bị và ứng dụng đã cài ([Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)); cần HTTPS ngoài localhost. Không dùng SDK bên thứ ba, không cần Meta App ID và không tự gửi tin nhắn.

Khi thiết bị không hỗ trợ bảng chia sẻ hoặc thao tác bị chặn, trang copy link và hiện nút **Mở Zalo/Messenger để dán link**. **Copy link** luôn thử clipboard trực tiếp. Clipboard bị chặn thì hiện ô đường dẫn readonly, focus chọn toàn bộ để khách chép tay. Đóng bảng chia sẻ không báo thành công và không tự copy. Các thao tác có trạng thái cho trình đọc màn hình và chặn bấm lặp khi đang chia sẻ.

Link chia sẻ là canonical `https://ranhduong.vn/{city}/lich-trinh/{slug}`, không mang query hoặc hash chọn ngày. Trang có title/description và OG từ nội dung S15; ảnh OG dùng ảnh bìa hợp lệ của điểm ghé đầu tiên có ảnh. Vé ảnh, JSON-LD/sitemap và lịch trình cá nhân thuộc các story sau.

## API, cache và lỗi

`GET /v1/cities/:city/itineraries/templates/:slug` trả `ItineraryTemplateDetail` trong contracts: metadata và `days:[{day,stops:[{key,number,start,end,travelMinFromPrev,note,kind,place|null}]}]`. `key` công khai là số ngày–thứ tự; không trả ObjectId địa điểm, ownership hoặc chẩn đoán admin. PlacesService đọc batch các địa điểm active đúng thành phố, chỉ trả trường công khai đã validate.

Mẫu cũ thiếu metadata/ghi chú có mặc định; thiếu ngày được bổ sung ngày rỗng theo `params.days`, mô tả lấy `narrative` khi chưa có `description`. Cấu trúc stops, ID và giờ hỏng được kiểm trước khi truy cập hoặc query database, trả 404 thay vì 500. Không ghi ngược hay thay đổi mẫu khi khách xem.

SWR **86400 giây** cho `/da-lat/lich-trinh/**` và rule thành phố động hiện có. Khi thêm thành phố phải thêm rule prefix cụ thể như S10. Trang cached là snapshot; sau khi đổi mẫu hoặc ẩn địa điểm cần xoá cache URL liên quan để thay đổi có hiệu lực ngay. Luồng invalidation theo sự kiện trong thiết kế hệ thống chưa thuộc S16.

API lỗi SSR trả **503, no-store**, giữ nội dung đã tải và có **Thử lại**; 404 cũng no-store. Lỗi style/tile/import thư viện bản đồ có **Thử lại bản đồ**; lỗi tải component trước khi mount có **Tải lại để mở bản đồ**, vì browser có thể giữ lỗi import URL. Lịch giờ/chỉ đường vẫn dùng được. Map được huỷ khi rời trang; cuộn/pan tôn trọng reduced motion.

## Kiểm chứng local

Node 24/pnpm 12.9.1:

```text
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

20 task workspace xanh; 45 test SSR production xanh. S16 có 14 test HTTP Nest/MongoDB thật, 5 test contracts, 3 test dữ liệu bản đồ và 8 test chia sẻ. Đã kiểm RED→GREEN cho endpoint mới, dữ liệu cũ hỏng và việc bỏ ghi chú riêng tư; kiểm browser phát hiện/sửa noscript gây lệch hydration và worker bị tải sớm.

Chrome headless **390×844** và **1440×1000**, dữ liệu ghi rõ **Giả Lập**, tile OpenFreeMap thật: timeline hai ngày, giờ/ghi chú/chỉ đường, day/marker selection, focus/scroll hai chiều, cùng địa điểm ghé lại, style lỗi/thử lại, component chunk lỗi/tải lại, SSR API lỗi/thử lại, không tràn ngang, không JavaScript, không exception hoặc cảnh báo hydration. Native share/clipboard được mô phỏng để kiểm payload canonical, thành công, huỷ, bị chặn và các phương án copy/chép tay; không gửi tin nhắn đến tài khoản thật.

Ảnh kiểm chứng: [mobile](assets/s16-itinerary-mobile.png), [desktop](assets/s16-itinerary-desktop.png), [bản đồ mobile](assets/s16-itinerary-map-mobile.png), [chia sẻ mobile](assets/s16-itinerary-share-mobile.png).

## Còn kiểm trước Definition of Done

- CI remote và staging S02, dữ liệu địa điểm đã thu thập, publish/unpublish/ẩn chỗ và cache URL.
- Android/iPhone thật: chọn Zalo/Messenger trong bảng chia sẻ, gửi link vào cuộc trò chuyện thử nghiệm của chủ dự án, mở link nhận được; trình duyệt trong ứng dụng, quyền clipboard và kéo/chạm bản đồ.
- Sentry không có lỗi mới trong 24 giờ staging. Chưa đánh dấu story **Xong** trước các bước này.
