# Backlog lát 2: Lịch trình theo yêu cầu và vé chia sẻ

19/10/2026 · @Manh Tri duyệt ngày 19/10/2026

Lát 2 cho khách tự tạo lịch trình bằng vài nút bấm, sửa lại theo ý mình và chia sẻ bằng link hoặc vé dạng ảnh. Lát 2 bắt đầu sau khi lát 1 ra mắt (10–15/11/2026) và nhắm ra mắt trước kỳ nghỉ cuối năm.

## 1. Mục tiêu và tiêu chí hoàn thành

Lát 2 thành công khi khách tạo lịch trình trên web thay vì hỏi group Facebook hay ChatGPT, rồi gửi lịch trình đó cho bạn đi cùng. Chỉ số chính là **số lịch trình được tạo và chia sẻ mỗi tuần** (product-spec mục 11). Lượt bấm chỉ đường mỗi tuần vẫn được theo dõi như lát 1.

Lát 2 được coi là xong khi:

- [ ] Khách chưa đăng nhập tạo được lịch trình 1–5 ngày chỉ bằng nút bấm; p95 dưới 500 ms, chưa tính mô tả LLM
- [ ] Không lịch trình nào chứa điểm không `active`, điểm đóng cửa vào giờ ghé hoặc điểm quá 90 ngày chưa xác minh
- [ ] Báo cáo độ phủ (S36) cho thấy mọi tổ hợp 1–4 ngày × 2 nhịp × 7 thứ khởi hành, với bộ gu mặc định, đều tạo được lịch trình không lỗi
- [ ] Người tạo đổi được thứ tự, khoá điểm và đổi điểm khác trên màn 390px
- [ ] Link `/l/{shareId}` noindex và không để lộ vị trí nơi ở của khách trong HTML, JSON hay ảnh vé
- [ ] Vé dạng ảnh (story và ảnh xem trước) có cho cả lịch trình mẫu lẫn lịch trình của khách; dán link vào Zalo và Messenger thì hiện ảnh vé
- [ ] Đo được số lịch trình tạo, lượt chia sẻ, lượt tạo vé và lượt quay lại có `utm_source=ticket`

## 2. Phạm vi và giả định

Lát 2 chỉ gồm phần tạo, sửa và chia sẻ lịch trình. Khách vẫn chưa cần đăng nhập: người tạo được nhận diện bằng cookie `gid` (ADR 0009).

| Trong lát 2 | Để lát sau |
| --- | --- |
| Tạo lịch trình theo yêu cầu, tối đa 5 ngày | Đăng nhập cho khách, nút "Lưu", gộp `gid` vào tài khoản (lát 3) |
| Đổi thứ tự, khoá, đổi điểm, tối ưu lại, thêm điểm tiện đường | Điểm VIP và nhãn "Đối tác" trong lịch trình, voucher theo điểm (giai đoạn 2) |
| Link `/l/{shareId}`, "Tạo bản của mình" từ link người khác gửi | Cả nhóm cùng sửa một lịch trình, chế độ "Hôm nay" |
| Vé dạng ảnh cho lịch trình mẫu và lịch trình của khách | Hỏi nhanh sau chuyến đi, giảm hạng điểm hay bị đổi (chỉ ghi sự kiện ở lát 2) |
| Mô tả bằng LLM (P1), ma trận OSRM (P2) | SSE thay polling, OR-Tools |

**Quyết định cho lát 2 (chủ dự án duyệt 19/10/2026):**

Mỗi mục dưới đây giải quyết một chỗ mâu thuẫn hoặc thiếu trong tài liệu hiện có. S29 sửa tài liệu gốc cho khớp.

