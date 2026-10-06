# ADR 0007: Lịch trình tính trong bộ nhớ bằng heuristic, LLM chỉ viết mô tả

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 1, 7; [architecture.md](../architecture.md) mục 6, 7, 9; [product-spec.md](../product-spec.md) mục 8

## Bối cảnh

Lịch trình hợp lý theo cụm khu vực, giờ mở cửa và thời tiết là khác biệt chính so với TikTok hay ChatGPT. Mỗi thành phố có khoảng 200 địa điểm và 40.000 cạnh khoảng cách. Mục tiêu p95 dưới 500 ms khi tạo lịch trình. LLM thì chậm, tốn tiền và có thể bịa ra địa điểm.

## Quyết định

- Thuật toán viết bằng TypeScript, chạy trong bộ nhớ API: cache theo `paramsHash` → chọn mẫu gần nhất → lọc ứng viên → chấm điểm → gán cụm cho ngày → chọn điểm → nearest neighbor + 2-opt → xếp giờ → chèn bữa ăn → gợi ý điểm tiện đường → VIP (tối đa 2 điểm/ngày, có nhãn "Đối tác").
- Thời gian di chuyển lấy từ `distance_matrix` (chạy OSRM local một lần). Thiếu cạnh thì dùng khoảng cách chim bay × 1,4 ÷ 25 km/h.
- LLM chỉ viết mô tả, chạy bất đồng bộ trong worker, trả JSON được validate bằng Zod và **không được thêm hay đổi địa điểm**. Lỗi hoặc quá 8 giây thì dùng mô tả mẫu. Web polling `GET /itineraries/:id/narrative`; chuyển sang SSE sau.
- OR-Tools (VRPTW, microservice Python) chỉ thêm khi 2-opt không còn đủ.
- Lát 1: lịch trình mẫu nhập tay trong admin, chưa chạy thuật toán.

## Hệ quả

- Mỗi instance API giữ snapshot địa điểm `active` và ma trận khoảng cách, làm mới mỗi 10 phút hoặc khi có `place.statusChanged`.
- Ma trận tăng theo bình phương số điểm; quá khoảng 1.000 điểm mỗi thành phố thì chỉ lưu cạnh trong cụm và cụm kề.
- Logic lịch trình thuộc vùng bắt buộc TDD. Trọng số chấm điểm là giá trị khởi đầu, chỉnh lại theo dữ liệu thật.
