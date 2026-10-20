# S35: Sắp tuyến và xếp giờ

`generateItinerary` (`apps/api/src/modules/itineraries/planner/generate-itinerary.ts`) tạo lịch trình của khách. Hàm gọi phần chọn điểm của S34 ([runbook](itinerary-place-selection.md)), rồi với từng ngày: sắp tuyến, xếp giờ, sửa sai giờ mở cửa, chèn bữa ăn và gợi ý điểm tiện đường. Đây là hàm thuần: không đọc DB, Redis, env hay đồng hồ; cùng đầu vào cho cùng kết quả. Chưa có endpoint nào gọi hàm này: S36 (báo cáo độ phủ) và S37 (API tạo lịch trình) nạp dữ liệu rồi gọi.

## Đầu vào

Giống `planItinerary` (S34): `PlanInput` gồm `request`, `places`, `zones`, `seasons`, `templates`, `popularity`, `now`. Có thêm hai trường được dùng:

- `request.stayLocation`: nơi ở đã làm tròn. Chỉ dùng để sắp tuyến; kết quả không có toạ độ nào (ADR 0014).
- `ItineraryPlace.priceLevel` (1–4, tuỳ chọn): S37 nạp từ `Place.priceLevel` khi dựng snapshot.

## Đầu ra

- Thành công: `{ ok: true, templateId?, days: ScheduledDay[] }`. Mỗi ngày có các trường của S34 (`day`, `date`, `weekday`, `rainy`, `pace`, `zoneIds`) cộng thêm:
  - `startTime`: `07:00`, hoặc `04:45` khi điểm đầu là điểm bình minh.
  - `stops`: `{ placeId, kind: 'visit' | 'meal', start, end, travelMinFromPrev }`, giờ dạng `HH:mm`.
  - `detours`: `{ afterIndex, placeId, detourMin }`.
  - `issues`: `missing_lunch` hoặc `missing_dinner` khi ngày đi qua khung giờ ăn mà không chèn được quán hợp lệ.
- Thiếu điểm: `{ ok: false, code: 'NOT_ENOUGH_PLACES', details }` như S34. `shortages` gồm cả ngày mà S35 phải bỏ điểm (sai giờ, quá 21:30) tới mức còn dưới 3 điểm tham quan. Gợi ý `reduce_days`/`drop_interests` đã chạy thử trên toàn bộ S34 + S35.

S37 khi lưu cần: sinh `key` (UUID) cho từng điểm, đổi `detours[].afterIndex` thành `afterKey`, đặt `note: ''`, `locked: false`, `isVip: false`.

## Trình tự một ngày

1. **Sắp tuyến** (`route.ts`): nearest neighbor rồi 2-opt trên các điểm không ghim. Điểm bình minh luôn đứng đầu, điểm buổi tối luôn đứng cuối.
   - Có nơi ở: tuyến khép kín (nơi ở → … → nơi ở). Có ghim đầu thì nearest neighbor bắt đầu từ ghim đầu.
   - Không có nơi ở: tuyến mở. Nearest neighbor bắt đầu từ điểm điểm số cao nhất; 2-opt được đổi cả đầu và cuối tuyến.
   - So tuyến bằng phút chim bay chưa làm tròn. Chỉ nhận phép đảo làm tuyến ngắn hơn `1e-9` phút, nên điểm trùng toạ độ không làm 2-opt lặp mãi.
2. **Ngày mưa** (`build-day.ts`): so tuyến vừa sắp với tuyến đảo phần không ghim. Chọn tuyến đảo khi tổng phút di chuyển không tăng và số phút ở điểm có mái che trong 13:00–17:00 (che hết ×2, một phần ×1) lớn hơn.
3. **Xếp giờ** (`timing.ts`): dùng `scheduleDay` trong contracts, hàm chung với kiểm tra lịch trình mẫu S15 (`analyzeTemplate`). Mỗi chặng tính bằng chim bay × 1,4 ÷ 25 km/h, làm tròn 5 phút, cộng đệm 10 phút. Thời lượng ghé thiếu thì tính 60 phút.
4. **Chờ quán mở**:
   - Điểm thường chờ tối đa 30 phút.
   - Trước 07:00 chờ bao lâu cũng được: sau điểm bình minh, quán mở 07:00 không bị bỏ.
   - Điểm ghim cuối (chợ đêm) chờ tới giờ mở, không giới hạn.
   - S15 không chờ: các tuỳ chọn chờ mặc định tắt.
