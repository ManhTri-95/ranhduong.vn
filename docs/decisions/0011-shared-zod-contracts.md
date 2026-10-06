# ADR 0011: Kiểu dữ liệu dùng chung định nghĩa một lần bằng Zod trong packages/contracts

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 2, 6; [architecture.md](../architecture.md) mục 4, 5; [decisions.md](../decisions.md)

## Bối cảnh

Cùng một dữ liệu đi qua nhiều nơi: form admin, script import CSV, API, web khách, payload sự kiện giữa các module. Mỗi nơi tự định nghĩa thì sẽ lệch nhau, nhất là enum và định dạng giờ mở cửa.

## Quyết định

- Mọi kiểu dữ liệu đi qua API, form, import hoặc sự kiện được định nghĩa bằng Zod 4 trong `packages/contracts`, export cả schema lẫn type.
- API validate input bằng đúng schema đó; không định nghĩa lại ở app.
- DTO qua ranh giới module NestJS và payload sự kiện cũng khai báo trong `packages/contracts`, không truyền document Mongoose.
- Parser dùng chung (ví dụ `parseOpeningHours`) đặt cạnh schema.
- `packages/contracts` và `packages/geo` không phụ thuộc NestJS hay Vue, dùng được ở mọi lớp.
- Package nội bộ build bằng `tsc` ra ESM; Turborepo build trước khi chạy app.

## Hệ quả

- Đổi một schema thì typecheck báo lỗi ở mọi nơi dùng nó.
- OpenAPI và client gọi API sẽ sinh từ contracts (technical-design mục 2, 6).
- Phải build package trước khi typecheck hoặc chạy app (`dependsOn: ["^build"]` trong `turbo.json`).