1. **Chuyến 5 ngày:** mỗi ngày 1–2 cụm kề nhau. Bốn ngày đầu không lặp cụm. Ngày thứ 5 đi nhịp thong thả (cà phê, chợ, đặc sản) theo product-spec mục 8, được dùng lại cụm nhưng không lặp điểm. Cách này sửa chỗ "không lặp zone" ở technical-design mục 7, vốn không thể đúng khi chỉ có 4 cụm.
2. **Cụm kề nhau là cụm chung ranh giới, trừ cặp cấm ghép.** Bảng kề và cặp cấm lưu trong dữ liệu thành phố, không ghi cứng trong code, để mở thành phố mới chỉ bằng dữ liệu. Với Đà Lạt, theo ranh giới hiện có trong seed: ghép được Trung tâm–Nam, Trung tâm–Bắc, Trung tâm–Đông, Nam–Đông; cấm Bắc–Đông; Nam–Bắc không kề. Ranh giới cụm vẫn chờ duyệt (S03); ranh giới đổi thì bảng kề đổi theo.
3. **Gu chỉ cộng điểm, không loại điểm** (đúng với technical-design mục 7, bước 3–4). Gu và "đi cùng ai" là danh sách cố định trong `packages/contracts`. Thẻ địa điểm vẫn là slug tự do như hiện nay. Bộ khởi đầu, dùng thẻ có sẵn trong tab "Tags":

   | Gu (khách chọn tối đa 3) | Thẻ địa điểm |
   | --- | --- |
   | Cà phê chill | `chill` |
   | Săn mây, view đồi | `view-doi`, cộng điểm cho địa điểm có thời điểm đẹp `sunrise` |
   | Sống ảo | `song-ao` |
   | Thiên nhiên, mạo hiểm | `mao-hiem` |
   | Ăn sáng, đặc sản | `an-sang`, `dac-san` |

   Đi cùng ai (chọn một): Một mình, Cặp đôi, Nhóm bạn, Gia đình (cộng điểm cho thẻ `gia-dinh`).
4. **Lịch trình mẫu có gu:** admin gắn gu và "đi cùng ai" cho mẫu, nhờ đó bước "chọn mẫu gần nhất" mới có dữ liệu để so khớp. Hiện S15 lưu `tags: []` và chép `style` vào `with`.
5. **Nơi ở:** chọn bằng ghim trên bản đồ MapLibre hoặc chọn cụm, và bỏ qua được. Bỏ qua thì tuyến bắt đầu từ điểm đầu tiên. Không dùng Google autocomplete (ADR 0001), không thêm dịch vụ tìm địa chỉ. Chỉ lưu toạ độ đã làm tròn khoảng 500 m, và không bao giờ trả toạ độ này trong API, trang hay ảnh công khai.
6. **Không cache kết quả thuật toán:** thuật toán chạy trong bộ nhớ đã đủ nhanh. Chỉ cache mô tả LLM, theo hash nội dung lịch trình (thành phố, điểm, giờ). Mô tả không thể cũ, nên bỏ được khoá `itin:{paramsHash}`, tập `itin:byplace` và job `itinerary.cacheInvalidate`. Cách này cũng sửa lỗi khoá cache thiếu `cityId`. Thay đổi phần cache của ADR 0007 nên cần ADR mới.
7. **Mọi lượt đọc công khai dùng `shareId`** (ngẫu nhiên, base62, unique), không dùng ObjectId: trang, mô tả, ảnh vé. Lịch trình mẫu dùng slug.
8. **Sửa lịch trình theo `key` của điểm** (UUID như S15) kèm `version`. Request dựa trên bản cũ trả `CONFLICT`. Thay `{ day, stopIndex }` ở technical-design mục 6.
9. **Một hằng số khung bữa ăn** trong contracts, dùng chung cho kiểm tra S15 và thuật toán. Lấy theo S15 (11:30–13:30, 18:00–20:00) vì đã chạy và có test.
10. **Mùa mưa đọc `City.seasons` có `kind: 'rain'`** (S23), không ghi cứng tháng 5–11. Không có mùa mưa trong dữ liệu thì không áp ưu tiên mái che.
11. **`narrative` lưu có cấu trúc:** `{ intro, days: [{ day, intro, stops: [{ key, note }] }] }`, khớp với JSON mà LLM trả về.
12. **Thời gian di chuyển** dùng hàm ước lượng hiện có (chim bay × 1,4 ÷ 25 km/h, làm tròn 5 phút) cho tới khi có S44.
13. **Không có VIP ở lát 2:** `isVip` luôn `false`. Công thức chấm điểm giữ nguyên, `ratingAvg` bằng 0 cho tới lát 3.
14. **Vé sinh theo yêu cầu:** sinh khi bấm "Tạo vé để chia sẻ" hoặc khi ảnh xem trước được gọi lần đầu, không sinh lại sau mỗi lần sửa. Ảnh lưu R2 theo hash nội dung vé, ảnh cũ bị xoá.
15. **Màn tạo lịch trình ở `/da-lat/tao-lich-trinh`:** SSR, được index. Không dùng dạng `/da-lat/lich-trinh/tao`, vì có thể trùng slug của một lịch trình mẫu.
16. **Giới hạn tạo lịch trình:** 10 lần/giờ mỗi `gid` và 60 lần/giờ mỗi IP, thay mức 10/giờ mỗi IP ở technical-design mục 13. Khách dùng chung wifi khách sạn hay 4G chung IP không bị chặn nhầm, còn mức theo IP vẫn chặn bot xoá cookie.
17. **Font của vé:** file font nằm trong repo, chỉ dùng cho vé (Satori bắt buộc có file font). Web giữ Google Fonts như hiện nay.
18. **LLM là P1:** ra mắt được với mô tả mẫu. Chọn model, prompt và ngân sách khi bắt đầu S43.

