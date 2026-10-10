# S15 — Soạn lịch trình mẫu

Admin mở **Lịch trình mẫu** tại `/lich-trinh`, chọn **Tạo lịch trình** hoặc mở một bản đã lưu. Trang soạn là `/lich-trinh/{id}`; bản mới dùng `/lich-trinh/moi`. Desktop từ 1200px có ba cột: kho địa điểm, lịch trình theo ngày, xem trước. Màn hình nhỏ dùng các nút **Kho địa điểm**, **Lịch trình**, **Xem trước**; sửa nhanh giờ, ghi chú, thay địa điểm và chuyển ngày bằng nút/select.

## Cách soạn

1. Nhập tên, mô tả, mùa, phong cách, phương tiện và nhịp độ. Chọn **Ngày đầu là** để kiểm tra đúng giờ mở cửa theo thứ; mặc định thứ Bảy, các ngày tiếp theo nối tiếp và quay vòng qua Chủ nhật.
2. Tạo 1–5 ngày, mỗi ngày tối đa 20 điểm. Kho tìm tên có dấu/không dấu, lọc danh mục chính/phụ và khu vực. Kéo địa điểm vào ngày, trước một điểm hoặc vùng cuối ngày; kéo điểm giữa các ngày để đổi vị trí. Trên điện thoại/bàn phím, chọn **Thêm vào ngày**, bấm **Thêm**, dùng **Lên/Xuống** hoặc **Chuyển sang ngày**. Bỏ ngày có điểm cần xác nhận.
3. Chọn giờ bắt đầu từng ngày. Thời gian dừng lấy từ địa điểm, hoặc mặc định 60 phút nếu chưa có dữ liệu; đây là dự kiến có thể sửa. Chọn **Bữa ăn** cho điểm dùng làm bữa trưa/tối. Nhập ghi chú riêng từng điểm.
4. Giờ sau tự tính từ giờ đi trước và di chuyển ước lượng: khoảng cách chim bay × 1,4 ÷ 25 km/h, làm tròn 5 phút. Không dùng thời gian Google Maps hay bộ tối ưu lịch trình. Có thể sửa giờ đến/đi; nhãn **Đã sửa tay** hiện ra, giờ đó được giữ khi sắp lại và các điểm sau tính tiếp từ đó. **Tính lại tự động** bỏ cả hai giờ sửa tay. Giờ đi nhập `HH:mm`, chấp nhận `24:00`; lịch trình vượt nửa đêm cần chuyển sang ngày tiếp theo.
5. Xem trước **Điện thoại** với tiêu đề, mô tả, lịch giờ và ghi chú đang soạn. Xem **Google** là mô phỏng kết quả tìm kiếm, dùng tiêu đề/mô tả Google tùy chọn hoặc nội dung chính; Google có thể hiển thị khác. Bản xem trước cập nhật ngay trước khi lưu. Slug sinh một lần khi tạo và giữ khi đổi tên.
6. **Lưu nháp** cho phép ngày rỗng, lịch giờ có lỗi nghiệp vụ hoặc điểm đang ẩn. Các ô sai định dạng giờ/thời lượng phải sửa trước khi lưu lên API; bản trên máy vẫn giữ nội dung đang nhập dở. **Công khai lịch trình** chỉ bật khi có tên và hết lỗi; nhắc nhở không chặn. Enter trong form không lưu/công khai. Sau khi công khai dùng **Lưu và công khai** hoặc **Chuyển về nháp**.

## Lỗi và nhắc nhở

| Kiểm tra | Mức |
| --- | --- |
| Ngày chưa có điểm; địa điểm mất hoặc khác thành phố | Lỗi |
| Địa điểm nghi ngờ, ẩn, đã đóng, đã gộp; thiếu toạ độ | Lỗi |
| Toàn bộ lượt ghé không được giờ mở cửa bao phủ đúng thứ | Lỗi |
| Giờ đảo ngược, chồng nhau, thiếu thời gian di chuyển, trước giờ bắt đầu hoặc vượt ngày | Lỗi |
| Địa điểm còn nháp | Nhắc |
| Quá 90 ngày chưa xác minh/chưa xác minh; chưa có ảnh hợp lệ | Nhắc |
| Lịch đi qua 11:30–13:30 hoặc 18:00–20:00 nhưng thiếu điểm bữa ăn trong khung tương ứng | Nhắc |
| Kết thúc sau 21:30 | Nhắc |

Giờ đi đúng lúc đóng cửa được chấp nhận; ghé xuyên khoảng nghỉ giữa hai ca không được. Ca qua đêm của thứ trước được tính. Các quy tắc cụm liền kề/mái che mùa mưa thuộc lát sau. Nháp địa điểm có dữ liệu hợp lệ vẫn được dùng để công khai mẫu theo Spec UI §12.

## API và dữ liệu

- `GET /v1/admin/cities/:city/itineraries/templates`: danh sách mẫu và chẩn đoán theo dữ liệu địa điểm hiện tại.
- `POST /v1/admin/cities/:city/itineraries/templates`: tạo, trả 201.
- `GET /v1/admin/itineraries/templates/:id`: đọc mẫu; loại `user` trả 404.
- `PUT /v1/admin/itineraries/templates/:id`: lưu nội dung/trạng thái, giữ thành phố và slug.
- `GET /v1/admin/cities/:city/template-places`: dữ liệu kho và giờ mở cửa/toạ độ dùng để tính lịch.
- `POST /v1/admin/cities/:city/itineraries/templates/preview`: phân tích bản chưa lưu, không ghi database.

