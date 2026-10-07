# ADR 0006: Sổ cái điểm append-only, thao tác có giới hạn số lượng làm nguyên tử

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 1, 3, 4, 6, 8; [architecture.md](../architecture.md) mục 5, 6; [product-spec.md](../product-spec.md) mục 6

## Bối cảnh

Điểm, voucher và suất quà có giá trị thật và có giới hạn số lượng, nên dễ bị gian lận và dễ bị request đồng thời làm vượt suất. Kiểu "đọc rồi ghi" sẽ cho hai request cùng lấy suất cuối.

## Quyết định

- `PointTx` là sổ cái append-only: không update, không delete. Điểm tháng và số dư suy ra từ sổ cái. Redis sorted set chỉ là cache và được dựng lại hằng đêm.
- Mọi thao tác có giới hạn số lượng (voucher, suất quà, bộ đếm cột mốc) dùng `findOneAndUpdate` có điều kiện (ví dụ `remaining > 0`) trong transaction. Unique index chặn trùng: `checkins {userId, placeId, dayKey}`, `voucher_claims {voucherId, userId}` và `{code}`, `MilestoneCounter {ruleId, monthKey}`.
- Mỗi chuyển trạng thái là một `findOneAndUpdate` có điều kiện trạng thái nguồn.
- Check-in, nhận voucher, gửi đóng góp nhận header `Idempotency-Key`.
- Việc ghi điểm hoặc voucher nằm trong transaction của thao tác chính, không làm qua sự kiện.

## Hệ quả

- Cần MongoDB replica set ([ADR 0002](0002-keep-mongodb-over-postgres.md)).
- Logic điểm, voucher, quà thuộc vùng bắt buộc TDD, kể cả test chạy đồng thời.
- Gộp ID khách tạm ghi một `PointTx` lý do `guest_merge`. Xoá tài khoản thì ẩn danh hoá `PointTx`, không xoá bản ghi.
- Giá trị điểm cụ thể còn chờ chốt (technical-design mục 14).