**Giả định về thời gian:** khoảng 20 giờ code mỗi tuần. P0 khoảng 78 giờ, tức khoảng 4 tuần. Cộng P1 thì khoảng 5 tuần.

## 3. Lộ trình 5 tuần

Tuần 1 làm vé chia sẻ trước, vì vé chạy được ngay với 5 lịch trình mẫu của lát 1. Tuần 2–4 làm thuật toán, API, màn hình và đo lường, xong hết P0. Tuần 5 dành cho P1, staging và điện thoại thật.

*Vé cho lịch trình mẫu có từ tuần 1, tạo theo yêu cầu có từ tuần 4.*

| Tuần | Code | Dữ liệu | Nội dung |
| --- | --- | --- | --- |
| Tuần 1 (16–22/11) | S29 Chốt tài liệu<br>S30 Vé dạng ảnh<br>S31 Từ vựng chuyến đi<br>S32 Gu cho mẫu | Chốt danh sách gu, bảng cụm kề, ngày mùa mưa<br>Gắn gu cho 5 mẫu | Đăng vé của lịch trình mẫu lên group |
| Tuần 2 (23–29/11) | S33 Nhắc thiếu dữ liệu<br>S34 Chọn điểm<br>S35 Sắp tuyến, xếp giờ | Bổ sung thời lượng ghé, thời điểm đẹp cho điểm đã có | — |
| Tuần 3 (30/11–6/12) | S36 Báo cáo độ phủ<br>S37 API tạo, đọc<br>S38 Màn tạo (bắt đầu) | Chạy báo cáo độ phủ, thêm điểm cho cụm thiếu | Thêm mẫu cho số ngày hoặc gu còn thiếu |
| Tuần 4 (7–13/12) | S38 Màn tạo<br>S39 Trang `/l/`<br>S40 Sửa lịch trình<br>S41 Đo lường | Hướng tới khoảng 150 điểm `active` đủ dữ liệu | Thử 20 lịch trình, so thời gian với Google Maps |
| Tuần 5 (14–20/12) | S42–S43 (P1)<br>Thử staging, điện thoại thật | Xác minh lại điểm sắp quá 90 ngày | Chuẩn bị bài ra mắt "tự lên lịch" |

**Ra mắt (21–23/12):** khách tự tạo, sửa và chia sẻ lịch trình, trước kỳ nghỉ cuối năm.

Nếu thiếu giờ thì ra mắt khi P0 xong, làm S42–S43 sau. Story P2 (S44–S47) làm khi còn dư giờ.

## 4. Backlog

19 story, tổng khoảng 100 giờ; phần P0 khoảng 78 giờ. Làm theo thứ tự ID. Mọi logic lịch trình (S31, S34, S35, phần API của S40, S42) thuộc vùng bắt buộc TDD.

