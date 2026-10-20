# S34: Chọn điểm cho từng ngày

`planItinerary` (`apps/api/src/modules/itineraries/planner/plan-itinerary.ts`) chọn cụm và điểm tham quan cho từng ngày của lịch trình khách. Đây là hàm thuần: không đọc DB, Redis, env hay đồng hồ; `now` truyền vào; cùng đầu vào cho cùng kết quả. Chưa có endpoint nào gọi hàm này: S36 (báo cáo độ phủ) và S37 (API tạo lịch trình) nạp dữ liệu rồi gọi.

S34 **không** sắp tuyến, xếp giờ, chèn bữa ăn hay gợi ý tiện đường; các việc đó thuộc S35 (`generateItinerary`, [runbook](itinerary-route-schedule.md)), chạy trên kết quả của S34. S36/S37 gọi `generateItinerary`, không gọi thẳng `planItinerary`.

## Đầu vào

| Trường | Nguồn (S36/S37) |
| --- | --- |
| `request` | `ItineraryRequest` đã parse bằng `createItineraryRequestSchema(city.mapBounds)` |
| `places` | Snapshot `ItineraryPlace[]` của thành phố (contracts, mở rộng `TemplatePlace`) |
| `zones` | `CitiesService.itineraryZones(cityId)`, theo thứ tự seed |
| `seasons` | `City.seasons` |
| `templates` | Mẫu `published` của thành phố: `{ id, tags, with, days[].stops[].{ placeId, kind } }` |
| `popularity` | Số thô 30 ngày theo `placeId`, S37 chọn cách cộng từ `place_metrics`; thiếu là 0 |
| `now` | Thời điểm tạo, để tính hạn xác minh 90 ngày |

## Đầu ra

- Thành công: `{ ok: true, templateId?, days }`. Mỗi ngày có `day`, `date` (`YYYY-MM-DD` giờ Việt Nam), `weekday` (0 = Chủ nhật), `rainy`, `pace`, `zoneIds` và `visits`. Tạo từ đầu thì `zoneIds` là 1–2 cụm kề nhau, ngày 1–4 không lặp cụm. Theo mẫu (`templateId` có giá trị) thì `zoneIds` là các cụm của điểm được chọn theo thứ tự trong mẫu: có thể hơn 2 cụm, không kề nhau hoặc lặp giữa các ngày. S35, S37, S39 không được giả định giới hạn này. (`placeId`, `zoneId`, `score`, `pin?`). Mỗi ngày tối đa một `pin: 'first'` (điểm bình minh, S35 đặt đầu ngày từ 04:45) và một `pin: 'last'` (điểm buổi tối, đặt cuối ngày).
- Thiếu điểm: `{ ok: false, code: 'NOT_ENOUGH_PLACES', details }` với `details` khớp `NotEnoughPlacesDetails`: `shortages` (ngày dưới 3 điểm, các cụm đã gán, rỗng khi không còn cụm nào, và số điểm tìm được) và `suggestions` (`reduce_days` với số ngày lớn nhất còn tạo được; `drop_interests` khi bỏ hết gu tạo được). Mọi gợi ý đều đã chạy thử.

## Thuật toán