Input contracts `TemplateEditInput`: `{title,description,season,style,transport,pace,startWeekday,seoTitle,seoDescription,status,days:[{startTime,stops:[{key,placeId,kind,note,durationMin?,manualStart?,manualEnd?}]}]}`. `key` là UUID duy nhất trong lịch trình; cùng địa điểm có thể ghé lại với key khác. API bỏ trường ngoài schema, đọc địa điểm đúng thành phố và tự tính giờ/di chuyển; không tin số phút hay chẩn đoán client gửi. Công khai có lỗi trả `400 VALIDATION_FAILED` kèm chi tiết. Mọi route quản trị cần phiên admin, ghi cần Origin hợp lệ.

Collection `itineraries` hiện có được bổ sung metadata, thứ đầu tiên, giờ bắt đầu ngày, key/ghi chú/thời lượng/giờ sửa tay; vẫn lưu giờ tính được và `locked` cho mỗi điểm. Unique `{cityId,kind,slug}` và retry hậu tố chống trùng. Mẫu cũ chưa có ngày được bổ sung ngày rỗng theo `params.days` khi đọc; điểm cũ giữ giờ đã lưu. Mẫu cũ chưa có slug dùng `lich-trinh-{id}`, được ghi xuống khi sửa lần đầu; bản ghi sai schema bị bỏ khỏi danh sách thay vì làm hỏng toàn bộ trang. Không thêm dependency hoặc biến môi trường.

Admin lưu mẫu và xoá nháp cùng dùng khóa Redis `lock:admin-template-write`, chờ tối đa khoảng 2 giây, lease 120 giây, gia hạn mỗi 20 giây và kiểm quyền sở hữu trước ghi MongoDB; giải phóng chỉ khi owner khớp. Kiểm tham chiếu và xoá database nằm trong khóa; xoá ảnh đi sau, ngoài khóa. Địa điểm đã được mẫu tham chiếu trả `409 CONFLICT`; phải bỏ khỏi mẫu trước khi xoá. Redis lỗi, khóa bận hoặc mất quyền sở hữu thì từ chối ghi và cho thử lại. Test kiểm cả hai request đồng thời và owner bị thay thế. Đây là lease điều phối, không phải transaction MongoDB: cần giám sát Redis và tránh treo tiến trình/ghi MongoDB vượt lease; Atlas transaction có thể thay thế khi cần bảo đảm nghiêm ngặt hơn.

Chẩn đoán là snapshot lúc đọc/lưu; sửa giờ mở cửa/trạng thái địa điểm sau đó không tự chuyển mẫu published thành nháp. Nút **Kiểm lại dữ liệu địa điểm** tải dữ liệu mới, và mỗi lần công khai API kiểm lại. Thẻ mẫu trên trang chủ chỉ đọc published theo hành vi S09. Trang khách `/da-lat/lich-trinh/{slug}`, SSR/SEO đầy đủ và chia sẻ thuộc S16/S17; URL trong xem trước S15 chưa cung cấp trang khách đầy đủ.

## Khôi phục và kiểm chứng

LocalStorage giữ bản đang soạn theo thành phố/ID, kể cả giờ nhập dở và thời lượng chưa hợp lệ. Khi trở lại chọn **Khôi phục** hoặc **Bỏ bản trên máy**; lưu thành công xoá bản cục bộ. Mất mạng/hết phiên giữ nguyên form và có link đăng nhập lại. Khi storage bị chặn/hết chỗ, không báo đã giữ và có xác nhận trước rời trang/đóng tab nếu còn thay đổi chưa được giữ.

Đã chạy Node 24/pnpm 12.9.1: `pnpm turbo run lint typecheck test build` (20 task), `pnpm --filter @ranhduong/web test:ssr` (37 test). Logic shared, API HTTP với Nest/MongoDB/Redis thật và model editor có test hồi quy; bao gồm cả mẫu cũ, khôi phục input sai và lưu/xoá đồng thời. Rà soát độc lập đã nêu các trường hợp trên và các bản sửa có test RED→GREEN.

Chrome headless dùng dữ liệu **Giả Lập**, 1440×1000 và 390×844: kéo chuột thật từ kho, drop/chuyển ngày, nút đổi thứ tự, giờ sửa tay/tính nối tiếp, Enter không công khai, dữ liệu lỗi chặn/nhắc vẫn công khai, lưu/đổi URL/nháp, xem trước chưa lưu, hết phiên/khôi phục, giờ nhập dở/thời lượng sai, chặn rời trang khi storage lỗi. Kiểm không tràn ngang và không lỗi runtime. Ảnh: [desktop](assets/s15-editor-desktop.png), [390px](assets/s15-editor-mobile.png), [Google](assets/s15-editor-google.png).

Chờ CI remote và staging S02: thử dữ liệu địa điểm đã thu thập, ngày/giờ thật, qua đêm, ca nghỉ, thay trạng thái khi soạn, hai tab lưu/xoá nháp; kiểm Redis lỗi và retry. Thử iPhone/Android thật với bàn phím giờ, thay chỗ/ghi chú, khôi phục sau đăng nhập. Kiểm Sentry 24 giờ trước khi đánh dấu story **Xong**.
