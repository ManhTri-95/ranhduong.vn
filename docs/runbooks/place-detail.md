# S11: trang chi tiết địa điểm

Code S11 đã kiểm ở local trên `feat/S11-place-detail`. Còn CI remote, staging sau S02, điện thoại thật và theo dõi Sentry 24 giờ để đạt đủ DoD.

## Kiểm tự động

Node 24, pnpm 12.9.1. Suite API dùng MongoDB và Redis local với database test riêng; suite SSR dùng API giả lập riêng, không đọc `.env` hay dữ liệu thật.

```bash
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

Luôn chạy `test:ssr` sau build. CI hiện có sẵn bước này. Ngày 2026-10-09: cả 20 task workspace thành công, 720 test unit/tích hợp và 26 test SSR qua. Build vẫn có cảnh báo chunk admin và deprecation từ dependency Nuxt đã có; lint không có lỗi/cảnh báo.

| Tiêu chí | Bằng chứng |
| --- | --- |
| Ảnh, nguồn ảnh và ô “Ảnh đang cập nhật” | HTTP test lọc ảnh thiếu nguồn/credit/license; SSR kiểm WebP srcset, bìa eager/high và attribution; Chrome kiểm ảnh tải, mở nguồn ảnh và thiếu ảnh |
| Giờ mở cửa theo Việt Nam | Dùng `openStatus` đã có; test bảng cả tuần, nhiều ca, cả ngày, ca qua nửa đêm; Chrome đổi giờ sang 06:00 VN và kiểm lần mở tới 07:00 |
| Cập nhật khi để trang mở | Đồng hồ client cập nhật mỗi 30 giây và khi visibility đổi; Chrome kiểm đổi thời điểm trên cùng trang |
| Ghi chú thực tế, thuộc tính và liên hệ | HTTP/SSR kiểm dữ liệu; Chrome 390px/1440px kiểm các link Maps, tel, fanpage, bảng giờ và nguồn ảnh; tắt JavaScript vẫn dùng được các link và đọc được nội dung SSR |
| Quá 90 ngày chưa xác minh | Dùng `verificationStale`; Chrome kiểm đúng 90 ngày không cảnh báo, thêm 1ms thì cảnh báo; ngày hiển thị theo UTC+7 |
| Quán chưa xác nhận | Dùng `needsOwnerConfirmation`; nhãn xuất hiện trong SSR và Chrome, vẫn xem được giờ mở cửa |
| Sáu địa điểm gần đó | Test HTTP dùng index 2dsphere thật; xếp gần nhất, loại chính địa điểm đang xem, các trạng thái riêng tư và thành phố khác |
| Đã đóng cửa | Trang 200, ẩn chỉ đường, ba chỗ tương tự gần nhất (tính cả danh mục phụ); kiểm HTTP, SSR và Chrome |
| URL ổn định | API và web trả 301 từ slugHistory/merged tới slug chính; merge vòng, thiếu đích, đích riêng tư hoặc khác thành phố trả 404; test HTTP/SSR |
| 404, lỗi API và cache | SSR kiểm 404/503 no-store, retry/hồi phục, SWR 3600 cho trang chi tiết; HTML cache không chứa nhãn mở/đóng theo thời điểm render |
| Quay lại danh sách | Chrome tải 20 → 40 → 45 thẻ, mở thẻ 43 rồi Back: giữ 45 thẻ, hết cursor và cuộn 5552 → 5552; lọc thẻ không lẫn snapshot |
| Mạng lỗi khi tải thêm | Chrome giữ 20 thẻ, hiện lỗi và thử lại tải tiếp; không mất danh sách |

## Payload và hydration

Nuxt 4.5.2 mặc định tách payload của route SWR ra `_payload.json` ngay từ lượt tải đầu. Nếu API chi tiết trả 503 nhưng API thành phố thành công, HTML có tên thành phố; request payload cũng trả 503 và bị client bỏ qua, gây lệch hydration.

`experimental.payloadExtraction: 'client'` đưa dữ liệu lượt đầu vào HTML, giữ payload tách cho các lần điều hướng sau. Cấu hình được hỗ trợ trong [schema chính thức Nuxt 4.5.2](https://github.com/nuxt/nuxt/blob/v4.5.2/packages/schema/src/config/experimental.ts). Đã thấy test hồi quy đỏ trước sửa, rồi xanh sau build; Chrome xác nhận retry sau lỗi một phần không còn cảnh báo hydration. Không đổi SWR hay header no-store.

## Kiểm trình duyệt local

Chrome headless ở 390×844 và 1440×1000, dữ liệu đều mang tên Giả Lập. Đã kiểm không tràn ngang, nút liên hệ cao ít nhất 44px, cột liên hệ sticky trên desktop, trạng thái động, nguồn ảnh, Back, retry và tắt JavaScript. Không ghi nhận exception JavaScript hay cảnh báo hydration trong các luồng đã kiểm.

Ảnh local và kết quả nằm ở `.superpowers/s11/{mobile.png,desktop.png,back-list.png,results.json}` (không commit dữ liệu thử). Review độc lập cả phần triển khai và sửa payload không có phát hiện đáng kể.

## Kiểm tiếp trên staging và điện thoại thật

- Sau S02, dùng địa điểm đã xác minh và ảnh R2 hợp lệ; kiểm API công khai, URL canonical, 301, cache/no-store và CORS.
- Thử Chỉ đường trên Google Maps Android/iOS, Gọi quán trên thiết bị có SIM và fanpage trong trình duyệt/app.
- Thử bảng giờ, ảnh, cuộn, thanh hành động, Back sau tải thêm, mạng chậm và retry trên Android/iPhone thật.
- Theo dõi Sentry 24 giờ sau deploy. S12 bổ sung bản đồ; S17 bổ sung OG, JSON-LD và sitemap; S18 bổ sung tracking.
