# Thiết kế UX/UI: trang chi tiết lịch trình và trang chủ

13/10/2026. Tiếp nối đợt "Mobile UX P0" (runbook `docs/runbooks/mobile-ux-p0.md`). Chủ dự án chọn hướng A: làm cả hai trang, trang lịch trình trước, trước ngày ra mắt 15/11/2026. Ước lượng 13–15 giờ.

## 1. Mục tiêu

- **Trang lịch trình** (`/{city}/lich-trinh/{slug}`): khách quyết định nhanh lịch này có hợp không (tổng quan), đi theo được trên điện thoại (biết đang ở ngày nào, điểm nào, chỉ đường một chạm, thấy bản đồ) và gửi cho bạn đi cùng.
- **Trang chủ** (`/{city}`): trả lời nhanh "ghé đâu" (tìm kiếm, danh mục ngay màn hình đầu), "lúc này hợp gì" (thời tiết gọn, mùa) và "khám phá thêm" (lịch trình, quán, khu vực, chủ đề).

**Đo thành công:** lượt `direction_click` từ trang lịch trình không giảm; ô tìm kiếm trang chủ nằm trong màn hình đầu ở 390×844 (y ≤ 220); trang lịch trình mobile thấy bản đồ mà không phải cuộn hết timeline; không tràn ngang 320–1440px; 75 test SSR hiện có vẫn xanh (hoặc chỉ sửa theo mục 6).

## 2. Ràng buộc giữ nguyên

- Không đổi route công khai, không thêm route mới. SSR, canonical, JSON-LD (`TouristTrip`, breadcrumbs) giữ nguyên. SWR 15 phút cho trang lịch trình, trang chủ no-store.
- Không suy luận trạng thái mở cửa cho điểm trong lịch trình (`ItineraryStopPlace` không có giờ mở cửa). Không bịa ảnh: chưa có ảnh thì dùng bố cục không ảnh.
- Chỉ đường chỉ bằng URL Google Maps (ADR 0001). Không thêm thư viện.
- Ô thời tiết vẫn có đủ nguồn WeatherAPI.com, câu "Thời tiết chỉ để tham khảo, có thể khác theo vị trí và thời điểm" và phần mở rộng "Lưu ý khi xem dự báo" (S24).
- Hiệu ứng timeline S25 (mốc hiện ra, nét nối, stagger) giữ nguyên. Không thêm chuyển động ở phần đầu trang; mỗi màn hình tối đa 2 hiệu ứng cùng lúc (Spec UI §8).

## 3. Trang chi tiết lịch trình

### 3.1 Cấu trúc (mobile, từ trên xuống)

1. Header thành phố, liên kết "← Đà Lạt" như hiện tại.
2. **Phần đầu:** eyebrow "LỊCH TRÌNH · {meta ngày}" (ví dụ "LỊCH TRÌNH · 2 NGÀY 1 ĐÊM"); H1; chip phương tiện, nhịp độ, mùa (`season`, nền nhấn), phong cách (`style`); **dòng tổng quan** "{n} điểm · {m} bữa ăn · {khu vực}" tính từ dữ liệu chi tiết; mô tả rút còn 3 dòng kèm "Đọc thêm"; dòng nhắc giờ dự kiến (13px).
3. **Thanh ngày dính** (`position: sticky; top: 0`): các nút "Ngày 1 · 7 điểm", "Ngày 2 · 5 điểm" và công tắc hai lựa chọn **Lịch | Bản đồ** (chỉ trên < 1024px). Khi dính thì hiện viền dưới.
4. **Chế độ Lịch** (mặc định, có trong SSR): mỗi ngày có tiêu đề "Ngày 1 · 07:00 → 20:00 · 7 điểm", rồi danh sách điểm.
   - **Một điểm ghé:** vòng số (bấm thì xem trên bản đồ), giờ và nhãn "Bữa ăn"; tên quán (link trang địa điểm, Lora 19px); "danh mục · khu vực"; nhãn "Thông tin chưa được quán xác nhận" nếu có; ghi chú bằng chữ nội dung 15px/1.6, rút còn 2 dòng kèm "Xem thêm" khi dài hơn 90 ký tự; **nút chỉ đường tròn 44px viền `--ink`** ở góc phải hàng tên, có `aria-label`, giữ `data-rd-event="direction_click"` và `data-rd-place-id`.
   - **Bỏ khỏi timeline:** địa chỉ đầy đủ (xem ở trang địa điểm) và nút "Chỉ đường" vàng 52px.
   - Dòng di chuyển "Xe máy · khoảng 5 phút" giữ như cũ.
