# S31: Từ vựng và hợp đồng chuyến đi

`packages/contracts` xuất schema và type `TripWith`, `TripInterest`, `ItineraryRequest`, `ItineraryNarrative`; nhãn tiếng Việt ở `TRIP_WITH_LABEL`, `TRIP_INTEREST_LABEL`.

## Dùng schema yêu cầu

`ItineraryRequest` kiểm cấu trúc, ngày đi có thật dạng `YYYY-MM-DD`, không trước hôm nay theo `Asia/Ho_Chi_Minh`, 1–5 ngày, phương tiện, người đi cùng, nhịp và 0–3 gu khác nhau. Ngày hôm nay được tính lại mỗi lần parse, kể cả khi dùng schema đã tạo trước nửa đêm.

Khi validate trong API hoặc form đã chọn thành phố, **dùng factory gắn với `City.mapBounds`** để kiểm thêm nơi ở:

```ts
import { createItineraryRequestSchema } from '@ranhduong/contracts';

const schema = createItineraryRequestSchema(city.mapBounds);
const input = schema.parse(body);
```

Body gồm `days`, `startDate`, `transport`, `with`, `tags`, `pace` và `stayLocation` tuỳ chọn. `stayLocation` là GeoJSON `{ type: 'Point', coordinates: [lng, lat] }`; bốn cạnh khung đều được chấp nhận. Chọn cụm thì phía gọi chuyển tâm cụm thành điểm. Lấy khung từ dữ liệu thành phố phía server, không lấy từ body của khách.

Schema giữ nguyên toạ độ đầu vào; làm tròn mỗi trục 0,005° trước khi lưu và loại nơi ở khỏi DTO công khai thuộc S37/ADR 0014.

## Gu và bữa ăn

- `TRIP_INTEREST_TAGS` dùng đúng thẻ hiện có; `TRIP_INTEREST_BEST_TIMES.clouds_hills` thêm `sunrise`.
- `TRIP_WITH_TAGS.family` thêm `gia-dinh`; các nhóm còn lại không thêm thẻ.
- Các bảng này chỉ cộng điểm, không dùng để loại ứng viên.
- `MEAL_WINDOWS` dùng phút từ 00:00: trưa `[690, 810)` (11:30–13:30), tối `[1080, 1200)` (18:00–20:00). S15 `analyzeTemplate` và thuật toán S35 dùng cùng nguồn.

## Mô tả có cấu trúc

`ItineraryNarrative` nhận `{ intro, days: [{ day, intro, stops: [{ key, note }] }] }`. Có 1–5 ngày, 1–20 điểm mỗi ngày, `day` từ 1–5 và `key` UUID; không nhận ngày/key trùng hoặc trường thừa. Intro tối đa 4000 ký tự, note tối đa 2000, đều trim và không nhận chuỗi trắng.

Schema này kiểm cấu trúc. S43 kiểm key thuộc đúng lịch trình và từ chối thông tin giờ, giá, điện thoại, địa chỉ không có trong đầu vào; không dùng kết quả parse cấu trúc thay cho bước đó.

## Kiểm tra

```sh
pnpm --filter @ranhduong/contracts test
pnpm turbo run lint typecheck test build
```

Test dùng đồng hồ cố định và toạ độ giả; gồm ranh giới nửa đêm Việt Nam/năm mới, năm nhuận, giới hạn và gu trùng, bốn cạnh khung, GeoJSON sai, narrative trùng ngày/key và các ranh giới bữa ăn S15. CI từ xa, staging, điện thoại thật và theo dõi Sentry 24 giờ thuộc nghiệm thu triển khai, chưa được xác nhận bởi các kiểm tra local này.

Kết quả local 19/10/2026: 591 test contracts đạt; `pnpm turbo run lint typecheck test build` đạt 20/20 task (gồm 462 test API với MongoDB/Redis thật); `pnpm --filter @ranhduong/web test:ssr` đạt 84/84; review độc lập không có lỗi cần sửa.
