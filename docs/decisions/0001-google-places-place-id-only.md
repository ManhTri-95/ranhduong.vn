# ADR 0001: Google Places chỉ dùng place_id và link chỉ đường

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [product-spec.md](../product-spec.md) mục 4, [technical-design.md](../technical-design.md) mục 1, 10, 14

## Bối cảnh

Lượt bấm chỉ đường là chỉ số chính của lát 1, nên mỗi địa điểm cần liên kết với Google Maps. Điều khoản Google Maps Platform cấm lưu hoặc cache nội dung Google, trừ `place_id` (lưu vô thời hạn) và toạ độ (cache tối đa 30 ngày). Gọi định kỳ rồi lưu lại vẫn tính là cache. Dữ liệu tự curate mới là nguồn sự thật của sản phẩm.

## Quyết định

- Chỉ lưu `ids.googlePlaceId`. Lấy một lần bằng Text Search (khoảng 200 lượt, nằm trong hạn mức miễn phí), làm mới hằng tháng bằng Place Details Essentials (IDs Only), miễn phí (job `places.googleIdRefresh`).
- Nút "Chỉ đường" mở URL Google Maps dựng từ `place_id`. Không dùng Google Maps JS (bản đồ dùng MapLibre, xem [ADR 0008](0008-maplibre-openfreemap.md)).
- Không lưu, không cache, không hiển thị lại giờ mở cửa, rating, review, ảnh hay toạ độ của Google. Toạ độ lấy từ OSM hoặc ghim tay.
- Không dùng dữ liệu Google để tạo hoặc bổ sung dữ liệu riêng.
- Chỉ API hoặc worker được gọi Places API, có field mask, quota cho từng API và cảnh báo ngân sách.

## Hệ quả

- Giờ mở cửa, giá, liên hệ phải tự thu thập và xác minh theo [data-collection.md](../data-collection.md). Tốn công nhập liệu, đổi lại không phụ thuộc vào điều khoản Google.
- `ratingAvg` và JSON-LD `aggregateRating` chỉ lấy từ đánh giá trên nền tảng.
- Muốn hiển thị trực tiếp giờ mở cửa hoặc đánh giá của Google thì phải kiểm lại quy định hiển thị nội dung Places trên bản đồ không phải của Google (câu hỏi mở ở technical-design mục 14), rồi viết ADR mới thay ADR này.
- Trước khi ra mắt phải đọc lại Service Specific Terms và Places API Policies.
