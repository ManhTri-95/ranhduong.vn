# UX trang lịch trình và trang chủ

13/10/2026. Làm theo spec `docs/superpowers/specs/2026-10-13-home-itinerary-ux-design.md` và plan `docs/superpowers/plans/2026-10-13-home-itinerary-ux.md` (hướng A, trang lịch trình trước). Tiếp nối `docs/runbooks/mobile-ux-p0.md`.

## Đã làm

### Trang lịch trình `/{city}/lich-trinh/{slug}`

- **Phần đầu:** eyebrow "Lịch trình · số ngày", chip phương tiện, nhịp độ, mùa, phong cách, dòng tổng quan "{n} điểm · {m} bữa ăn · khu vực" (`entities/itinerary/lib/itinerary-summary.ts`). Mô tả dài hơn 160 ký tự rút còn 3 dòng kèm "Đọc thêm".
- **Timeline:** tiêu đề ngày có khung giờ "07:00 → 20:00"; mỗi điểm có nút chỉ đường tròn 44px thay cho nút vàng 52px. Bỏ địa chỉ. Ghi chú dài hơn 90 ký tự rút 2 dòng; "Xem thêm" dùng checkbox + label (`rd-clamp`, `rd-more-*` trong `components.css`), không cần JavaScript. Giữ nguyên móc chuyển động S25.
- **Thanh ngày dính** (`RdItineraryDayBar`): tự đổi ngày theo điểm đang xem. Trên điện thoại có công tắc **Lịch | Bản đồ**. Bản đồ dùng `RdItineraryMap` cao `max(280px, 55dvh)` cùng dải thẻ điểm `RdItineraryStopCarousel`: vuốt thẻ thì đổi ghim, bấm ghim thì dải cuộn tới thẻ. Đổi ngày thì chọn điểm đầu có vị trí. Vào Bản đồ thì trang cuộn để bản đồ nằm ngay dưới thanh.
- **Thanh cố định** (`RdItineraryActionBar`, chỉ client): nút Chia sẻ và nút hai dòng "Chỉ đường · điểm n" / tên quán cho điểm đang xem (`activeStopKey`, vạch 40% màn hình). HTML SSR vẫn chỉ có một link `direction_click` cho mỗi điểm.
- **Desktop:** bản đồ cột phải tự tải khi sắp vào màn hình (IntersectionObserver) và dính theo; khối chỉ đường nằm dưới bản đồ.
- **Bản đồ:** `needsPan` chuyển sang `shared/lib/map-camera.ts`, dùng chung cho bản đồ thành phố và bản đồ lịch trình; bản đồ chỉ dịch khi ghim bị che.

### Trang chủ `/{city}`

- Ô tìm kiếm ngay dưới tiêu đề. Chip danh mục một hàng cuộn ngang (áp dụng cả trang danh mục).
- Ô thời tiết gọn: nguồn, miễn trừ và "Lưu ý" nằm trong ô.
- Banner mùa chuyển vào đầu mục "Đi theo lịch có sẵn" (slot `lead` của `RdItineraryStrip`).
- Thẻ lịch trình kiểu vé: đầu vé ghi số ngày khi chưa có ảnh, chip mùa, "{n} điểm · phương tiện · nhịp độ".
- Quán nổi bật: 4 trên điện thoại, 6 trên desktop, kèm "Xem tất cả trên bản đồ".
- Thêm "Theo khu vực". "Gợi ý theo chủ đề" cuộn ngang trên điện thoại.
- Desktop: phần đầu hai cột khi có thời tiết; lịch trình xếp lưới 3 cột.
- **API:** `ItineraryCard` thêm `stopCount` (mọi điểm dừng) và `season`. Repository đọc thêm `season`. Cả hai trường là optional để web đọc được bản API cũ trong lúc deploy.

### Trang chủ đề `/{city}/top/{slug}` (yêu cầu thêm ngày 13/10/2026)

- Dòng tổng quan "{n} địa điểm · danh mục · khu vực" (`entities/curated-list/lib/list-summary.ts`, có test).
- Nút Chia sẻ (bảng chia sẻ của máy, không có thì copy link) và "Mở bản đồ".
- Số thứ tự: trên điện thoại là vòng tròn đè góc ảnh, thẻ giữ đủ chiều rộng; từ 768px là số Lora "01" ở cột trái với gạch màu nhấn.
- Desktop: phần giới thiệu dính bên trái, danh sách một cột bên phải.
- Mục "Chủ đề khác" lấy từ danh sách curate; API danh sách lỗi thì chỉ ẩn mục này.
- Kiểm: SSR thêm assert dòng tổng quan, số "01" và thứ tự địa điểm (80/80); Chrome 320/390/768/1440 không tràn ngang.

### Trang danh mục và khu vực: tab danh mục, chip lọc thẻ (yêu cầu thêm ngày 13/10/2026)

- Danh mục trên trang danh mục thành tab điều hướng (`RdCategoryChips variant="tabs"`, class `rd-tabs`/`rd-tab`); trang chủ giữ chip lối tắt.
- `RdTagFilter`: nhãn "Lọc theo thẻ", chip `rd-chip--tag` nền `--mist` có số chỗ và dấu ✓ khi chọn, xuống dòng thay cho cuộn ngang, `visibleTagChips` gom phần quá 8 thẻ (thẻ đang chọn luôn hiện), dòng "Đang lọc: … · Bỏ lọc". Không đổi URL, API hay form GET.
- Kiểm: unit `tag-chips.test.ts` (số chỗ, rút gọn) đỏ rồi xanh; SSR thêm assert tab, nhãn, số chỗ, dòng đang lọc (81/81); Chrome 320/390/1440 không tràn ngang, tab không phải cuộn.