| ID | Epic | Story | Tiêu chí nghiệm thu | Giờ | Ưu tiên | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| S29 | Tài liệu | Chốt thiết kế lát 2 trong tài liệu | Sửa tài liệu theo các quyết định đã duyệt ở mục 2: technical-design mục 3 (`narrative` có cấu trúc, `stayLocation` làm tròn, `version`), mục 6 (đọc công khai bằng `shareId`, sửa theo `key`), mục 7 (ngày 5, cụm kề, gu, bỏ cache kết quả, mùa mưa, khung bữa ăn, không có VIP), mục 10–11 (job vé theo yêu cầu, URL `/da-lat/tao-lich-trinh`), mục 13 (giới hạn theo `gid` và IP), mục 14 (đánh dấu câu đã chốt); architecture mục 6–7; product-spec mục 8; ui-spec mục 5 (màn tạo, màn sửa), mục 9 và mục 13; ADR 0014 thay phần cache của ADR 0007 | 3 | P0 | Xong trên `docs/S29-slice-2-backlog`: ADR 0014, technical-design, architecture, product-spec, ui-spec, data-collection khớp 18 quyết định; plan `docs/superpowers/plans/2026-10-19-s29-slice-2-design-docs.md`; chờ merge |
| S30 | Chia sẻ | Vé lịch trình dạng ảnh | Theo Spec UI mục 9: Satori + resvg trong worker; file font Lora, Be Vietnam Pro, Patrick Hand có tiếng Việt nằm trong repo, chỉ dùng cho vé, giấy phép ghi ở `/ghi-nguon`; QR có `utm_source=ticket`; story 1080×1920 và OG 1200×630, tối đa 8 điểm rồi "+ x điểm"; lần này áp cho lịch trình mẫu (QR tới trang mẫu), S39 áp cho lịch trình của khách; sinh khi bấm "Tạo vé để chia sẻ" hoặc khi OG được gọi lần đầu, lưu R2 theo hash nội dung vé, xoá ảnh cũ; chưa sinh xong thì OG dùng ảnh mặc định; URL ảnh không chứa ObjectId; màn xem trước, Web Share kèm file, không hỗ trợ thì "Lưu ảnh" và "Sao chép link"; dán link vào Zalo, Messenger hiện ảnh vé; ghi thư viện mới (Satori, resvg, QR) vào `docs/decisions.md` | 10 | P0 | Code xong trên `feat/S30-itinerary-ticket`: module `tickets` (API + worker), vé mẫu, `og:image`, màn xem trước, font ở `/ghi-nguon`; runbook `docs/runbooks/itinerary-ticket.md`; chờ S02, Zalo/Messenger thật, điện thoại thật, Sentry 24 giờ |
| S31 | Lịch trình | Từ vựng chuyến đi và schema yêu cầu | Trong `packages/contracts`: `TripWith` (một mình, cặp đôi, nhóm bạn, gia đình), `TripInterest` (5 gu ở mục 2) kèm bảng gu → thẻ địa điểm, `MEAL_WINDOWS` dùng chung (S15 chuyển sang dùng, test cũ vẫn xanh), `ItineraryRequest` (1–5 ngày; ngày đi theo giờ Việt Nam, không trước hôm nay; phương tiện; đi cùng ai; tối đa 3 gu; nhịp độ; nơi ở tuỳ chọn, nằm trong `City.mapBounds`), `ItineraryNarrative` có cấu trúc; mọi nhánh validate có unit test | 4 | P0 | Code xong trong workspace: từ vựng/bảng gu, khung bữa ăn chung S15, request theo ngày Việt Nam + factory kiểm khung thành phố, narrative có cấu trúc; runbook `docs/runbooks/trip-contracts.md`; chờ CI remote và nghiệm thu triển khai |
| S32 | Nhập liệu | Gắn gu và "đi cùng ai" cho lịch trình mẫu | Form `/lich-trinh` trong admin có chip Gu (tối đa 3) và Đi cùng ai, lưu vào `params.tags` và `params.with`, không chép `style` nữa; mẫu cũ vẫn mở và lưu được (gu rỗng; `with` lấy từ `style` khi khớp danh sách); xem trước điện thoại và Google không đổi | 2 | P0 | Code xong trong workspace: chip Gu/Đi cùng ai, lưu riêng khỏi phong cách, đọc/lưu mẫu cũ và khôi phục nháp, preview không đổi; 20 task workspace, 84 SSR, Chrome 390px/desktop và review độc lập đạt; runbook `docs/runbooks/template-trip-preferences.md`; chờ CI remote, staging, điện thoại thật và Sentry 24 giờ |
| S33 | Dữ liệu | Nhắc thiếu dữ liệu cho lịch trình | Cột "Còn thiếu" và thẻ điện thoại trong danh sách admin thêm nhắc (không chặn kích hoạt): chưa có thời lượng ghé, thời điểm đẹp, cụm, quá 90 ngày hoặc sắp tới 90 ngày chưa xác minh; lọc được theo từng loại nhắc | 2 | P0 | Code xong trên `feat/S33-itinerary-data-reminders`: nhắc/lọc từng loại, sắp xác minh trước hạn 7 ngày, dữ liệu cũ, bảng/thẻ và bộ lọc URL; 20 task workspace, 84 SSR, Chrome 390px/desktop và review độc lập đạt; runbook `docs/runbooks/itinerary-data-reminders.md`; chờ CI remote, staging, điện thoại thật và Sentry 24 giờ |
| S34 | Lịch trình | Chọn điểm cho từng ngày | Lọc ứng viên: `active`, xác minh trong 90 ngày, có toạ độ, cụm, giờ hợp lệ, mở đúng thứ, hợp phương tiện. Chấm điểm theo technical-design mục 7, gu chỉ cộng điểm. Chọn mẫu gần nhất cùng số ngày theo gu và "đi cùng ai", chỉ thay điểm không hợp. Gán cụm theo bảng kề trong dữ liệu thành phố, không lặp cụm trong 4 ngày đầu, ngày 5 nhịp thong thả, không lặp điểm. Mùa mưa đọc `City.seasons`. Cùng đầu vào cho cùng kết quả. Thiếu điểm thì trả `NOT_ENOUGH_PLACES` kèm gợi ý giảm số ngày hoặc bỏ gu | 8 | P0 | Code xong trên `feat/S34-itinerary-place-selection`: hàm thuần `planItinerary` (lọc, chấm điểm, mẫu gần nhất, gán cụm theo `Zone.adjacentZones` lưu trong seed, mùa mưa, ngày 5, gợi ý đã chạy thử); giá trị khởi đầu ghi ở technical-design mục 7; 20 task workspace, 84 SSR; runbook `docs/runbooks/itinerary-place-selection.md`; chờ CI remote, `pnpm seed` lại trên DB đang chạy, nối vào S36/S37 |
| S35 | Lịch trình | Sắp tuyến và xếp giờ | Nearest neighbor từ nơi ở (không có nơi ở thì tuyến mở từ điểm đầu) rồi 2-opt. Điểm `sunrise` đứng đầu ngày (bắt đầu 04:45), điểm `evening` đứng cuối. Xếp giờ bằng hàm chung tách từ `analyzeTemplate`; sai giờ mở cửa thì thử đổi với điểm kề, vẫn sai thì bỏ điểm có điểm số thấp nhất. Chèn bữa ăn trong `MEAL_WINDOWS`: chọn quán phục vụ ăn uống có detour nhỏ nhất, đúng mức giá. Gợi ý tiện đường khi detour dưới 10 phút. Ngày kết thúc trước 21:30. Đo với 200 địa điểm giả: p95 dưới 500 ms | 10 | P0 | Code xong trên `feat/S35-itinerary-route-schedule`: hàm thuần `generateItinerary` (tuyến, `scheduleDay` chung với S15, chờ quán mở, sửa sai giờ, bữa ăn theo phút thêm vào tuyến rồi mức giá của ngày, tiện đường, 21:30, chiều mưa), gợi ý thiếu điểm chạy thử cả S34–S35; p95 17,2 ms với 200 điểm giả; runbook `docs/runbooks/itinerary-route-schedule.md`; chờ CI remote, nối vào S36/S37 |
| S36 | Dữ liệu | Báo cáo độ phủ lịch trình | Trang admin chạy thuật toán S34–S35 cho mọi tổ hợp 1–5 ngày × 2 nhịp × 7 thứ khởi hành × từng gu, liệt kê tổ hợp lỗi kèm lý do (cụm nào thiếu điểm, thiếu bữa ăn); đếm số điểm đủ dữ liệu theo cụm và danh mục; chỉ đọc, không ghi lịch trình | 3 | P0 | Chưa làm |
| S37 | Lịch trình | API tạo và đọc lịch trình của khách | Cookie `gid` theo ADR 0009 (API cấp khi tạo lần đầu). `POST /v1/cities/:city/itineraries` validate `ItineraryRequest`, kiểm `Origin`, giới hạn 10 lần/giờ mỗi `gid` và 60 lần/giờ mỗi IP bằng bộ giới hạn trượt của S18, quá giới hạn trả `RATE_LIMITED`. Snapshot địa điểm trong bộ nhớ, làm mới mỗi 10 phút và ngay khi admin ghi địa điểm. Lưu `kind: user`, `shareId`, `stayLocation` đã làm tròn; tạo index `{shareId}`. mọi phản hồi lịch trình của khách (tạo, `GET /v1/itineraries/:shareId`, sửa, tối ưu, chép) không trả nơi ở, `guestId`, `ownerId`; bản chép bỏ nơi ở của người chia sẻ; điểm không còn `active` hiện ô ẩn như S16. Trang `/quyen-rieng-tu` thêm cookie `gid` và vị trí nơi ở | 8 | P0 | Chưa làm |
| S38 | Web khách | Màn tạo lịch trình | Route mới `/da-lat/tao-lich-trinh`, SSR, được index, có trong sitemap. Các bước bấm nút: số ngày, ngày đi, phương tiện, đi cùng ai, gu, nhịp độ, nơi ở (ghim trên bản đồ hoặc chọn cụm, bỏ qua được). Trạng thái đang tạo; thiếu điểm (câu giọng địa phương + nút áp dụng gợi ý); lỗi mạng (giữ lựa chọn). Tạo xong chuyển tới `/l/{shareId}`. Có lối vào từ trang chủ và trang lịch trình mẫu. Thiết kế 390px trước, vùng bấm 44px, tôn trọng giảm chuyển động | 10 | P0 | Chưa làm |
| S39 | Web khách | Trang lịch trình cá nhân `/l/{shareId}` | Dùng lại component S16 (timeline, thanh ngày, bản đồ đánh số, chỉ đường); noindex, không cache CDN. Có nhãn Tiện đường và mô tả mẫu sinh từ dữ liệu, chừa chỗ cho mô tả của S43. Người tạo thấy nút Sửa; người xem thấy "Tạo bản của mình" (chép thành lịch trình mới của họ). OG và nút "Tạo vé" dùng S30, QR trỏ tới `/l/{shareId}`. Test SSR kiểm không có toạ độ nơi ở trong HTML, JSON và phản hồi của `copy`; `shareId` sai trả 404 no-store | 6 | P0 | Chưa làm |
| S40 | Lịch trình | Sửa lịch trình: thứ tự, khoá, đổi điểm | Kéo thả và nút lên/xuống trên 390px, chuyển điểm sang ngày khác, khoá điểm. "Đổi điểm khác tương tự" trả 3 gợi ý cùng loại, cùng cụm, mở đúng khung giờ, chưa có trong lịch trình. Mọi thao tác theo `key` và `version`: sai `version` trả `CONFLICT`, web tải lại bản mới. Chỉ `gid` đã tạo lịch trình mới được sửa, người khác nhận `FORBIDDEN`. Server tính lại giờ và cảnh báo khi ngoài giờ mở cửa. Ghi `ItineraryEvent` (`swap_out`, `swap_in`, `lock`) | 8 | P0 | Chưa làm |
| S41 | Đo lường | Số liệu lát 2 | Đếm theo ngày và thành phố: lịch trình tạo (đếm từ DB), bấm chia sẻ, tạo vé, chia sẻ vé, lượt vào có `utm_source=ticket`. Không lưu sự kiện thô (ADR 0012). Bấm chỉ đường từ lịch trình của khách ghi nguồn `itinerary`. Admin `/bao-cao` thêm khối Lịch trình theo tuần | 4 | P0 | Chưa làm |
| S42 | Lịch trình | Tối ưu lại và thêm điểm tiện đường | "Tối ưu lại" chạy lại bước sắp tuyến, xếp giờ, chèn bữa, giữ nguyên điểm đã khoá. Thêm điểm tiện đường vào lịch bằng một chạm, giờ tự tính lại | 4 | P1 | Chưa làm |
| S43 | Lịch trình | Mô tả lịch trình bằng LLM | Job `itinerary.narrative` trong worker, gửi JSON gọn (tên, giờ, ghi chú thực tế). Kết quả validate bằng `ItineraryNarrative`: chỉ nhận `key` có trong lịch trình; từ chối khi có giờ, giá, số điện thoại hay địa chỉ không có trong đầu vào. Lỗi hoặc quá 8 giây thì giữ mô tả mẫu. Cache theo hash nội dung, lưu theo vị trí điểm và gắn lại vào `key` khi dùng; sửa lịch trình thì dùng cache theo nội dung mới hoặc xoá mô tả và viết lại. Web gọi `GET /v1/itineraries/:shareId/narrative` mỗi 2 giây, tối đa 5 lần. Key đọc qua `loadEnv()`, có quota và cảnh báo ngân sách tháng | 6 | P1 | Chưa làm |
| S44 | Vận hành | Ma trận khoảng cách OSRM | `tools/osrm` chạy OSRM local với dữ liệu OSM Việt Nam, ghi `distance_matrix` theo phương tiện; job `distance.incremental` tính cho điểm mới; thuật toán dùng ma trận, thiếu cạnh thì dùng ước lượng | 8 | P2 | Chưa làm |
| S45 | Web khách | Gợi ý cho chuyến trên 5 ngày | Chọn trên 5 ngày thì gợi ý lịch 4N3Đ cộng một ngày tự do, kèm danh sách quán cà phê và điểm ít người biết (product-spec mục 8) | 2 | P2 | Chưa làm |
| S46 | Web khách | Spike: mở cả ngày trên Google Maps | Thử giới hạn số điểm dừng của URL chỉ đường nhiều điểm trên app Android và iPhone; ghi kết quả vào runbook, chỉ làm nút khi đạt | 2 | P2 | Chưa làm |
| S47 | UI | Tem trang trí trên trang địa điểm | Chuyển từ lát 1 khi đã có hình vẽ (Spec UI mục 10, 13) | — | P2 | Chưa làm |

