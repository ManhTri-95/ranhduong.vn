# S20 — Trang pháp lý và ghi nguồn

Code đã triển khai; chưa deploy. Ba trang SSR tĩnh không gọi API để tải nội dung và vẫn đọc được khi tắt JavaScript.

| Trang | Đường dẫn |
| --- | --- |
| Điều khoản sử dụng | `/dieu-khoan` |
| Quyền riêng tư | `/quyen-rieng-tu` |
| Ghi nguồn | `/ghi-nguon` |

Footer chung ở mọi trang khách và trang lỗi HTML có liên kết tới cả ba trang. Tiêu đề, mô tả, canonical, Open Graph, breadcrumb JSON-LD và quy tắc staging noindex dùng composable SEO hiện có. Web thêm ba URL vào `sitemap-pages.xml`; ngày hiển thị và lastmod lấy từ nội dung trong `app/shared/lib/legal-pages.ts`, không lấy ngày chạy server.

## Nội dung và cấu hình

Nội dung mô tả chức năng hiện tại: cẩm nang tham khảo, ảnh có quyền sử dụng, bộ đếm địa điểm không dùng cookie định danh, mã băm IP/thông tin trình duyệt ngắn hạn, tổng hợp hằng ngày và thời hạn Redis, Umami chỉ tải sau opt-in, local storage giữ lựa chọn, phiên quản trị Google và các yêu cầu tới bên cung cấp bản đồ/phông chữ/ảnh. Không mô tả tài khoản khách hay các tính năng của lát sau như đã có.

Đặt email thật có người theo dõi trên tiến trình Nuxt trước khi ra mắt:

```dotenv
NUXT_PUBLIC_LEGAL_CONTACT_EMAIL=
```

Biến này là địa chỉ công khai, dùng cho yêu cầu về quyền riêng tư, sửa thông tin và bản quyền ảnh. Khi chưa cấu hình, trang nói rõ kênh tiếp nhận sẽ được công bố trước khi ra mắt. Không dùng email giả trong production. Bộ kiểm tra dùng email có tên Giả Lập trên `example.com`.

Khi nội dung thay đổi, cập nhật `lastmod` của trang tương ứng trong `legal-pages.ts`. Không sửa URL đã công khai. Ngày được hiển thị ở giờ Việt Nam.

## Consent và ghi nguồn

Panel Umami có link **Đọc chính sách quyền riêng tư**. Trên các trang pháp lý, panel nằm trong luồng trang để người đọc xem được toàn bộ nội dung và footer trước khi chọn. Nhận diện bằng matched route records để URL có dấu `/` cuối vẫn có hành vi này. Link **Đến tuỳ chọn đo lượt truy cập** dẫn tới `#analytics-settings`; lựa chọn vẫn theo cơ chế S18.

Nguồn OSM/OpenFreeMap/OpenMapTiles hiện cạnh bản đồ địa điểm và bản đồ lịch trình, gồm link `https://www.openstreetmap.org/copyright`. Không chuyển credit bản đồ xuống footer hoặc che dưới bottom sheet. Các nguồn tham khảo đã đối chiếu: [OpenStreetMap copyright](https://www.openstreetmap.org/copyright), [OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines), [OpenFreeMap quick start](https://openfreemap.org/quick_start/).

Trên trang địa điểm, **Nguồn ảnh** mở sẵn bằng `<details open>`: từng ảnh có loại nguồn, credit, license và source URL khi có. Nguồn vẫn hiện khi ảnh lỗi hoặc JavaScript bị tắt. Có ghi chuyển WebP/thay đổi kích thước/cắt khung và link tới `/ghi-nguon#anh-dia-diem`. Chính sách ghi nguồn phân biệt quyền sử dụng từng ảnh; tham khảo [Creative Commons](https://creativecommons.org/cc-licenses/).

## Kiểm chứng local

- `pnpm turbo run lint typecheck test build`: 20 tác vụ workspace thành công, gồm test tích hợp MongoDB/Redis thật.
- Sau sửa consent và ngày cập nhật, `pnpm turbo run lint typecheck test build --filter=@ranhduong/web --output-logs=errors-only`: 8 tác vụ web/phụ thuộc thành công; 78 unit test web.
- `pnpm --filter @ranhduong/web test:ssr`: **64 test thành công**. S20 kiểm ba trang khi API 503, footer trang chủ/bản đồ/địa điểm/404 HTML, email cấu hình, canonical, sitemap đúng loại/ngày; kiểm staging noindex và sitemap rỗng.
- Chrome headless ở 390px và 1440px: footer có vùng bấm 44px và không che thanh liên hệ, nguồn ảnh mở sẵn, OSM thấy được trên bản đồ, không tràn ngang; các trang pháp lý/nguồn ảnh/footer dùng được khi tắt JavaScript; không có lỗi runtime hoặc cảnh báo hydration.
- Hồi quy consent: kiểm footer thất bại trước sửa trên URL chuẩn và URL có `/` cuối; cùng kiểm tra qua sau sửa, trước khi chọn analytics, ở mobile/desktop. Review độc lập đã xác nhận không còn finding.

Ảnh chụp dùng dữ liệu Giả Lập:

- [Quyền riêng tư 390px](assets/s20-privacy-mobile.png)
- [Điều khoản desktop](assets/s20-terms-desktop.png)
- [Footer 390px](assets/s20-footer-mobile.png)
- [Nguồn ảnh 390px](assets/s20-photo-credits-mobile.png)
- [Panel consent có link quyền riêng tư](assets/s20-consent-mobile.png)

## Còn kiểm trước khi ra mắt

- Điền email liên hệ thật và kiểm mở ứng dụng email từ link.
- CI remote; deploy/staging S02; kiểm footer, canonical, noindex và nội dung pháp lý trên tên miền thật, với cấu hình Umami thực tế.
- Điện thoại Android/iPhone thật: đọc trước khi chọn consent, mở lại lựa chọn, đi tới footer từ trang địa điểm/bản đồ, nguồn ảnh và safe-area.
- Theo dõi Sentry 24 giờ trên staging theo definition of done.
