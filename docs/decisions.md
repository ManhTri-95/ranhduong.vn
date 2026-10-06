# Nhật ký quyết định

Mỗi quyết định một dòng: chọn gì, vì sao. Đổi quyết định thì thêm dòng mới, không xoá dòng cũ.

| Ngày | Quyết định | Lý do |
| --- | --- | --- |
| 2026-10-06 | Monorepo Turborepo + pnpm 12 | Một repo cho web, API, package dùng chung; pnpm 12 duyệt build script qua `allowBuilds` trong `pnpm-workspace.yaml` |
| 2026-10-06 | Node 24 LTS (tối thiểu 22.19) | Yêu cầu của Nuxt 4; Node 22.12+ cho phép `require()` ESM nên API CommonJS dùng được package ESM |
| 2026-10-06 | TypeScript 6.0, chưa lên 7 | TS 7 (bản viết lại bằng Go) mới ra; chờ Nest CLI, vue-tsc và decorator metadata hỗ trợ ổn định rồi nâng |
| 2026-10-06 | Nuxt 4 (SSR) cho web khách; admin nằm trong Nuxt dưới `/admin` ở lát 1 | Cần SSR cho SEO; gộp admin để tiết kiệm thời gian, tách SPA khi làm trang chủ quán |
| 2026-10-06 | NestJS 12 + Mongoose 9, MongoDB Atlas | Stack quen thuộc; index 2dsphere cho truy vấn địa lý |
| 2026-10-06 | Zod 4 trong `packages/contracts` | Một định nghĩa dùng chung cho validate API, form và script import CSV |
| 2026-10-06 | Package nội bộ build bằng `tsc` ra ESM (`dist/`) | Đơn giản, không cần bundler; Turborepo build trước khi chạy app |
| 2026-10-06 | Vitest cho unit test | Nhanh, chạy được TS trực tiếp |
| 2026-10-06 | Biến môi trường kiểm tra bằng Zod khi khởi động API | Sai cấu hình thì dừng ngay với lỗi rõ ràng |
| 2026-10-06 | Bản đồ MapLibre + tile OpenFreeMap, style tự sửa | Miễn phí, không giới hạn; khoá khung nhìn quanh Đà Lạt |
| 2026-10-06 | Google Places chỉ dùng để lưu `place_id` và mở chỉ đường | Điều khoản không cho lưu nội dung Google |
| 2026-10-06 | Chưa cấu hình ESLint | Thêm ở story riêng khi đã chốt bộ rule; hiện dựa vào `strict` của TypeScript |
| 2026-10-06 | Tên thương hiệu Rành Đường, tên miền `ranhduong.vn` | Tên tạm Ghé Đâu bị bỏ vì "ghedau" không dấu dễ đọc thành "ghế đẩu" và ghedau.vn đã có người đăng ký; "Đi Đâu" trùng thương hiệu review địa điểm sẵn có |
| 2026-10-06 | Web `ranhduong.vn`, API `api.ranhduong.vn`, ảnh `media.ranhduong.vn`, cookie phiên ở `.ranhduong.vn` | Theo tài liệu Kiến trúc hệ thống, mục 3 |