## 5. Dữ liệu và nội dung

Thuật toán chỉ tốt bằng dữ liệu đầu vào. Rủi ro lớn nhất của lát 2 vẫn là dữ liệu: đủ điểm cho mỗi cụm và đủ trường cho thuật toán. Cách thu thập giữ như [Quy trình thu thập và xác nhận dữ liệu](data-collection.md).

**Một điểm đủ dữ liệu cho lịch trình khi:** đang `active`, được xác minh trong 90 ngày, có toạ độ, cụm, giờ mở cửa hợp lệ và thời lượng ghé. Thời điểm đẹp không bắt buộc, nhưng thiếu thì điểm săn mây hay chợ đêm sẽ không được xếp đúng đầu hoặc cuối ngày.

**Tuần 1 (16–22/11):**

- [ ] Chốt danh sách gu và bảng gu → thẻ, đối chiếu tab "Tags" trong Google Sheet
- [ ] Chốt bảng cụm kề nhau và cặp cấm ghép
- [ ] Nhập ngày mùa mưa vào `City.seasons` trong admin `/mua`
- [ ] Gắn gu và "đi cùng ai" cho 5 lịch trình mẫu

**Tuần 2 (23–29/11):**

- [ ] Bổ sung thời lượng ghé và thời điểm đẹp cho mọi điểm `active`

