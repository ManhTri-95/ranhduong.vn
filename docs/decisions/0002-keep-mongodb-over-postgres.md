# ADR 0002: Giữ MongoDB, không chuyển sang PostgreSQL

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 1, 3, 8, 13; [architecture.md](../architecture.md) mục 1, 9; [decisions.md](../decisions.md)

## Bối cảnh

Dữ liệu chính là địa điểm có toạ độ, giờ mở cửa dạng mảng, danh sách ảnh kèm nguồn và alias. Các truy vấn quan trọng đều là truy vấn địa lý (gần đây, chống trùng trong 150m, check-in bằng `$near`), cộng thêm tìm kiếm không dấu. Dự án do một người vận hành, hạ tầng MVP phải gần như miễn phí, và thêm thành phố phải chỉ là thêm dữ liệu.

Phương án thay thế đã cân nhắc là PostgreSQL + PostGIS. Tài liệu gốc không ghi lý do loại phương án này; các lý do giữ MongoDB dưới đây lấy từ các nguồn ở trên.

## Quyết định

- Dùng MongoDB Atlas (bắt đầu M0, lên Flex khi cần) với Mongoose 9.
- Index `2dsphere` cho `places.location`; Atlas Search với analyzer bỏ dấu trên `name`, `aliases`, `tags`.
- Thao tác có giới hạn số lượng dùng transaction + `findOneAndUpdate` có điều kiện + unique index (xem [ADR 0006](0006-point-ledger-and-atomic-limits.md)).
- Mọi document nghiệp vụ có `cityId`; toạ độ lưu GeoJSON `[lng, lat]`.

## Hệ quả

- Transaction của MongoDB chỉ chạy trên replica set. Atlas có sẵn; môi trường local cũng phải là replica set (dù chỉ một node) thì mới test được transaction.
- Atlas Search chỉ có trên Atlas, nên tìm kiếm không dấu cần cách chạy được khi test local.
- M0 giới hạn 512 MB và không có backup tự động: không lưu sự kiện thô trong MongoDB ([ADR 0012](0012-self-counted-place-metrics.md)); backup bằng `mongodump` hằng đêm lên R2; lên Flex khi dùng quá 70%.
- Không có khoá ngoại hay join: module chỉ chạm collection của chính nó, tham chiếu qua ObjectId; số dư và bảng xếp hạng suy ra từ sổ cái.