5. **Chế độ Bản đồ** (chỉ client): bản đồ của ngày đang chọn cao khoảng 55% màn hình, dùng `RdItineraryMap` có sẵn. Bên dưới là **dải thẻ điểm** cuộn ngang, dừng theo từng thẻ: số, giờ, tên, nút chỉ đường. Vuốt dải thẻ thì đổi điểm đang chọn và tô ghim; bấm ghim thì dải cuộn tới thẻ đó. Bản đồ chỉ dịch khi ghim bị che (`needsPan`). MapLibre chỉ tải lần đầu chuyển sang Bản đồ.
6. **"Rủ bạn đi cùng"** (Zalo, Messenger, Copy link) và liên kết "Chọn thêm chỗ trên bản đồ thành phố" ở cuối, như hiện tại.
7. **Thanh hành động cố định** (chỉ client, < 1024px): nút tròn **Chia sẻ** (gọi `navigator.share` nếu có, không có thì cuộn tới mục "Rủ bạn đi cùng") và nút nhấn **"Chỉ đường điểm {n} · {tên}"**.
   - **Điểm đang xem:** chế độ Lịch lấy điểm có vòng số gần nhất phía trên vạch ngang tại 40% chiều cao màn hình; chế độ Bản đồ lấy thẻ đang chọn. Không suy ra "điểm tiếp theo" theo giờ thật.
   - Điểm đang xem chưa có vị trí: nút chính đổi thành "Xem bản đồ ngày {d}".
   - Tên dài: nút giữ một dòng, cắt bằng dấu ba chấm; `aria-label` luôn có tên đầy đủ.
   - Thanh không render ở SSR, để HTML vẫn có đúng một link chỉ đường cho mỗi điểm (giữ assert `direction_click` = 3 của test S16) và để HTML cache không chứa trạng thái đang xem. `body[data-rd-bottom='action']` chỉ đặt sau khi mount.

### 3.2 Desktop (≥ 1024px)

Hai cột: timeline bên trái, bản đồ bên phải dính theo (`sticky`). Bản đồ **tự tải khi cột phải vào màn hình** (IntersectionObserver), bỏ nút "Xem bản đồ lịch trình". Không có công tắc Lịch | Bản đồ và không có thanh cố định; dưới bản đồ có khối "Chỉ đường điểm {n} · {tên}" và nút Chia sẻ. Thanh ngày dính trải hết chiều rộng phía trên hai cột.

### 3.3 Trạng thái

- Ngày không có điểm: giữ câu "Ngày này đang được cập nhật…".
- Điểm `place: null`: "Điểm ghé đang cập nhật", không có nút chỉ đường, không lên bản đồ.
- Bản đồ lỗi tải chunk hoặc style: giữ thông báo và "Tải lại để mở bản đồ"; chế độ Lịch vẫn dùng được.
- Không JavaScript: thấy toàn bộ timeline; nút ngày là link `#day-n`; "Xem thêm" và "Đọc thêm" dùng checkbox và label (không cần JS); không có công tắc bản đồ, không có thanh cố định.
- Giảm chuyển động: thanh dính, công tắc, dải thẻ đổi trạng thái ngay; cuộn tới điểm dùng `behavior: 'instant'`.

## 4. Trang chủ

### 4.1 Cấu trúc (mobile)

1. Header; H1 "Đà Lạt hôm nay ghé đâu?"; một dòng 13px "Quán nào cũng được hỏi lại trước khi lên đây."
2. **Ô tìm kiếm** ngay dưới H1 (mục tiêu y ≤ 220 ở 390×844).
3. **Chip danh mục một hàng cuộn ngang** (đổi `RdCategoryChips` cho mọi trang dùng nó, cuộn có `scroll-snap` và che mép bằng padding).
4. **"Lúc này" (ô thời tiết gọn):** một khối nền `--ink`: biểu tượng, "Mưa · 21°C", câu gợi ý một dòng, liên kết "Quán trú mưa được →" khi mưa; dòng cuối 12px trong khối: "WeatherAPI.com · Thời tiết chỉ để tham khảo, có thể khác theo vị trí và thời điểm." và `<details>` "Lưu ý khi xem dự báo". Không có thời tiết thì không có khối.
5. **"Đi theo lịch có sẵn":** banner mùa (nếu có) đứng đầu mục này, không đứng trên ô tìm kiếm nữa; sau đó là thẻ lịch trình cuộn ngang.
   - **Thẻ kiểu vé:** có ảnh bìa thì ảnh 120px như cũ. Không có ảnh thì bỏ ô xám; đầu vé là nhãn lớn "2 NGÀY" và đường răng cưa nét đứt.
   - Trên thẻ: tên; "{stopCount} điểm · {phương tiện} · {nhịp độ}"; chip mùa nền nhấn nếu có; "Xem lịch →".
6. **"Chỗ dân ở đây hay ngồi":** API vẫn trả 6 quán. Dưới 768px chỉ hiện 4; ghi chú viết tay rút còn 2 dòng; liên kết "Xem tất cả trên bản đồ →" tới `/{city}/ban-do`.
7. **"Theo khu vực":** dùng lại `RdZoneLinks` với `city.zones`, link tới trang khu vực có sẵn.
8. **"Gợi ý theo chủ đề":** thẻ cuộn ngang khi có từ 2 danh sách. Eyebrow "{placeCount} địa điểm", tiêu đề Lora 20px, mô tả 2 dòng, "Mở danh sách →".
9. Nút nổi "Xem bản đồ" giữ nguyên.

