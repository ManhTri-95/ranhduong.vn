# S33 — Nhắc dữ liệu còn thiếu cho lịch trình

Trong admin `/dia-diem`, cột **Còn thiếu** trên bảng và thẻ điện thoại có dòng **Lịch trình** khi địa điểm cần bổ sung dữ liệu:

- **Chưa có thời lượng ghé**: chưa nhập `visitDurationMin`.
- **Chưa có thời điểm đẹp**: `bestTime` chưa có hoặc rỗng. Trường này vẫn tuỳ chọn, chỉ nhắc để xếp đầu/cuối ngày chính xác hơn.
- **Chưa chọn cụm**: không có cụm hoặc cụm đã không còn trong thành phố.
- **Quá 90 ngày hoặc chưa xác minh**: dùng `verificationStale` hiện có, bao gồm ngày xác minh không đọc được ở nguồn DB (API chuẩn hoá thành chưa xác minh).
- **Sắp cần xác minh**: đã đủ 83 ngày đến hết 90 ngày kể từ lần xác minh cuối, tức còn tối đa 7 ngày. Tại đúng 90 ngày vẫn là sắp cần xác minh; sau đó 1 ms chuyển sang quá hạn. Hai nhắc không xuất hiện cùng lúc.

Các nhắc này không làm đổi điều kiện kích hoạt. Ví dụ một quán đủ vị trí, giờ mở cửa, nguồn xác nhận và nguồn ảnh vẫn được kích hoạt dù thiếu thời lượng, thời điểm đẹp hoặc cụm. Cột/thẻ hiển thị riêng trạng thái đủ điều kiện kích hoạt và các nhắc lịch trình.

Chọn bộ lọc **Nhắc dữ liệu lịch trình** để xem từng loại, kết hợp được với tab trạng thái, tìm tên, cụm, danh mục và nguồn xác nhận. Số đếm tab áp dụng cùng bộ lọc. Lựa chọn lưu trong query `reminder`, giữ qua tải lại và Back; **Xoá bộ lọc** bỏ cả nhắc, giữ tab và cách xếp.

## Thay đổi dữ liệu và triển khai

`AdminPlaceSummary` thêm hai trường tuỳ chọn `visitDurationMin` và `bestTime` (enum `BestTime` có sẵn). Projection MongoDB và hai mapper API/admin truyền chúng tới danh sách; dữ liệu cũ thiếu mảng được API trả `[]`. Nhắc được tính trong admin, theo cùng mốc thời gian dùng cho số đếm và danh sách; mốc được làm mới khi tải lại dữ liệu.

Không có migration, dependency, index, biến môi trường hoặc route mới. Không tự điền dữ liệu thực: mở địa điểm và nhập từ nguồn đã xác nhận theo `docs/data-collection.md`. Triển khai contracts/API/admin cùng phiên bản để danh sách nhận đủ hai trường mới.

## Kiểm chứng local ngày 20/10/2026

- RED→GREEN: schema, mapper và projection MongoDB thực; logic nhắc, biên 83/90 ngày, dữ liệu cũ và lọc theo từng nhắc.
- `pnpm turbo run lint typecheck test build`: **20/20 task đạt**. Contracts 595, API 468, admin 246, web 150, geo 37 test.
- `pnpm --filter @ranhduong/web test:ssr`: **84/84 test đạt**, mã thoát 0.
- Chrome headless trên bản build với 8 địa điểm **Giả Lập**, desktop 1440×1100 và điện thoại 390×844: năm bộ lọc, số đếm tab, deep link/tải lại, chuyển trang và Back, xoá lọc, thẻ/bảng dùng cùng nhắc, vẫn hiển thị đủ điều kiện kích hoạt; ô lọc cao ít nhất 44px; không tràn ngang hoặc lỗi runtime.
- Review độc lập về code không có lỗi cần sửa. `git diff --check` đạt.

Ảnh giao diện: [desktop](assets/s33-reminders-desktop.png), [390px](assets/s33-reminders-mobile.png).

Chờ commit/merge, CI remote, staging S02, thử Android/iPhone thật và theo dõi Sentry 24 giờ theo definition of done. Kiểm Chrome dùng API Giả Lập; không thay dữ liệu thật.
