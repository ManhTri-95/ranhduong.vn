# S37 — API lịch trình của khách

`GuestItinerariesModule` là lớp nối API khách với planner S34–S35, nằm riêng khỏi module mẫu. Không thêm dependency.

- `POST /v1/cities/:city/itineraries`: body `ItineraryRequest`, `Origin` trong `WEB_ORIGINS`, `credentials: include`; thành công 201 với `ItineraryUserDetail`.
- `GET /v1/itineraries/:shareId`: 200 cùng DTO, `canEdit` khi `gid` trùng người tạo và lịch trình chưa chuyển sang tài khoản. Không cấp cookie khi chỉ đọc. ShareId sai, ObjectId, mẫu hay thành phố không hoạt động trả 404.
- Cả thành công lẫn lỗi đều `Cache-Control: no-store`; middleware chạy trước guard và pipe. Không cache kết quả thuật toán.

## Danh tính và giới hạn

Cookie `gid` chỉ chấp nhận UUID v4; thiếu/sai thì cấp UUID mới khi bắt đầu xử lý yêu cầu tạo đã qua validation cấu trúc. HttpOnly, SameSite=Lax, Path=/, 365 ngày; domain và Secure lấy cùng cấu hình cookie phiên. Lỗi thiếu điểm vẫn giữ cookie để các lần thử được tính cùng khách. GET công khai không trả gid, ownerId hay dữ liệu nơi ở.

S18 và S37 dùng chung `shared/http/sliding-window.ts`: một Lua script kiểm rồi ghi mọi chiều nguyên tử. Giới hạn S37 là 10/giờ/gid và 60/giờ/IP, dùng chung giữa các thành phố. Request bị chặn trả 429 `RATE_LIMITED`, không tiêu lượt ở chiều khác. Giới hạn dùng IP đã qua cấu hình trusted proxy; không tin trực tiếp header do khách gửi. Khoá Redis chỉ chứa mã băm có salt, sống 1 giờ; salt sống 2 giờ kể từ lần dùng cuối, không đổi lúc nửa đêm. S18 giữ 120/phút.

## Snapshot và dữ liệu lưu

`PlanningSnapshot` giữ facts active riêng từng thành phố trong tiến trình tối đa 10 phút, gom request nạp đồng thời, bỏ cache khi đọc lỗi. Mọi ghi thành công qua `PlacesRepository` (tạo/import, sửa, ảnh, kích hoạt, xác minh/đổi trạng thái, xoá nháp) xoá snapshot ngay. Lần tạo tiếp theo đọc DB; load đang chạy trước khi xoá không được đưa dữ liệu cũ trở lại cache. Báo cáo S36 vẫn đọc facts mới trực tiếp. Triển khai nhiều tiến trình API cần cơ chế broadcast invalidation trước khi scale; thiết kế hiện tại dùng một API trên VPS.

Mỗi lần tạo đọc mùa/cụm/mẫu published và độ phổ biến 30 ngày (bao gồm hôm nay), chạy `generateItinerary`, không đổi thuật toán. Thiếu điểm: 422 `NOT_ENOUGH_PLACES` với `NotEnoughPlacesDetails`, không lưu bản ghi.

Lưu `kind: user`, `visibility: unlisted`, `status: published`, `version: 1`, gid người tạo, `params.startDate`, thứ khởi hành, templateId nếu dùng. Toạ độ nơi ở làm tròn mỗi trục tới 0,005° **trước cả xếp tuyến và lưu**. Mỗi stop có UUID mới, note rỗng, locked/isVip false; `detours.afterIndex` đổi thành key của stop. ShareId gồm 20 ký tự base62 ngẫu nhiên bằng crypto (~119 bit), unique partial index `shareId_1`; trùng thì thử lại tối đa 3 lần. Index được Mongoose tạo như cấu hình hiện tại và qua `ItinerariesService.ensureIndexes()` khi seed. Không còn trường `paramsHash` trong schema; S37 không xoá index/dữ liệu cũ bằng lệnh phá huỷ.

## DTO và các story tiếp theo

`toUserItinerary` chọn rõ từng trường rồi parse `ItineraryUserDetail`: chỉ thông tin chuyến, lịch giờ, điểm ghé công khai hiện tại, tiện đường, cảnh báo thiếu bữa và `canEdit`. Không spread document MongoDB. Địa điểm không còn active, đã xoá hoặc khác thành phố thành `place: null`; ô stop giữ key/giờ và xoá note. Tiện đường cũng được che như vậy. Đọc không dùng snapshot để tránh lộ điểm vừa bị ẩn.

S39 khi chép phải lấy `publicItineraryParams` (không chứa stayLocation), sinh quyền sở hữu/shareId/key/version mới; không sao chép document nguồn. S40/S42 phải dùng lại projector này khi trả kết quả sửa/tối ưu. Endpoint copy, sửa, tối ưu, trang `/l/**`, ảnh vé khách và LLM vẫn thuộc S39/S40/S42/S43.

Trang `/quyen-rieng-tu` giải thích gid 1 năm, giới hạn lượt tạo, nơi ở tự chọn/làm tròn/không công khai và quyền sửa khi mất cookie; lastmod là 21/10/2026.

## Kiểm tra

```powershell
pnpm --filter @ranhduong/api exec vitest run src/modules/itineraries/guest src/modules/places/planning-snapshot.test.ts src/modules/metrics/metrics.integration.test.ts
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
```

Kết quả kiểm local, review và các bước triển khai còn chờ được ghi trong kế hoạch S37. Chưa kiểm CI remote, staging, điện thoại thật hoặc Sentry 24 giờ. Kiểm HTML/ảnh vé cá nhân đầy đủ ở S39 khi có các route đó.