**Tuần 3 (30/11–6/12):**

- [ ] Chạy báo cáo độ phủ, ghi lại cụm và tổ hợp còn lỗi
- [ ] Thu thập thêm điểm cho cụm thiếu, ưu tiên điểm tham quan và chỗ ăn

**Tuần 4 (7–13/12):**

- [ ] Khoảng 150 điểm `active` đủ dữ liệu (product-spec đặt mục tiêu khoảng 200 điểm trong MVP)
- [ ] Thêm lịch trình mẫu cho số ngày hoặc gu còn thiếu, hướng tới 13 mẫu (product-spec mục 8)
- [ ] Tạo thử 20 lịch trình, mở từng chặng trên Google Maps để so thời gian di chuyển

**Tuần 5 (14–20/12):**

- [ ] Xác minh lại các điểm sắp quá 90 ngày
- [ ] Báo cáo độ phủ không còn tổ hợp lỗi với 1–4 ngày

## 6. Definition of done, rủi ro và câu hỏi mở

Definition of done giống lát 1 (backlog lát 1, mục 6), cộng thêm ba điều kiện riêng cho lịch trình.

**Definition of done cho mỗi story:**

- Đạt toàn bộ tiêu chí nghiệm thu trong bảng mục 4
- Merge vào `main`, CI xanh, đã deploy và thử trên staging
- Đã thử trên điện thoại thật (Android và iPhone nếu có)
- Logic lịch trình viết test trước (vùng TDD trong CLAUDE.md); logic có điều kiện khác có unit test
- Test kiểm không có toạ độ nơi ở trong phản hồi công khai, HTML và ảnh vé
- Không có lỗi mới trong Sentry sau 24 giờ trên staging

