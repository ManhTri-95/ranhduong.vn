# ADR 0014: Lịch trình của khách không cache kết quả, công khai qua shareId và không lộ nơi ở

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-19
- Nguồn: [backlog-slice-2.md](../backlog-slice-2.md) mục 2; [ADR 0007](0007-in-memory-itinerary-llm-narrative-only.md); [technical-design.md](../technical-design.md) mục 3, 6, 7

## Bối cảnh

ADR 0007 cache kết quả tạo lịch trình theo `paramsHash` trong 7 ngày. Khoá cache không có `cityId`, và muốn cache đúng thì phải giữ thêm tập `itin:byplace` và job xoá cache mỗi khi địa điểm đổi. Thuật toán chạy trong bộ nhớ đã dưới 500 ms, nên phần duy nhất đáng cache là mô tả LLM, vì nó tốn tiền.

Thiết kế cũ cũng trộn `:id` (ObjectId) với `:shareId` ở các endpoint công khai. Lịch trình của khách lại xuất phát từ nơi ở của họ, nên chia sẻ lịch trình có thể làm lộ chỗ họ ở.

## Quyết định

- Không cache kết quả thuật toán. Chỉ cache mô tả LLM đã validate, khoá `itin-narr:{contentHash}`, sống 30 ngày; `contentHash` băm `cityId` cùng `placeId`, `start`, `end` của mọi điểm theo thứ tự.
- Lịch trình của khách được đọc, sửa và lấy ảnh vé qua `shareId` ngẫu nhiên (base62, unique), không bao giờ qua ObjectId. Lịch trình mẫu dùng slug.
- `stayLocation` làm tròn mỗi trục tới 0,005° (khoảng 550 m ở Đà Lạt) trước khi lưu, chỉ dùng để xếp tuyến, không trả trong API, trang hay ảnh vé công khai.

## Hệ quả

- Bỏ trường và index `paramsHash`, khoá `itin:{paramsHash}`, `itin:byplace:{placeId}` và job `itinerary.cacheInvalidate`. Sự kiện `place.updated`, `place.statusChanged` chỉ còn làm mới snapshot địa điểm.
- Cùng tham số có thể ra lịch trình khác khi dữ liệu đổi; đó là điều mong muốn, vì lịch trình luôn theo dữ liệu mới nhất.
- Hai lịch trình cùng nội dung dùng lại một mô tả, không gọi LLM lần nữa. Mô tả không thể cũ, vì nội dung đổi thì khoá đổi.
- Phần còn lại của ADR 0007 (thuật toán trong bộ nhớ, LLM chỉ viết mô tả) giữ nguyên.
