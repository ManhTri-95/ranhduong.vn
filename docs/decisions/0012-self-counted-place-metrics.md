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

### Triển khai S18 (2026-10-11)

- Chọn Umami mặc định cho traffic: pageview thủ công sau opt-in, bỏ query/hash/referrer và tiêu đề dữ liệu; thu hồi trong mọi tab, DNT và staging đều chặn gửi. Cấu hình instance thật ở runtime; các sự kiện phễu của story sau được bổ sung khi có nghiệp vụ đó.
- Giới hạn IP bằng cửa sổ Redis trượt 60 giây; hash rate có salt riêng ngắn hạn để không đặt lại giới hạn lúc nửa đêm. Salt theo ngày vẫn dùng riêng cho chống trùng lượt xem.
- Cron API chạy 00:15 giờ Việt Nam và catch-up lúc khởi động; giữ bộ đếm 8 ngày, tối đa 5 lần thử mỗi đợt. Unique place/day và `$max` ghi số tuyệt đối để retry/concurrent không cộng lại; chỉ bỏ ngày pending khi ghi đủ.
- Báo cáo admin tuần dùng max số Redis/Mongo mỗi ngày; số đã nhận vẫn được gộp nếu địa điểm/thành phố bị ẩn. Chi tiết cấu hình/kiểm chứng: [runbook S18](../runbooks/tracking-reports.md).

## Hệ quả

- Mất bộ đếm Redis chưa gộp là chấp nhận được.
- `place_metrics` không dùng cookie định danh nên vẫn chạy khi khách từ chối analytics.
- KPI ánh xạ theo bảng ở technical-design mục 12.
