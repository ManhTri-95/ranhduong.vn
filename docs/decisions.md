# Nhật ký quyết định

Mỗi quyết định một dòng: chọn gì, vì sao. Đổi quyết định thì thêm dòng mới, không xoá dòng cũ.

| Ngày | Quyết định | Lý do |
| --- | --- | --- |
| 2026-10-06 | Monorepo Turborepo + pnpm 12 | Một repo cho web, API, package dùng chung; pnpm 12 duyệt build script qua `allowBuilds` trong `pnpm-workspace.yaml` |
| 2026-10-06 | Node 24 LTS (tối thiểu 22.19) | Yêu cầu của Nuxt 4; Node 22.12+ cho phép `require()` ESM nên API CommonJS dùng được package ESM |
| 2026-10-06 | TypeScript 6.0, chưa lên 7 | TS 7 (bản viết lại bằng Go) mới ra; chờ Nest CLI, vue-tsc và decorator metadata hỗ trợ ổn định rồi nâng |
| 2026-10-06 | Nuxt 4 (SSR) cho web khách | Cần SSR cho SEO |
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
| 2026-10-06 | Admin là app riêng ngay từ đầu: Vue 3 + Vite SPA trên Cloudflare Pages (`admin.ranhduong.vn`), có Cloudflare Access | Ranh giới rõ, deploy độc lập, không phải tách về sau; đổi lấy khoảng 5 giờ dựng ban đầu (S26) |
| 2026-10-06 | API nhận cookie từ nhiều nguồn qua `WEB_ORIGINS` | Web khách và admin khác subdomain, cùng site `.ranhduong.vn` |
| 2026-10-06 | ESLint 10 (flat config) + typescript-eslint 8 + eslint-plugin-vue 10, cấu hình chung ở `packages/config/eslint.mjs`; CI chạy `lint` cùng typecheck, test, build | Tiêu chí nghiệm thu S01; thay cho dòng "Chưa cấu hình ESLint". Chỉ bật rule bắt lỗi (chặn `any`, `@ts-ignore`), không bật rule định dạng, chưa dùng Prettier |
| 2026-10-07 | Test API bằng Vitest; thêm `@oxc-project/runtime` (devDependency của `apps/api`) | Vite 8 biên dịch decorator NestJS bằng Oxc, mã sinh ra import helper `decorate`/`decorateMetadata` từ gói này |
| 2026-10-07 | Test tích hợp API chạy với MongoDB thật: local qua `pnpm infra:up`, CI qua service container `mongo:8`; mỗi kết nối test một database tên ngẫu nhiên | Kiểm được unique index, 2dsphere và upsert thật; không thêm mongodb-memory-server |
| 2026-10-07 | Seed thành phố bằng `pnpm seed` (Nest application context), upsert theo `slug` và `{cityId, slug}`; không xoá cụm đã bỏ khỏi seed | Chạy lại hay chạy song song không tạo trùng; giữ `_id` cụm để `Place.zoneId` không gãy |
| 2026-10-07 | Ranh giới 4 cụm Đà Lạt là hình chữ nhật phác thảo, không chạm nhau; `mapBounds` = khung bao các cụm nới 0,02° | Product spec chỉ định nghĩa cụm bằng tên; gán cụm cho địa điểm vẫn chọn tay; chủ dự án duyệt trước khi seed staging |
| 2026-10-07 | Đổi: 4 cụm Đà Lạt phủ kín khung bản đồ, chung cạnh (dùng chung đỉnh), không khe; `mapBounds` = đúng khung bao các cụm. `zoneId` vẫn chọn tay; gợi ý cụm khi ghim: cụm chứa điểm, điểm nằm đúng trên cạnh chung thì hiện cả hai cụm để chọn, điểm ngoài khung thì lấy cụm gần nhất (`$geoNear`) | Mọi điểm trong khung tự gợi ý được cụm, bản đồ không có vùng trống; ranh giới vẫn là bản phác thảo chờ chủ dự án duyệt |
| 2026-10-07 | Web có `typecheck` (`nuxt typecheck`, thêm `vue-tsc`, `typescript`) và `test` (Vitest, chỉ hàm thuần trong `app/**/lib`); thêm `apps/web/tsconfig.json` có `references` tới `.nuxt/` | S09 là trang web thật đầu tiên; CLAUDE.md yêu cầu typecheck xanh; logic có điều kiện của web (chữ trạng thái mở cửa, URL ảnh) cần unit test |
| 2026-10-07 | Ảnh WebP lưu ở `{key}/{400,800,1200}.webp` (`photoVariantKey` trong contracts); web ghép URL từ `NUXT_PUBLIC_MEDIA_BASE` | S09 cần hiện ảnh trước khi có S06; S06 sinh đúng các khoá này |
| 2026-10-07 | SSR gọi API qua `NUXT_API_INTERNAL_BASE` (mạng nội bộ Docker) khi có, trình duyệt dùng `NUXT_PUBLIC_API_BASE`; mọi lời gọi có timeout 5 giây | Theo ADR 0003; API treo thì trang báo lỗi thay vì treo theo |
