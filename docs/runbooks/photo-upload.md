# Upload ảnh địa điểm (S06)

Ảnh được tải thẳng từ admin vào bucket riêng tư qua presigned PUT có hạn 5 phút. API ký MIME và Content-Length; worker vẫn kiểm tra byte thật, dung lượng dưới 8 MiB, ảnh tĩnh JPEG/PNG/WebP và tối đa 48 triệu pixel. Worker sửa chiều ảnh, bỏ toàn bộ EXIF/XMP/ICC, sinh WebP 400/800/1200 rồi ghi vào bucket ảnh công khai. Không lưu ảnh gốc trong bucket công khai.

## Local

1. `pnpm infra:up` để chạy MongoDB, Redis, MinIO. Nếu image MinIO không còn tải được từ registry, dùng storage S3 local tương thích và đổi `R2_ENDPOINT`; không cần đổi code upload.
2. Cấu hình `apps/api/.env` theo `.env.example`: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=ranhduong-media`, `R2_UPLOAD_BUCKET=ranhduong-uploads`. Hai bucket phải khác nhau.
3. `pnpm --filter @ranhduong/api build`, rồi `pnpm --filter @ranhduong/api media:setup:local`. Script chỉ nhận endpoint localhost, tạo bucket, CORS và lifecycle; chỉ prefix `photos/` của bucket media được đọc công khai.
4. Chạy `pnpm dev` và một terminal riêng `pnpm --filter @ranhduong/api worker` (hoặc `dev:worker` khi sửa code).
5. Trong `apps/admin/.env`, đặt `VITE_MEDIA_BASE` trỏ tới bucket media; web dùng `NUXT_PUBLIC_MEDIA_BASE` tương ứng.
6. Đăng nhập admin, tạo/lưu nháp địa điểm, chọn ảnh, nguồn, người giữ bản quyền và giấy phép. Ảnh CC phải có link trang gốc, dùng CC0, CC BY hoặc CC BY-SA. Không dùng giấy phép NC.

## R2 staging / production

- Tạo **hai bucket**. Chỉ bucket `R2_BUCKET` gắn `media.ranhduong.vn`; bucket `R2_UPLOAD_BUCKET` không có custom domain, public r2.dev hoặc quyền truy cập công khai. Tách bucket staging khỏi production.
- API token R2 có quyền đọc/ghi trên cả hai bucket, lưu trong biến môi trường của API và worker. Endpoint API là `https://<account-id>.r2.cloudflarestorage.com`, khác domain ảnh công khai.
- CORS bucket upload cho đúng origin admin; ví dụ:

```json
[{ "AllowedOrigins": ["https://admin.ranhduong.vn"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
```

- Lifecycle bucket upload xoá prefix `uploads/` sau 1 ngày: dọn ảnh bỏ dở và ảnh gốc được tải lại bằng URL chưa hết hạn. Worker xoá ảnh gốc ngay sau xử lý thành công hoặc từ chối ảnh không hợp lệ.
- Deploy cùng image với API, command `node dist/worker.js`, cùng MongoDB/Redis/R2 env; worker không mở HTTP port. Queue `media-scan`, job `media.scan`, concurrency 1, tối đa 3 attempts (2 retries), exponential backoff từ 2 giây. Bật restart policy cho worker.
- Ảnh công khai có key ngẫu nhiên bất biến, header `Cache-Control: public, max-age=31536000, immutable`. Metadata nguồn và trạng thái nằm trong `media_uploads` có `cityId`; chỉ ảnh ready mới gắn vào `Place.photos`. Retry gắn cùng key không tạo trùng.
- Khi xoá nháp, admin hủy các lượt upload của địa điểm và xếp job `media.delete` dọn ảnh gốc/các bản WebP, kể cả ảnh chưa gắn. Scan đang chạy không thể chuyển lượt đã hủy sang ready; nếu vừa ghi ảnh thì dọn lại. Worker đối soát yêu cầu dọn ảnh mỗi phút để phục hồi sau Redis/R2 lỗi tạm thời. Khi đọc status, API đối soát job failed với MongoDB nếu việc ghi trạng thái lúc hết retries bị gián đoạn.
- Mã upload đã tải được giữ trên máy theo địa điểm để “Kiểm tra lại” tiếp tục sau khi đăng nhập lại hoặc quay về trang. Không lưu presigned URL hay file ảnh trong localStorage.

## API

Tất cả route cần phiên admin; request ghi cần Origin hợp lệ.

| Route | Chức năng |
| --- | --- |
| `POST /v1/admin/places/:id/photos/upload-url` | Body `{contentType,size,source,credit,license,sourceUrl?}`; trả uploadId, URL, headers, expiresAt |
| `POST /v1/admin/media/:uploadId/complete` | Xếp job; có thể gọi lại cùng uploadId khi mất mạng |
| `GET /v1/admin/media/:uploadId` | pending, queued, ready, failed; chỉ người tạo upload xem được |
| `POST /v1/admin/places/:id/photos` | Body `{uploadId}`; chỉ nhận ảnh ready đúng địa điểm/người tạo; trả AdminPlace |

## Kiểm tra nghiệm thu

- Thử JPEG, PNG, WebP; thử ảnh có GPS/Orientation; xác nhận đủ 3 bản WebP, đúng chiều rộng và không còn EXIF.
- Thử GIF, SVG, file đổi đuôi giả MIME, file hỏng, file đúng 8 MiB, ảnh động và ảnh giải nén vượt 48 MP: không được gắn vào địa điểm.
- Không chọn nguồn, credit hoặc license: bị chặn trước PUT; CC thiếu link hoặc giấy phép NC: bị chặn.
- Dừng worker, tải ảnh: UI chờ xử lý rồi cho kiểm tra lại; bật worker: ảnh được xử lý. R2 lỗi tạm thời: retry tối đa 2 lần; hết retries báo failed.
- API không nhận byte ảnh; bucket private không đọc được ẩn danh. Gửi lại complete/attach không tạo ảnh trùng.
- Sửa ô tên rồi tải ảnh: ảnh xuất hiện mà ô tên vẫn giữ nội dung chưa lưu. Thử ở 375/390px, desktop, staging và điện thoại thật.

Presigned URL và CORS theo [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) và [CORS](https://developers.cloudflare.com/r2/buckets/cors/); metadata theo [sharp output](https://sharp.pixelplumbing.com/api-output/).

Đã thử local ngày 09/10/2026: API + Redis/MongoDB thật + RustFS S3 local (image MinIO trong compose không tải được), presigned PUT, ảnh gốc không đọc được ẩn danh, đủ 3 bản WebP không EXIF, Chrome headless 375px/desktop, giữ tên đang sửa và dọn 6 bản ảnh khi xoá nháp. R2 staging và điện thoại thật chưa thử.
