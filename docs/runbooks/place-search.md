# S13 — Tìm kiếm không dấu và gợi ý

Ô tìm kiếm trên trang chủ và `/{city}/tim-kiem` tìm theo tên, tên khác, danh mục chính/phụ và thẻ. Ví dụ từ khoá `ca phe may` khớp tên `Cà phê Mây`; fixture kiểm thử có tên rõ là giả lập. Không phân biệt dấu, chữ hoa/thường hay thứ tự các từ; khớp tiền tố từng từ. Kết quả ưu tiên độ khớp tên, rồi thứ tự nổi bật đã dùng ở S09.

Khi có ít nhất 2 ký tự sau chuẩn hoá, ô tìm kiếm chờ 250 ms rồi gọi `GET /v1/cities/:city/places?q=…&limit=6`. Chọn gợi ý bằng chạm, chuột hoặc phím lên/xuống và Enter sẽ mở trang địa điểm. Enter khi chưa chọn gợi ý và nút Tìm gửi form GET tới trang kết quả SSR. Escape, xoá từ khoá, rời form hoặc đổi trang huỷ yêu cầu; phản hồi cũ không thay kết quả mới. Bộ gõ tiếng Việt không gửi yêu cầu trong lúc composition và Enter xác nhận composition không gửi form.

Gợi ý có trạng thái đang tìm, rỗng và lỗi. Nút Thử lại đưa focus về ô tìm kiếm rồi tải lại. Tắt JavaScript vẫn tìm bằng form GET; trang kết quả giữ `no-store` và `noindex, follow`.

## Atlas Search

Local MongoDB: để `PLACE_SEARCH_INDEX=`. API dùng cách tìm trong bộ nhớ hiện có, đủ cho vài trăm địa điểm mỗi thành phố; không cần Atlas để phát triển hay chạy CI.

Trên Atlas:

1. Trong database dùng bởi API, chọn collection `places` và tạo Search index tên `places-public` bằng JSON ở [`apps/api/config/place-search-index.json`](../../apps/api/config/place-search-index.json).
2. Chờ index ở trạng thái sẵn sàng truy vấn, rồi đặt `PLACE_SEARCH_INDEX=places-public` trong cấu hình API và khởi động lại API.
3. Kiểm tra tên/tên khác có dấu và không dấu, cả Unicode NFC và NFD, ví dụ `Mây` và `Ma\u0302y`, chữ `đ`, truy vấn nhiều từ và tiền tố như `ca ph ma`.
4. Kiểm tra tìm theo thẻ, danh mục phụ, `limit=6`, thành phố khác và địa điểm vừa chuyển sang hidden/closed. Chỉ active của thành phố đang xem được trả về.
5. Thử lỗi index: API trả lỗi theo hợp đồng chung; ô gợi ý báo lỗi và cho thử lại. Để quay về cách local, xoá giá trị `PLACE_SEARCH_INDEX` và khởi động lại API.

Index dùng regexSplit giữ chữ/số/dấu tổ hợp trong một từ, chuẩn hoá NFC rồi lowercase/asciiFolding. Truy vấn chuẩn hoá không dấu và ghép `wildcard` tiền tố an toàn cho từng từ, kết hợp tên danh mục/thẻ qua trường token. Cách này theo tài liệu MongoDB về [tokenizer](https://www.mongodb.com/docs/search/indexes/analyzers/tokenizers/), [token filter](https://www.mongodb.com/docs/search/indexes/analyzers/token-filters/) và [wildcard trên trường đã phân tích](https://www.mongodb.com/docs/search/query/operators-collectors/wildcard/).

Atlas chỉ cung cấp ứng viên. API vẫn đọc tập địa điểm active hiện tại để kiểm quyền hiển thị, lọc danh mục/cụm/thẻ/toạ độ, giữ số đếm thẻ và xếp hạng chung với local. Vì vậy chưa giảm thao tác đọc toàn bộ tập active ở quy mô lát 1. Index cập nhật trễ có thể tạm bỏ sót địa điểm vừa thêm hoặc đổi tên; bản ghi đã ẩn không được trả lại chỉ vì còn trong index.

## Kiểm chứng

- `pnpm turbo run lint typecheck test build`: kiểm toàn workspace, API integration dùng MongoDB/Redis local và database test riêng.
- `pnpm --filter @ranhduong/web test:ssr`: kiểm bản Nuxt production, form GET/combobox SSR, không gọi gợi ý lúc render server, `no-store` và `noindex`.
- Chrome headless 390×844 (touch) và 1440×1000: gõ không dấu, 6 gợi ý, điều hướng bằng phím/chạm/chuột, yêu cầu trả sai thứ tự, xoá/Escape, composition, lỗi/thử lại và focus. Kiểm form GET khi tắt JavaScript; không có lỗi JavaScript hay tràn ngang.
- Review độc lập phát hiện và đã sửa focus khi Thử lại cùng chuẩn hoá NFD của index; hồi quy đã thấy đỏ rồi xanh. Guard Enter composition kiểm bằng event `isComposing` và `keyCode=229` trên Chrome; chưa thay thế kiểm bộ gõ thật trên Safari.

Ảnh dùng dữ liệu giả: [390px](assets/s13-search-mobile.png), [desktop](assets/s13-search-desktop.png).

Chưa kiểm trực tiếp trên Atlas thật, staging, điện thoại thật/Safari và Sentry 24 giờ; chưa merge hay mở PR. Cần hoàn thành các mục đó theo definition of done của backlog trước khi đánh dấu story Xong.