1. **Lọc ứng viên mỗi ngày** (`candidates.ts`): `active`, xác minh trong 90 ngày (`verificationStale`), có toạ độ, có cụm của thành phố, `openingHoursIssues` rỗng, có ca mở đúng thứ (phần sau nửa đêm của ca hôm trước không tính), hợp phương tiện. `transport` rỗng là chưa nhập nên không loại; taxi tính như ô tô.
2. **Điểm tham quan** là địa điểm phục vụ tham quan, cà phê, hoạt động hoặc mua sắm (danh mục chính hoặc phụ). Quán chỉ là ăn uống dành cho bữa ăn (S35); lưu trú không bao giờ là điểm ghé. **Ngày thứ 5** chỉ chọn cà phê, mua sắm hoặc điểm có thẻ `dac-san`, nhịp thong thả.
3. **Chấm điểm** (`scoring.ts`): `0,5 × khớp gu + 0,3 × độ phổ biến (chia cho max) + 0,2 × ratingAvg/5`, cộng `+0,2` (che hết) hoặc `+0,1` (che một phần) vào ngày trong mùa mưa (`inRainSeason` đọc `City.seasons` có `kind: 'rain'`). Khớp gu = số tiêu chí khớp / số tiêu chí; mỗi gu là một tiêu chí (thẻ theo `TRIP_INTEREST_TAGS` hoặc thời điểm đẹp theo `TRIP_INTEREST_BEST_TIMES`), Gia đình thêm tiêu chí thẻ `gia-dinh`. Gu chỉ cộng điểm, không loại điểm.
4. **Mẫu gần nhất** (`templates.ts`): mẫu cùng số ngày có Jaccard gu cao nhất, cộng 0,25 khi cùng "đi cùng ai"; hai tập gu rỗng tính là giống hoàn toàn; hoà thì id nhỏ. Điểm ghé của mẫu còn hợp lệ và hợp gu được giữ trước; điểm của mẫu không hợp gu cạnh tranh với ứng viên cùng cụm của ngày, bằng điểm thì giữ điểm của mẫu (lúc chưa có số liệu phổ biến, điểm số hay hoà); điểm bữa ăn của mẫu bỏ. Số điểm theo nhịp độ của khách (thong thả 4, dày 6): thiếu thì bù từ cụm của ngày, thừa thì bỏ điểm thấp. Cụm của ngày theo mẫu. Ngày nào dưới 3 điểm thì bỏ mẫu, tạo từ đầu.
5. **Tạo từ đầu** (`zones.ts`): mỗi ngày chọn một cụm hoặc một cặp cụm kề hai chiều trong `Zone.adjacentZones`. Vét cạn mọi tổ hợp: ngày 1–4 không lặp cụm, ngày 5 dùng lại cụm; không lặp điểm. Ưu tiên lần lượt: số ngày đủ điểm, tổng số điểm chọn được, tổng điểm số, ít cụm hơn; hoà thì tổ hợp gặp trước (cụm đơn theo thứ tự seed, rồi cặp). Đà Lạt có 8 lựa chọn mỗi ngày nên tối đa vài nghìn tổ hợp; test bất biến 140 lần chạy với 160 điểm giả mất khoảng 0,2 giây.

Mỗi ngày chỉ chọn tối đa một điểm có `bestTime` chứa `sunrise` và một điểm có `evening` (không có `sunrise`); điểm thứ hai cùng loại bị bỏ qua.

Các trọng số và mức cộng (mái che, cùng đi cùng ai) là giá trị khởi đầu ở technical-design mục 7, chỉnh khi có dữ liệu thật.

## Dữ liệu cần có

- **Bảng cụm kề** lưu ở `Zone.adjacentZones`, nguồn là seed (`apps/api/src/seed/da-lat.ts`). `CitySeed` từ chối cụm kề không có trong seed, kề chính nó, lặp hoặc chỉ kề một chiều. DB đang chạy cần `pnpm seed` lại để ghi bảng kề; document cụm cũ thiếu trường thì đọc ra rỗng, nghĩa là không ghép cặp nào. Ranh giới cụm (S03) đổi thì sửa bảng kề trong seed rồi chạy lại.
- **Chợ** cần danh mục mua sắm hoặc thẻ `dac-san` mới được chọn cho ngày thứ 5.
- Điểm thiếu thời lượng ghé vẫn được chọn; S35 xếp giờ với 60 phút (cùng mặc định với `analyzeTemplate`). Cột "Còn thiếu" (S33) nhắc bổ sung.

## Kiểm tra

```sh
pnpm infra:up
pnpm --filter @ranhduong/contracts test
pnpm --filter @ranhduong/api exec vitest run src/modules/itineraries/planner src/seed/da-lat.test.ts src/modules/cities
pnpm turbo run lint typecheck test build
```

Test planner dùng dữ liệu giả trong `apps/api/src/testing/planner-fixtures.ts` (bốn "Cụm … Giả Lập" có đồ thị kề như Đà Lạt). `plan-itinerary.test.ts` có test bất biến với hạt cố định: mọi tổ hợp 1–5 ngày × 7 thứ khởi hành × 2 nhịp, trên bộ dữ liệu đủ và thưa, kiểm điểm `active`, xác minh trong 90 ngày, mở đúng thứ, không lặp điểm hay cụm 4 ngày đầu, cặp cụm kề, giới hạn ghim, và `details` hợp lệ khi thiếu điểm.

## Chưa kiểm

Không có giao diện hay endpoint mới nên chưa có gì để thử trên staging hay điện thoại. Việc đó làm cùng S36/S37. Chưa chạy CI remote.
