# ADR 0013: Dữ liệu tự curate, thu thập thủ công, luôn ghi nguồn xác minh

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 1; [product-spec.md](../product-spec.md) mục 4, 10; [data-collection.md](../data-collection.md)

## Bối cảnh

Lợi thế cần giữ là dữ liệu được xác minh (quán còn mở, đúng giờ). MVP chưa có người tại Đà Lạt và chưa thuê cộng tác viên. Scrape Facebook vi phạm điều khoản Meta; dùng ảnh hoặc bài viết khi chưa xin phép có thể bị khiếu nại bản quyền.

## Quyết định

- Thu thập thủ công từ fanpage (tên, địa chỉ, giờ mở cửa, số điện thoại, mức giá), không viết code scrape Facebook, Google Maps hay trang khác.
- Nhắn quán xác nhận tối đa hai lần trong 7 ngày. `verifySource: owner` khi quán đã xác nhận; `admin` khi chỉ dựa trên Facebook (hiển thị nhãn "Thông tin chưa được quán xác nhận") hoặc là điểm công cộng.
- Ảnh chỉ dùng khi có quyền: quán gửi hoặc cho phép, Wikimedia Commons không có điều khoản NC, hoặc ảnh tự chụp. Mỗi ảnh lưu `source`, `credit`, `license`. Không dùng ảnh do AI tạo cho địa điểm có thật.
- Mô tả và ghi chú (`practicalNotes`) tự viết, không chép review của người khác.
- Dữ liệu vào hệ thống qua form admin hoặc import CSV từ Google Sheet (S21), luôn ở dạng nháp và validate bằng Zod.

## Hệ quả

- Địa điểm chỉ kích hoạt được khi có toạ độ, giờ mở cửa hợp lệ, nguồn xác nhận, và mọi ảnh đều có nguồn.
- Quá 90 ngày chưa xác minh thì hiển thị cảnh báo và loại khỏi lịch trình.
- Code, seed và test không được tự bịa dữ liệu thật về địa điểm.