**Rủi ro:**

| Rủi ro | Dấu hiệu sớm | Cách xử lý |
| --- | --- | --- |
| Không đủ điểm, khách hay gặp lỗi `NOT_ENOUGH_PLACES` | Báo cáo độ phủ còn tổ hợp lỗi vào tuần 4 | Chỉ mở số ngày đã đủ dữ liệu; ưu tiên thu thập cho cụm thiếu; gu chỉ cộng điểm, không lọc |
| Điểm xác minh đợt đầu quá 90 ngày, rơi khỏi lịch trình | Điểm xác minh tháng 10/2026 hết hạn vào giữa tháng 1/2027 | Xác minh lại hằng tuần theo cột "Còn thiếu" (S33); chia đều đợt xác minh |
| Tuyến đi vòng vì ước lượng chim bay (đèo, đường một chiều) | Thời gian lệch nhiều so với Google Maps khi thử 20 lịch trình | Kéo S44 (OSRM) lên trước S42–S43 |
| Giới hạn vẫn chặn nhầm khách dùng chung mạng (wifi khách sạn, 4G dùng chung IP) | Nhiều `RATE_LIMITED` theo IP trong log nhưng ít theo `gid` | Nới mức theo IP; mức theo `gid` giữ nguyên |
| Chi phí LLM tăng | Vượt ngân sách tháng (product-spec mục 11: 50–250 nghìn) | Cache theo nội dung, quota, cảnh báo; quá ngân sách thì chỉ dùng mô tả mẫu |
| Thiếu giờ code | Hết tuần 3 chưa xong S37 | Ra mắt không có S42–S43; phần sửa chỉ giữ đổi điểm và đổi thứ tự |

