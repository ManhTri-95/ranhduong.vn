# ADR 0005: Một API NestJS dạng monolith có module, worker cùng codebase

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [architecture.md](../architecture.md) mục 1, 4, 5; [technical-design.md](../technical-design.md) mục 1, 2, 10; [backlog.md](../backlog.md) mục 2

## Bối cảnh

Một người vận hành, tải lát 1 dưới 20 request/giây. Cần job nền (mô tả LLM, gộp số liệu, backup) và ranh giới nghiệp vụ rõ để mở rộng về sau mà không phải viết lại.

## Quyết định

- Một API NestJS duy nhất, mỗi nghiệp vụ một module (danh sách ở technical-design mục 2). Không microservice; chỉ tách khi có số liệu chứng minh cần.
- Worker dùng cùng codebase và cùng image với API, chạy entrypoint riêng (BullMQ, cron).
- Trong module: controller, processor, listener chỉ gọi service; service giữ use case, transaction, policy và phát sự kiện; chỉ repository import Mongoose model.
- Module khác muốn dữ liệu thì gọi service được export. DTO đi qua ranh giới module nằm trong `packages/contracts`.
- Phụ thuộc giữa module đi một chiều theo tầng Nền (cities, users, media) → Lõi (places, points) → Nghiệp vụ → Ngoài cùng (auth, metrics, admin). Không gọi ngược, không dùng `forwardRef`.
- Giao tiếp có ba cách: gọi service khi cần kết quả ngay hoặc cùng transaction; sự kiện nội bộ phát **sau commit** cho việc phụ; hàng đợi BullMQ cho việc chậm và gọi dịch vụ ngoài.
- API không giữ trạng thái: phiên, cache, rate limit, hàng đợi nằm ở Redis.

## Hệ quả

- Mở rộng bằng cách chạy thêm container `api`. Nếu job làm chậm API thì tách worker sang VPS thứ hai.
- Điểm, voucher và các việc liên quan đến tiền không được dựa vào sự kiện ([ADR 0006](0006-point-ledger-and-atomic-limits.md)).
- Listener phải idempotent và tự bắt lỗi của mình; lỗi chỉ ghi log và gửi Sentry.
- Lát 1 chưa cần BullMQ: gộp số liệu và backup chạy bằng cron trong container API.