### 4.2 Desktop (≥ 1024px)

Phần đầu hai cột: trái là H1, dòng giới thiệu, ô tìm kiếm, chip; phải là "Lúc này". Banner mùa vẫn đứng đầu mục "Đi theo lịch có sẵn" ở mọi cỡ màn hình (một component không đặt được ở hai chỗ chỉ bằng CSS). Lịch trình, quán, chủ đề xếp lưới 3 cột (không cuộn ngang); khu vực là một hàng chip.

### 4.3 Thay đổi contract và API

`ItineraryCard` thêm `stopCount: number` (số nguyên ≥ 0, bằng `stopPlaceIds.length`) và `season: string` (có thể rỗng). Repository danh sách lịch trình đọc thêm `season`; `toItineraryCard` gán hai trường. Viết test trước (vùng TDD của `apps/api` và `packages/contracts`). Web đọc hai trường; thiếu thì thẻ bỏ phần đó (tương thích bản API cũ trong lúc deploy).

## 5. Đơn vị code mới (logic thuần, viết test trước)

| Đơn vị | Vị trí | Làm gì |
| --- | --- | --- |
| `itinerarySummary(detail)` | `entities/itinerary/lib/itinerary-summary.ts` | Số điểm dừng (mọi điểm, kể cả điểm `place: null`, khớp `stopCount` của thẻ trang chủ), số bữa ăn (`kind === 'meal'`), khu vực không trùng theo thứ tự xuất hiện |
| `daySpan(day)` | cùng file | Giờ bắt đầu điểm đầu và giờ kết thúc điểm cuối của một ngày; ngày rỗng thì `null` |
| `activeStopKey(rows, probeY)` | `widgets/itinerary-detail/lib/active-stop.ts` | Từ toạ độ các vòng số, chọn điểm đang xem theo vạch 40% |
| `noteNeedsToggle(text)` | `entities/itinerary/lib/itinerary-summary.ts` | Ghi chú dài hơn 90 ký tự thì có "Xem thêm" |
| `toItineraryCard` (sửa) | `apps/api/src/modules/itineraries/itinerary-card.ts` | Thêm `stopCount`, `season` |

Component mới hoặc sửa: `RdItineraryDayBar` (thanh ngày + công tắc), `RdItineraryStopCarousel` (dải thẻ ở chế độ Bản đồ), `RdItineraryActionBar` (thanh cố định, chỉ client), sửa `RdItineraryDetail`, `RdItineraryCard`, `RdCityWeather`, `RdCategoryChips`, `RdCuratedListStrip`, `pages/[city]/index.vue`.

## 6. Kiểm tra

- **Unit test:** các hàm ở mục 5, kể cả ngày rỗng, điểm `place: null`, ghi chú đúng 90 ký tự, vạch nằm trên điểm đầu tiên hoặc dưới điểm cuối.
- **SSR test (`apps/web/tests/listing-ssr.test.ts`):** giữ mọi assert S16, S24, S09, S14. Thêm assert: HTML trang lịch trình có dòng tổng quan, không có `aria-label` của thanh cố định; trang chủ có ô tìm kiếm đứng trước `id="city-weather-title"` và có link khu vực. Fixture API danh sách lịch trình thêm `stopCount`, `season`.
- **Trình duyệt (CDP, 320/390/1440px, có cảm ứng):** tìm kiếm ở y ≤ 220; thanh ngày dính và tự đổi ngày khi cuộn; công tắc Bản đồ tải map, vuốt dải thẻ đổi ghim; thanh cố định đổi "Chỉ đường điểm n" khi cuộn; tắt JavaScript vẫn đọc được lịch trình; giảm chuyển động; không tràn ngang; không cảnh báo hydration.
- **Chưa thay được:** điện thoại thật (Android, iPhone), bảng chia sẻ của hệ điều hành.

## 7. Ngoài phạm vi

- Nút "Mở cả ngày trên Google Maps" (URL nhiều điểm dừng): cần kiểm giới hạn số điểm dừng trên app điện thoại trước, nên tách thành spike riêng.
- Vé lịch trình dạng ảnh (lát 2), "Lưu", thanh điều hướng dưới, trang tìm kiếm, trang danh sách tất cả lịch trình.

## 8. Tài liệu cần cập nhật khi làm

Spec UI §4 (thẻ lịch trình kiểu vé, mốc lịch trình gọn, thanh hành động lịch trình), §5 (dòng Trang chủ và Lịch trình), §7 (ô thời tiết gọn); runbook mới cho đợt này; artifact Design System (ngoài repo, chủ dự án cập nhật hoặc nhờ cập nhật).