**Câu hỏi mở:**

- [x] Duyệt các quyết định ở mục 2: đã duyệt hết 19/10/2026
- [x] Ngày bắt đầu lát 2: sau khi ra mắt lát 1, từ 16/11/2026
- [x] URL màn tạo lịch trình: `/da-lat/tao-lich-trinh`
- [x] Danh sách gu, bảng gu → thẻ: 5 gu theo tab "Tags" (mục 2)
- [x] Bảng cụm kề nhau và cặp cấm ghép cho Đà Lạt: chung ranh giới, cấm Bắc–Đông (mục 2)
- [x] Chọn nơi ở: ghim trên bản đồ hoặc chọn cụm, bỏ qua được; chưa thêm dịch vụ tìm địa chỉ
- [x] Font cho vé: file font trong repo, chỉ cho vé
- [x] Giới hạn tạo lịch trình: 10 lần/giờ mỗi `gid`, 60 lần/giờ mỗi IP
- [ ] Số giờ code thực tế mỗi tuần sau khi ra mắt lát 1 (lộ trình đang tính 20 giờ)
- [ ] Model LLM, prompt và ngân sách tháng: chốt khi bắt đầu S43
- [ ] Ranh giới 4 cụm (S03) chờ duyệt; bảng cụm kề đổi theo nếu ranh giới đổi
