# ADR 0012: Tự đếm số liệu địa điểm qua Redis, không lưu sự kiện thô trong MongoDB

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 12; [architecture.md](../architecture.md) mục 7; [backlog.md](../backlog.md) S18

## Bối cảnh

Lượt bấm chỉ đường mỗi tuần là chỉ số chính, và chủ quán cần số liệu theo từng địa điểm (xem, chỉ đường, gọi). Atlas M0 chỉ có 512 MB. Không được thu thập dữ liệu cá nhân dư thừa, và khách có quyền từ chối analytics.

## Quyết định

- Web gửi lô sự kiện tới `POST /v1/events` (tối đa 20 sự kiện mỗi lần, rate limit theo IP).
- API chỉ tăng bộ đếm Redis `pm:{placeId}:{dayKey}`. Chống đếm trùng lượt xem bằng khoá `seen:{visitorId}:{placeId}:{dayKey}`, với `visitorId` là hash của IP + User-Agent + salt đổi mỗi ngày, không dùng cookie.
- Job hằng ngày gộp bộ đếm vào `place_metrics`. Lát 1 chạy bằng cron trong container API.
- Không lưu log sự kiện thô trong MongoDB.
- Phễu sản phẩm dùng một công cụ riêng (PostHog hoặc Umami, chưa chốt), chỉ gửi ID ẩn danh, không gửi tên, email, số điện thoại.

## Hệ quả

- Mất bộ đếm Redis chưa gộp là chấp nhận được.
- `place_metrics` không dùng cookie định danh nên vẫn chạy khi khách từ chối analytics.
- KPI ánh xạ theo bảng ở technical-design mục 12.