5. **Sửa sai giờ**: điểm sai giờ đầu tiên thử đổi với điểm kề trước, rồi điểm kề sau (không đổi điểm ghim). Nhận khi số điểm sai giờ giảm. Không được thì bỏ điểm có điểm số thấp nhất trong các điểm đang sai giờ, kể cả điểm ghim. Bỏ điểm bình minh thì ngày bắt đầu lại 07:00.
6. **Chèn bữa** (`meals.ts`): chỉ khi ngày đi qua khung giờ ăn (`MEAL_WINDOWS`: trưa 11:30–13:30, tối 18:00–20:00), cùng quy tắc nhắc thiếu bữa của S15.
   - Ứng viên: quán phục vụ ăn uống, hợp lệ trong ngày, chưa có trong chuyến, mở suốt bữa, giờ bắt đầu bữa nằm trong khung.
   - Vị trí: sau bất kỳ điểm nào, trừ sau điểm ghim cuối.
   - Xếp hạng: phút thêm vào tuyến (đi vòng cộng chờ tới giờ ăn, làm tròn 5 phút), rồi đúng mức giá, rồi điểm số, rồi id.
   - **Mức giá** (chủ dự án chọn 20/10/2026): mức trần của ngày là `priceLevel` cao nhất của các điểm tham quan trong ngày; điểm chưa có mức giá tính là 2. Quán không quá mức trần, hoặc chưa có mức giá, là đúng mức giá. Đây chỉ là thứ tự ưu tiên, không loại quán.
   - Không chèn được thì ngày vẫn tạo, kèm `issues`.
7. **21:30**: ngày kết thúc sau 21:30 thì bỏ điểm tham quan điểm số thấp nhất, rồi sửa giờ và chèn bữa lại. Còn dưới 3 điểm tham quan thì báo thiếu điểm.
8. **Tiện đường** (`detours.ts`, chạy sau khi dựng mọi ngày):
   - Mỗi cặp điểm liên tiếp có tối đa một gợi ý. Chọn điểm phải đi vòng ít nhất, dưới 10 phút (phút chưa làm tròn).
   - Điểm gợi ý lấy từ điểm tham quan hợp lệ của ngày, chưa có trong chuyến, chưa được gợi ý ở chỗ khác, mở suốt lượt ghé nếu ghé ngay sau điểm trước.
   - `detourMin` là số phút đi vòng, làm tròn.

Ngày lấy từ lịch trình mẫu cũng được sắp tuyến lại; thứ tự của người soạn mẫu không được giữ.

Các hằng số (07:00/04:45, 21:30, đệm 10, chờ 30, đi vòng 10, mức giá mặc định 2, buổi chiều mưa) là giá trị khởi đầu ở technical-design mục 7, chỉnh khi có dữ liệu thật.

## Hiệu năng

`generate-itinerary.test.ts` đo 140 yêu cầu (1–5 ngày × 7 thứ khởi hành × 2 nhịp × có/không nơi ở) trên 200 địa điểm giả (4 cụm, khoảng 25% quán ăn).

Kết quả trên máy dev Windows 11, Node 24, ngày 20/10/2026: p95 17,2 ms, chậm nhất 25,0 ms. Mục tiêu là p95 dưới 500 ms.

Ca thiếu điểm tốn hơn ca thường vì chạy thử tối đa 5 lần để tìm gợi ý.

## Kiểm tra

```sh
pnpm --filter @ranhduong/contracts test
pnpm --filter @ranhduong/geo test
pnpm --filter @ranhduong/api exec vitest run src/modules/itineraries/planner
pnpm turbo run lint typecheck test build
```

Test bất biến trong `generate-itinerary.test.ts` dùng hạt cố định, chạy trên hai bộ: 200 điểm và 40 điểm đầu. Lần chạy hiện tại có 149 ca tạo được và 131 ca thiếu điểm. Với mỗi ca tạo được, test kiểm:

- Mỗi điểm dừng hợp lệ trong ngày và mở suốt giờ ghé.
- Giờ không chồng nhau; ngày kết thúc không sau 21:30.
- Số điểm tham quan từ 3 tới số điểm của nhịp độ.
- Ngày bắt đầu 04:45 đúng khi điểm đầu là điểm bình minh.
- Bữa ăn là quán phục vụ ăn uống, bắt đầu trong khung giờ ăn; `issues` khớp với bữa thực sự thiếu.
- Không lặp điểm trong chuyến; tiện đường không trùng điểm dừng và dưới 10 phút.
- Kết quả không có toạ độ nơi ở.

## Giới hạn đã biết

- Thời gian di chuyển dùng ước lượng chim bay cho tới khi có ma trận OSRM (S44). Đèo và đường một chiều có thể lệch nhiều.
- Chờ quán mở và bữa ăn có thể để trống một khoảng trong ngày, ví dụ sau điểm cuối buổi sáng thì chờ tới giờ ăn trưa.
- Thiếu bữa không làm lịch trình thất bại. S36 phải tính `issues` là lỗi độ phủ.

## Chưa kiểm

Không có giao diện hay endpoint mới nên chưa có gì để thử trên staging hay điện thoại. Việc đó làm cùng S36/S37. Chưa chạy CI remote.
