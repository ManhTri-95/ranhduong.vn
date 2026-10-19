# S21 — Nhập hàng loạt địa điểm bằng CSV

Vào **Import CSV** trong nhóm Nội dung hoặc từ trang Địa điểm (`/import`).

1. Tải **CSV mẫu**, thay/xoá các dòng có chữ **GIẢ**. Mỗi địa điểm giữ một `id` ổn định và không tái sử dụng trong cùng thành phố.
2. Trong Google Sheets, tải tab Địa điểm dưới dạng CSV UTF-8. Giới hạn 256 KiB, 500 dòng dữ liệu, dấu phẩy. Có thể để trống trường chưa rõ như địa chỉ/toạ độ/giờ/phone; không tự suy đoán thông tin thật.
3. Chọn file, bấm **Kiểm tra file**. Dòng sẵn sàng được chọn sẵn. Mở **Xem dữ liệu dòng** để kiểm ID Sheet/OSM, danh mục, địa chỉ/toạ độ/phone, giờ và các trường đã map. Sửa dòng lỗi theo bảng rồi tải lại, hoặc nhập các dòng hợp lệ trước. Nghi trùng mặc định **Bỏ qua dòng**; đối chiếu dòng đang nhập và địa điểm đang có (link mở tab mới) rồi chủ động chọn **Vẫn tạo** nếu cần.
4. Bấm **Tạo N địa điểm nháp**. Bước kết quả có link Hoàn thiện từng nháp; bổ sung ảnh và điều kiện còn thiếu trước khi kích hoạt. Sheet không tự đổi: đánh dấu imported=yes cho các dòng đã tạo.

File mẫu: [dia-diem-mau.csv](../../apps/admin/public/samples/dia-diem-mau.csv). Quy ước đầy đủ: [data-collection §5](../data-collection.md#5-bảng-theo-dõi).

## Schema hiện tại

- Danh mục: attraction, cafe, food, activity, stay, shop. `also_category` tối đa 2 danh mục, không lặp/chính; giá trị cách nhau `;`.
- `cover`: full, partial, none. Chỉ khi trống mới dùng `indoor` cũ: yes→full, no→none.
- Có `website` ngoài `fanpage`. Link phải http/https. Phone chuẩn hoá 0…/84…/+84… về +84…; OSM ID có tiền tố node/, way/, relation/.
- `latlng` nhập vĩ độ trước, lưu GeoJSON `[lng,lat]`; dùng parser giờ hiện tại (nhiều ca, qua đêm, 24h, Đóng), không nhận ca chồng nhau.
- `status` trong Sheet: Đã xác nhận/Sẵn sàng đăng→owner, Đăng chưa xác nhận→admin. Trạng thái khác và imported=yes bị bỏ qua trước validate dữ liệu.
- Chỉ tạo `draft`/`source=admin`, không đặt lastVerifiedAt và không lấy ảnh từ Drive/URL.

## Retry và chống trùng

API kiểm lại file và database lúc tạo, không tin dữ liệu đã map ở browser. ID Sheet/OSM/phone trùng trong cùng thành phố luôn bỏ qua (bao gồm draft/hidden/closed/merged), không vượt qua bằng Vẫn tạo. Nghi trùng dùng thuật toán hiện có theo vị trí/tên/fanpage; thấy nghi trùng mới ở bước kết quả thì bấm **Kiểm tra lại file này** để chọn lại.

Khoá nguồn `importKeys` trên Place tách khỏi các trường sửa trong form, unique multikey theo cityId và partial khi có string. Chỉ mục được đảm bảo trước khi import; không cần backfill địa điểm cũ, vì API cũng so phone chuẩn hoá và OSM ID hiện tại. Các khoá cũ vẫn tồn tại sau sửa form; không dùng unique phone cho mọi địa điểm để tránh ảnh hưởng dữ liệu cũ. Không ghi đè nội dung/timestamp của bản đã có. Thiếu mọi định danh thì dùng hash nội dung để chống nhập lại đúng nội dung; sửa CSV khi thiếu ID có thể được xem là dòng mới, vì vậy nên luôn có ID. Xoá hẳn nháp sẽ xoá cả khoá nguồn của nháp đó.

Mất mạng hoặc hết phiên: **giữ tab này mở**. File/lựa chọn còn trong bộ nhớ; đăng nhập ở tab mới rồi thử lại. Nếu một phần đã ghi trước khi lỗi, lần thử lại bỏ qua các địa điểm đã tạo. Đóng/tải lại tab phải chọn file lại. Dòng lỗi/không chọn không chặn nhập các dòng hợp lệ. Dòng trong báo cáo là dòng bắt đầu bản ghi CSV, tính cả ô nhiều dòng.

## Kiểm tra local

- Contracts: 41 ca cho dữ liệu hiện tại, dữ liệu đối chiếu, nguồn xác nhận, lọc status/imported, indoor, phone, toạ độ, giờ, BOM/CRLF/quotes/multiline, tiêu đề, số ô và giới hạn; hồi quy giờ có hậu tố sai/ca chồng qua nửa đêm và cuối tuần.
- MongoDB thật: 17 ca service cho preview không ghi, field mới, các trạng thái cũ, aliases thiếu/null ở bản ghi cũ, retry giữ timestamp, chỉnh dữ liệu rồi nhập lại, phone chuẩn hoá, hash fallback, nghi trùng trong DB/file, dữ liệu đổi sau preview, race và scope thành phố.
- HTTP thật với MongoDB/Redis: 4 ca cho phiên admin/Origin, preview/tạo/retry, schema/row selection/size và JSON lớn hơn 100 KiB.
- Admin: controller 5 ca cho lựa chọn mặc định, override, mất mạng/hết phiên, file đọc/phản hồi về muộn, giới hạn và bấm tạo hai lần; kiểm sample có 6 danh mục qua parser thật.
- Chrome headless, API giả cho kiểm UI (persistence/auth thực đã kiểm ở HTTP): desktop 1440px và 390px, tải mẫu, chọn file/kiểm/tạo, dòng lỗi kèm cách sửa, lựa chọn nghi trùng, retry 401/500, focus heading, không tràn ngang, không lỗi console. Ảnh local trong `.superpowers/sdd/2026-10-16-s21-csv-import/`.

Lệnh kiểm toàn workspace: `pnpm turbo run lint typecheck test build`.

Kết quả local 16/10/2026: **20/20 task thành công, 1.232 test** (contracts 436, geo 37, API 411, admin 204, web 144). Review độc lập phát hiện 3 vấn đề quan trọng; cả ba đã có test tái hiện thất bại rồi sửa xanh. Sau đó chạy lại toàn workspace và kiểm Chrome với dữ liệu đối chiếu đều đạt. Sửa setup test chi tiết địa điểm để chờ index 2dsphere trước truy vấn, tránh lỗi khi suite chạy đồng thời; không đổi route công khai.

## Nghiệm thu trước ra mắt

- CI remote và deploy staging; thử với CSV dữ liệu thu thập thật. Đặt cột ID/phone ở định dạng Văn bản để Sheet giữ dấu + và số 0 đầu.
- Thử trên Android/iPhone thật, chọn file từ Drive/Files và quay lại sau đăng nhập Google.
- Thử hai tab import cùng file, đối chiếu số nháp và Sheet, bổ sung ảnh/kích hoạt đúng nguồn xác nhận.
- Theo dõi Sentry ít nhất 24 giờ. Không đánh dấu story Xong chỉ bằng kiểm local.