## Đã kiểm

- `pnpm turbo run lint typecheck test build`: 20/20 task (geo 37, contracts 395, admin 120, web 137, api 389 test). `pnpm --filter @ranhduong/web test:ssr`: 79/79, gồm assert mới (dòng tổng quan, không render thanh cố định ở SSR, `direction_click` = 3, thẻ vé, tìm kiếm đứng trước thời tiết, link khu vực, banner mùa trong mục lịch trình).
- Chrome headless qua CDP ở 390×844 (có cảm ứng), 320×640 và 1440px, với dữ liệu local thật. Lịch trình:
  - Thanh ngày dính và hiện viền khi cuộn; nhảy "Ngày 2" thì tiêu đề nằm dưới thanh (y=76).
  - Công tắc Bản đồ đưa bản đồ lên y=58; vuốt dải thẻ đổi điểm và ghim; bấm ghim thì thẻ đổi theo; đổi ngày chọn điểm đầu có vị trí; quay lại Lịch thì timeline hiện lại.
  - Thanh cố định đổi điểm theo khi cuộn, cuối trang là điểm cuối; ở 320px tên hiện trọn trên dòng riêng.
  - Nút Chia sẻ cuộn tới "Rủ bạn đi cùng" khi `navigator.share` lỗi.
  - Desktop tự tải bản đồ cột phải; không tràn ngang.
- Trang chủ: tìm kiếm ở y=189 (390px; trước là 553) và y=210 (320px); chip 1 hàng; 4 hoặc 6 quán; desktop hai cột; không tràn ngang.
- Test S24 "never extends weather freshness…" từng hỏng chập chờn 2/6 lần: fixture `expired` hết hạn trước 1ms, nằm trong độ lệch `Date.now()` giữa hai process trên Windows. Đã đổi thành hết hạn trước 60 giây (biên chính xác do `contracts/weather.test.ts` kiểm); sau đó 5/5 lần xanh.
- Server dev giữ HTML SWR cũ cho URL đã mở, nên lần đầu xem sau khi sửa template có thể có cảnh báo hydration. Kiểm bằng URL có query mới thì không còn cảnh báo. Build production và SSR test không bị ảnh hưởng.

## Sửa sau review độc lập

Reviewer (Opus) kết luận "With fixes": 1 Critical, 8 Important. Đã sửa cả 9; mỗi lỗi được tái hiện trước bằng Chrome headless CDP hoặc unit test (đỏ), sau đó xanh:

- Mở Bản đồ từ vòng số điểm 3 không còn nhảy về điểm 1: dải thẻ bắt đầu ở thẻ đang chọn và bỏ qua lần báo đầu của IntersectionObserver.
- Dải thẻ không tự cuộn khi đang vuốt; khi tự cuộn xong thì đọc lại thẻ đang dừng.
- Thanh chỉ đường giữ đúng điểm sau các lần code tự cuộn (chọn ngày, quay lại Lịch, bấm ghim desktop), qua `holdActive`.
- Điểm chưa có vị trí: `actionBarMode` (có unit test) quyết định nút mở bản đồ ngày hoặc dòng "vị trí đang cập nhật". Không có thông tin thành phố thì không vào được chế độ Bản đồ.
- API: thẻ lịch trình nổi bật theo mùa có `season` và `stopCount` (`itineraries.service.test.ts`).
- Link "Chọn thêm chỗ trên bản đồ thành phố" nằm sau mục chia sẻ, thấy được trên điện thoại.
- Chip ngày tự cuộn vào hàng; dưới 400px chỉ ghi "Ngày n".
- Mở Bản đồ từ vòng số thì focus sang tiêu đề bản đồ.
- Ô thời tiết: vòng focus màu sáng; màu chữ, viền pha từ token bằng `color-mix`.
- Kiểm lại: web 141 unit, SSR 80/80, API 390/390, build xanh. Các lỗi Minor ghi trong ledger `.superpowers/sdd/2026-10-13-home-itinerary-ux/progress.md`.

## Còn chờ

- Điện thoại thật Android, iPhone: cử chỉ vuốt dải thẻ trong khi kéo bản đồ, bảng chia sẻ của hệ điều hành, vùng an toàn.
- Lịch trình có ngày không có điểm nào có vị trí: chưa có dữ liệu thật để xem trên trình duyệt. Đã có unit test `firstLocatedKey` và nhánh template "Chưa có vị trí công khai cho ngày này."
- Cập nhật artifact Design System theo Spec UI §4, §5 đã sửa. CI remote, staging, Sentry 24 giờ.

## Ngoài phạm vi

- Nút "Mở cả ngày trên Google Maps" (URL nhiều điểm dừng): cần spike kiểm giới hạn số điểm dừng trên app điện thoại.
- Vé lịch trình dạng ảnh (lát 2), "Lưu", thanh điều hướng dưới, trang tìm kiếm.
