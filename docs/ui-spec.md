# Spec UI: Rành Đường

6/10/2026 · @Manh Tri

## 1. Tổng quan

Giao diện theo phong cách **"Sổ tay của người địa phương"**: trông như cuốn sổ ghi chép của một người rành Đà Lạt, không giống trang đặt tour hay template có sẵn. Bản mẫu 6 màn hình: [Rành Đường – Demo UI](https://claude.ai/artifact/M81fn6X8fzBBqpnNYviz3v). Tài liệu liên quan: [Spec sản phẩm: Cẩm nang số Đà Lạt (MVP)](product-spec.md), [Thiết kế kỹ thuật: Cẩm nang số Đà Lạt (MVP)](technical-design.md), [Backlog lát 1: Cẩm nang số Đà Lạt](backlog.md).

**Nguyên tắc:**

- **Mobile trước:** phần lớn khách đến từ Facebook, TikTok và Zalo trên điện thoại; mọi màn hình thiết kế ở 390px rồi mới mở rộng lên desktop.
- **Hành động chính luôn trong tầm tay:** nút "Chỉ đường" cố định ở cạnh dưới trang địa điểm, vì lượt bấm chỉ đường là chỉ số chính.
- **Sự thật trước, trang trí sau:** trạng thái mở cửa, ngày xác minh, nhãn "chưa xác nhận" và "Đối tác" luôn hiển thị rõ; chi tiết trang trí không được che thông tin.
- **Chất địa phương qua chi tiết nhỏ:** ghi chú viết tay, giọng văn người địa phương, bản đồ vẽ tay, tem; không dùng gradient, emoji hay hiệu ứng nặng.
- **Một thương hiệu, nhiều thành phố:** cấu trúc giữ nguyên, mỗi thành phố và mỗi mùa đổi màu nhấn và hình minh hoạ qua token.

Tên thương hiệu: Rành Đường, tên miền ranhduong.vn (đổi từ tên tạm Ghé Đâu vì "ghedau" không dấu dễ đọc thành "ghế đẩu").

**Design system:** token, component (có xem trước trực tiếp, đổi theme theo mùa) và brand book ở [Rành Đường – Design System](https://claude.ai/artifact/TZnHy2ugtDautrGXuGhjLT). Khi tài liệu này và design system khác nhau, cập nhật cả hai cùng lúc; code trong `packages/ui` theo design system.

## 2. Design tokens

Token khai báo một lần trong `packages/ui` dưới dạng CSS variables; màu nhấn là token duy nhất thay đổi theo thành phố và theo mùa, mọi màu khác cố định.

**Màu nền và chữ:**

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--paper` | #F7F2E8 | Nền trang (kem ấm như giấy) |
| `--paper-raised` | #FFFDF8 | Thẻ, nút phụ, bottom sheet, thanh hành động |
| `--ink` | #1E3A2F | Chữ chính, nút chính, viền đậm (xanh rừng thông) |
| `--ink-soft` | #46564E | Chữ phụ, mô tả, chú thích |
| `--mist` | #DDE5E2 | Chip trung tính, ô giữ chỗ ảnh |
| `--line` | #C9D3CF | Viền thẻ, đường phân cách |
| `--note` | #FCEFB4 | Nền ghi chú viết tay |
| `--note-edge` | #E2D38E | Bóng dưới ghi chú |
| `--map-land` | #F3EAD6 | Nền bản đồ |
| `--map-forest` | #CBD9C5 | Rừng thông trên bản đồ |
| `--map-water` | #BFD4DC | Hồ, suối |
| `--map-road-casing` | #B8A98A | Viền đường |

**Màu nhấn (`--accent`), luôn đi với chữ `--ink`, không dùng chữ trắng trên nền nhấn:**

| Ngữ cảnh | Giá trị | Ghi chú |
| --- | --- | --- |
| Đà Lạt, mùa dã quỳ (mặc định) | #E9B824 | Vàng dã quỳ |
| Đà Lạt, mùa mai anh đào | #E58FA8 | Hồng |
| Đà Lạt, mùa mưa | #8DB3CF | Xanh xám mưa |
| Thành phố khác | Đặt trong cấu hình thành phố | Kiểm tra tương phản với `--ink` từ 4,5:1 |

Màu nhấn dùng cho: chip "Đang mở", "Theo mùa", "Tiện đường", nút "Chỉ đường", ghim đang chọn, điểm cuối lịch trình, nền tem. Không dùng màu nhấn cho chữ.

**Chữ (nhớ tải bộ ký tự tiếng Việt):**

| Vai trò | Font | Cỡ / độ đậm |
| --- | --- | --- |
| Tiêu đề trang (H1) | Lora | 30–32px / 700, line-height 1.15 |
| Tiêu đề mục (H2) | Lora | 22px / 700 |
| Tên thẻ | Be Vietnam Pro | 16–17px / 700 |
| Nội dung | Be Vietnam Pro | 15px / 400, line-height 1.5 |
| Phụ, meta | Be Vietnam Pro | 13px / 400–600 |
| Chip, nhãn nhỏ | Be Vietnam Pro | 11–13px / 600–700 |
| Ghi chú viết tay | Patrick Hand | 16–19px / 400, line-height 1.3 |

Không dùng Patrick Hand cho thông tin quan trọng (giờ mở cửa, giá, trạng thái); chỉ cho ghi chú và lời người địa phương.

**Khoảng cách, bo góc, viền:**

- Khoảng cách theo bội số 4: 4, 8, 12, 16, 20, 24, 28. Lề trang 20px trên điện thoại.
- Bo góc: chip 10–14px; nút 22–26px (dạng viên thuốc); thẻ 16px; ô ảnh trong thẻ 12px; bottom sheet 24px ở hai góc trên; ghi chú 4px.
- Viền: thẻ 1.5px `--line`; nút phụ và ô tìm kiếm 1.5px `--ink`; thẻ nổi bật 2px `--ink`; viền nét đứt cho hành động "tạo, sưu tầm" (vé, tem).
- Bóng: hầu như không dùng; chỉ ghi chú (`0 2px 0 --note-edge`) và nút nổi "Xem bản đồ" (`0 6px 16px rgba(30,58,47,.25)`).

## 3. Giọng văn người địa phương

Viết như một người bạn rành Đà Lạt nhắn tin chỉ chỗ: ngắn, cụ thể, có kinh nghiệm thật; không viết như brochure quảng cáo.

**Quy tắc:**

- Xưng hô trung tính, gần gũi; dùng "bạn" khi cần. Có thể dùng từ cuối câu nhẹ như "nha" trong ghi chú viết tay, không dùng trong thông tin chính.
- Mỗi ghi chú nói một điều cụ thể có ích: giờ nào đẹp, ngồi chỗ nào, đường thế nào, mang gì theo.
- Không phóng đại ("tuyệt đẹp nhất Đà Lạt", "must-try"), không dùng tiếng Anh khi có từ tiếng Việt quen thuộc.
- Thông tin chính (giờ mở cửa, trạng thái, giá) viết rõ ràng, trung tính; giọng địa phương dành cho ghi chú, tiêu đề mục, lời nhắc.
- Không viết thay quán những điều quán chưa xác nhận.

**Ví dụ:**

| Chỗ | Nên viết | Tránh |
| --- | --- | --- |
| Tiêu đề mục danh sách quán | Chỗ dân ở đây hay ngồi | Top quán cà phê hot nhất |
| Ghi chú địa điểm | Đi trước 8 giờ để còn sương. Đường đèo hơi dốc, xe số yếu thì chạy chậm thôi. | Không gian tuyệt đẹp, view cực chill, nhất định phải ghé! |
| Thẻ quán | "Ngồi tầng 2 nhìn ra đồi, chiều ít người." | Quán đẹp, đồ uống ngon. |
| Gợi ý điểm thêm | Tiện đường ghé thêm | Địa điểm liên quan |
| Thời tiết | Chiều nay mưa, ghé quán trong nhà cho ấm. | Cảnh báo: có mưa. |
| Xác minh | Đã hỏi lại ngày 12/10/2026 | Verified |
| Vé chia sẻ | Mình đi theo lịch này nè, bạn đi chung không? | Chia sẻ lịch trình của bạn |

Ghi chú địa phương lưu trong `practicalNotes` của địa điểm, do bạn tự viết từ thông tin thu thập; không chép nguyên văn review của người khác.

## 4. Component

Component dùng chung nằm ở `packages/ui` (Vue 3), dùng cho cả web khách và trang chủ quán; mọi vùng bấm tối thiểu 44×44px.

**Nút:**

| Loại | Hình dạng | Dùng cho |
| --- | --- | --- |
| Chính | Nền `--ink`, chữ `--paper-raised`, cao 52px, viên thuốc | Chỉ đường điểm tiếp theo, Xem bản đồ |
| Nhấn | Nền `--accent`, chữ và viền 2px `--ink`, cao 50–52px | Chỉ đường trên trang địa điểm và bottom sheet |
| Viền | Nền trong, viền 1.5px `--ink`, cao 44–52px | Xem chi tiết, Giờ từng ngày, chọn thành phố |
| Nét đứt | Viền 2px nét đứt `--ink` | Tạo vé để chia sẻ, mời check-in lấy tem |
| Biểu tượng | Tròn 44–52px, có `aria-label` | Quay lại, Lưu, Chia sẻ |

**Chip:**

| Chip | Kiểu | Khi nào |
| --- | --- | --- |
| Danh mục (Cà phê, Ăn uống…) | Đang chọn: nền `--ink`; chưa chọn: viền `--line` | Lọc trên trang chủ và bản đồ |
| Đang mở | Nền `--accent` | Đang trong giờ mở cửa theo giờ Việt Nam |
| Đóng lúc HH:mm / Mở lúc HH:mm | Chữ `--ink-soft`, không nền | Đi kèm chip trạng thái |
| Thông tin chưa được quán xác nhận | Chữ `--ink-soft` | `verifySource` là admin với quán (không áp cho điểm công cộng) |
| Đối tác | Viền 1.5px `--ink`, không nền | Địa điểm VIP trong lịch trình và danh sách |
| Tiện đường | Nền `--accent` | Điểm có detour dưới 10 phút |
| Theo mùa | Nền `--accent` | Lịch trình, banner theo mùa |
| Thuộc tính (Ngoài trời, Sống ảo…) | Nền `--mist` | Tags trên trang địa điểm, lịch trình |

**Thẻ:**

- **Thẻ địa điểm ngang:** ảnh 96×96 bên trái; tên, danh mục và khu vực, một câu ghi chú viết tay (nếu có), chip trạng thái.
- **Thẻ lịch trình:** rộng 250px, cuộn ngang; ảnh 120px; chip, tên, "số ngày · phương tiện · nhịp độ".
- **Banner theo mùa:** viền 2px `--ink`; chip mùa, tiêu đề Lora, mô tả, liên kết lịch trình; hình minh hoạ 96×96 bên phải có chuyển động lắc nhẹ.
- **Ô thời tiết "Đà Lạt lúc này":** nền `--ink`, chữ sáng; biểu tượng theo trạng thái, tiêu đề "trạng thái · nhiệt độ", một câu gợi ý.
- **Thẻ trạng thái mở cửa:** chip trạng thái, giờ hôm nay, dòng "Đã hỏi lại ngày…", nút "Giờ từng ngày".

**Ghi chú viết tay:** nền `--note`, bo 4px, xoay -1°, bóng `--note-edge`, font Patrick Hand; có thể có nhãn nhỏ "Người địa phương nói". Mỗi màn hình tối đa 2 ghi chú.

**Thanh hành động cố định:** đáy màn hình, nền `--paper-raised`, viền trên `--line`, đệm dưới tính cả vùng an toàn của điện thoại (`env(safe-area-inset-bottom)`).

**Bottom sheet (bản đồ):** bo 24px hai góc trên, viền trên 2px `--ink`, thanh kéo 44×5px; ba mức: thu gọn (chỉ thanh kéo và tên), nửa màn hình (thẻ đầy đủ), toàn màn hình (danh sách).

**Ghim bản đồ:** hình giọt nước vẽ tay, nền `--paper-raised`, viền `--ink`, biểu tượng theo danh mục (ly cà phê, bát, mặt trời…); ghim đang chọn to hơn 25%, nền `--accent`.

**Mốc lịch trình:** vòng tròn 36px đánh số nền `--ink`; điểm cuối nền `--accent`; nối bằng đường nét đứt 2px; dòng nghiêng nhỏ "Xe máy · khoảng x phút" giữa hai điểm.

**Ô tìm kiếm:** có nhãn "Tìm kiếm" hiển thị, cao 52px, viền 1.5px `--ink`, biểu tượng kính lúp, placeholder gợi ý cụ thể.

## 5. Màn hình

Sáu màn hình trong bản mẫu; URL theo mục 11 tài liệu thiết kế kỹ thuật. Mỗi màn hình phải có đủ trạng thái đang tải, rỗng và lỗi.

| Màn hình | URL | Thành phần chính (từ trên xuống) | Lát |
| --- | --- | --- | --- |
| Trang chủ thành phố | `/da-lat` | Header (logo, chọn thành phố) · Đà Lạt lúc này · tiêu đề "Đà Lạt hôm nay ghé đâu?" · banner theo mùa · tìm kiếm · chip danh mục · lịch trình mẫu · Chỗ dân ở đây hay ngồi · nút nổi "Xem bản đồ" | 1 |
| Bản đồ | `/da-lat/ban-do` | Bản đồ phong cách sổ tay toàn màn hình · nút quay lại + tìm quanh đây · chip lọc (Cà phê, Đang mở, Trong nhà…) · ghim · bottom sheet thẻ địa điểm | 1 |
| Lịch trình | `/da-lat/lich-trinh/{slug}`, `/l/{shareId}` | Tiêu đề, mô tả, chip · mốc theo giờ nối nét đứt · ghi chú · nhãn Đối tác, Tiện đường · thanh hành động: Tạo vé để chia sẻ + Chỉ đường điểm tiếp theo | 1 (mẫu), 2 (tạo theo yêu cầu, vé) |
| Địa điểm | `/da-lat/dia-diem/{slug}` | Ảnh + tem góc phải · tên, danh mục, khu vực · chip thuộc tính · thẻ trạng thái mở cửa · Người địa phương nói · lời mời check-in lấy tem · Tiện đường ghé thêm · bản đồ nhỏ · nguồn ảnh · thanh Chỉ đường + Lưu | 1 (tem trang trí: khi có minh hoạ) |
| Vé lịch trình | Ảnh tạo từ `/l/{shareId}` | Xem mục 9 | 2 |
| Sổ tem | `/da-lat/so-tem` (cần đăng nhập) | Tiêu đề, tiến độ "Đã có x/y tem" · lưới tem 3 cột · ghi chú | 4 |

**Trạng thái cần thiết kế:**

- **Đang tải:** khung xương (skeleton) màu `--mist` đúng kích thước thẻ; không dùng spinner toàn trang.
- **Rỗng:** câu giọng địa phương + gợi ý hành động, ví dụ "Khu này mình chưa ghi chép quán nào. Xem khu Trung tâm nhé?".
- **Lỗi mạng:** giữ nội dung đã tải, hiện dải thông báo nhỏ ở đầu trang và nút thử lại.
- **Địa điểm đã đóng:** trang vẫn hiển thị với nhãn "Đã đóng cửa", ẩn nút Chỉ đường, gợi ý 3 quán tương tự gần đó.
- **Chưa có ảnh:** ô `--mist` với chữ "Ảnh đang cập nhật".

**Desktop (từ 1024px):** nội dung tối đa 1200px; trang chủ và danh sách hiển thị 2–3 cột; trang bản đồ chia đôi (danh sách bên trái, bản đồ bên phải); trang địa điểm đặt thanh Chỉ đường thành khối cố định ở cột phải.

## 6. Bản đồ

Style MapLibre tự sửa từ style "positron" của OpenFreeMap bằng Maputnik, lưu thành file JSON trong repo và phục vụ từ domain của mình; tile vẫn lấy từ OpenFreeMap.

**Lớp bản đồ:**

| Lớp | Màu, kiểu | Ghi chú |
| --- | --- | --- |
| Nền | `--map-land` #F3EAD6 |  |
| Rừng, công viên | `--map-forest` #CBD9C5 | Quan trọng với Đà Lạt, giữ đậm hơn style gốc |
| Nước | `--map-water` #BFD4DC, viền mảnh `--ink` | Hồ Xuân Hương, Tuyền Lâm nổi bật |
| Đường chính | Lõi #FFFDF8 rộng, viền #B8A98A | Giống đường vẽ tay |
| Đường nhỏ | Lõi #FFFDF8 mảnh, ẩn ở zoom thấp |  |
| Toà nhà | Ẩn hoặc rất nhạt | Giảm rối |
| POI của OSM | Ẩn toàn bộ | Chỉ hiện ghim của mình |
| Nhãn địa danh | Noto Sans (glyph của OpenFreeMap, có tiếng Việt), màu `--ink` | Font viết tay cho nhãn bản đồ để sau, cần tự host glyph |

**Ghim:** nguồn GeoJSON + symbol layer với sprite tự vẽ (một ghim cho mỗi danh mục), gom cụm (cluster) khi nhiều điểm: vòng tròn `--paper-raised` viền `--ink`, số ở giữa. Ghim đang chọn là HTML marker riêng để chạy hiệu ứng rơi và đổi màu `--accent`.

**Khung nhìn:** khoá `maxBounds` quanh khu vực Đà Lạt và các điểm ngoại ô (Langbiang, Cầu Đất, Tuyền Lâm), `minZoom` khoảng 11, để người dùng không kéo ra được cấp độ thấy cả vùng biển. Toạ độ khung chốt khi có dữ liệu thật.

**Ghi nguồn:** "© OpenStreetMap contributors" luôn hiển thị góc dưới phải (đặt phía trên bottom sheet); có thể thêm OpenFreeMap.

**Hiệu năng:** chỉ tải MapLibre khi mở trang bản đồ hoặc khi bản đồ nhỏ trên trang địa điểm cuộn vào màn hình; bản đồ nhỏ có thể là ảnh tĩnh render sẵn để nhẹ hơn.

**Bản mẫu khác thực tế:** bản đồ trong demo là hình minh hoạ phong cách, không đúng vị trí và tỉ lệ; bản thật dùng dữ liệu OSM với style ở trên.

## 7. Theo mùa và thời tiết

Mùa quyết định màu nhấn, banner và lịch trình được đẩy lên trang chủ; thời tiết quyết định ô "Đà Lạt lúc này" và chế độ mưa. Cả hai lấy từ một endpoint `GET /v1/cities/:city/now`, cache 15 phút.

**Mùa (cấu hình trong `City.seasons`, admin chỉnh được mỗi năm):**

| Mùa | Khoảng thời gian (khởi đầu, chỉnh theo thực tế) | Màu nhấn | Lịch trình đẩy lên |
| --- | --- | --- | --- |
| Dã quỳ | Cuối tháng 10 đến đầu tháng 12 | #E9B824 | Săn dã quỳ 1 ngày |
| Mai anh đào | Cuối tháng 12 đến tháng 2 | #E58FA8 | Lịch trình mai anh đào |
| Mùa mưa | Tháng 5 đến tháng 10 | #8DB3CF | Lịch trình mùa mưa |
| Không có mùa nổi bật | Còn lại | Màu mặc định của thành phố | Lịch trình nhiều lượt xem nhất |

Khi hai mùa trùng nhau (mùa mưa và đầu mùa dã quỳ), mùa hoa được ưu tiên. Mỗi mùa có: `key`, `from`, `to` (MM-DD), `accent`, tiêu đề, mô tả, khoá hình minh hoạ, lịch trình nổi bật.

**Thời tiết:**

| Trạng thái | Điều kiện (mã thời tiết WMO) | Câu hiển thị (ví dụ) |
| --- | --- | --- |
| Sương sớm | Mã 45, 48 | Đi đồi chè, săn mây lúc này là đẹp nhất. |
| Nắng đẹp | Mã 0, 1 | Trời trong, hợp ngồi cà phê nhìn đồi. |
| Nhiều mây | Mã 2, 3 | Trời mát, đi dạo quanh hồ là vừa. |
| Mưa | Mã 51–67, 80–82, 95–99, hoặc khả năng mưa từ 60% trong 3 giờ tới | Chiều nay mưa, ghé quán trong nhà cho ấm. |

**Chế độ mưa:** hiện liên kết "Quán trong nhà gần bạn" dưới ô thời tiết; bản đồ mở với chip "Trong nhà" chọn sẵn; điểm ngoài trời trong lịch trình buổi chiều có thêm gợi ý điểm trong nhà gần đó.

**Nguồn dữ liệu:** Open-Meteo dễ dùng và không cần API key, nhưng gói miễn phí dành cho mục đích phi thương mại; web có affiliate và gói trả phí nên cần kiểm tra điều khoản và cân nhắc gói trả phí hoặc nhà cung cấp khác trước khi ra mắt. API gọi phía server, cache Redis 15 phút, nên mỗi thành phố chỉ khoảng 100 lượt gọi mỗi ngày. Lỗi hoặc hết hạn cache thì ẩn ô thời tiết, không hiện số liệu cũ.

## 8. Chuyển động

Chỉ dùng chuyển động ở vài chỗ có ý nghĩa, làm bằng CSS (`transform`, `opacity`) để nhẹ trên điện thoại; tôn trọng cài đặt giảm chuyển động của hệ điều hành.

| Hiệu ứng | Ở đâu | Thông số |
| --- | --- | --- |
| Đường nét đứt tự vẽ | Mốc lịch trình | `scaleY` 0 → 1, gốc ở trên, 600ms ease-out, mỗi đoạn trễ thêm 500ms; chạy khi đoạn cuộn vào màn hình |
| Mốc hiện ra | Vòng tròn số trên lịch trình | `scale` 0.4 → 1.1 → 1, 400ms, đi trước đường nối |
| Ghim rơi | Ghim đang chọn trên bản đồ | `translateY` -40px → 4px → 0, 700ms ease-out |
| Lắc nhẹ | Hình minh hoạ banner theo mùa | Xoay -2° ↔ 2°, 4 giây, lặp lại |
| Tem đóng dấu | Khi check-in thành công (lát 4) | `scale` 1.3 → 1 kèm xoay nhẹ, 350ms |
| Bottom sheet | Bản đồ | Kéo theo tay; thả thì trượt về mức gần nhất trong 250ms |

**Quy tắc:**

- Không quá 2 hiệu ứng chạy cùng lúc trên một màn hình.
- Không chuyển động khi tải trang lần đầu ở phần trên cùng (tránh ảnh hưởng LCP); hiệu ứng lịch trình chỉ bắt đầu khi cuộn tới (`IntersectionObserver`).
- `@media (prefers-reduced-motion: reduce)`: tắt toàn bộ hiệu ứng lặp và hiệu ứng rơi, giữ trạng thái cuối.

## 9. Vé lịch trình để chia sẻ

Mỗi lịch trình sinh được một ảnh kiểu vé tàu để khách lưu, gửi Zalo hoặc đăng story; cùng mẫu đó làm ảnh xem trước (OG) khi dán link lịch trình, nên link chia sẻ nào cũng là một lần quảng bá.

**Kích thước:** story 1080×1920 (tỉ lệ 9:16); ảnh xem trước 1200×630 (bản rút gọn: tên lịch trình, 3 điểm đầu, logo).

**Nội dung (từ trên xuống):** logo Rành Đường và tên thành phố trên nền `--ink` · thẻ vé nền `--paper-raised`: dòng nhỏ "VÉ LỊCH TRÌNH · số ngày", tên lịch trình (Lora), chip mùa và phương tiện · danh sách điểm theo giờ nối nét đứt, điểm cuối màu `--accent` (tối đa 8 điểm, nhiều hơn thì ghi "+ x điểm") · đường răng cưa có hai khuyết tròn hai bên · cuống vé: câu viết tay "Mình đi theo lịch này nè, bạn đi chung không?", đường dẫn rút gọn, mã QR trỏ tới `/l/{shareId}`.

**Cách sinh ảnh:**

- Server dựng mẫu bằng Satori (HTML/JSX sang SVG) rồi chuyển sang PNG bằng resvg, chạy trong worker; nhúng sẵn file font Lora, Be Vietnam Pro, Patrick Hand có bộ ký tự tiếng Việt.
- Endpoint `GET /v1/itineraries/:id/ticket.png?format=story|og`; ảnh lưu trên R2 theo khoá `id + updatedAt`, chỉ sinh lại khi lịch trình thay đổi.
- QR trỏ tới link có `utm_source=ticket` để đo lượt quay lại từ vé.

**Chia sẻ trên web:** nút "Tạo vé để chia sẻ" mở màn xem trước vé; trên điện thoại dùng Web Share API gửi kèm file ảnh (chọn được Zalo, Messenger, Instagram trong bảng chia sẻ của máy); trình duyệt không hỗ trợ thì hiện nút "Lưu ảnh" và "Sao chép link".

**Đo lường:** sự kiện `ticket_create`, `ticket_share` (kèm kênh nếu biết), lượt truy cập có `utm_source=ticket`.

## 10. Tem minh hoạ

Mỗi địa điểm nổi bật có một con tem vẽ tay; ở lát 1 tem chỉ là chi tiết trang trí trên trang địa điểm, sang lát 4 tem là thứ khách sưu tầm khi check-in.

**Quy cách:**

- Khung tem 4:5, viền ngoài nét đứt (gợi răng cưa), viền trong 1.5px `--ink`, nền trong là `--accent` của thành phố.
- Hình vẽ nét đơn 2px màu `--ink`, không tô bóng, không chữ trong hình; tên địa điểm in hoa bằng Lora ở dưới.
- Xuất SVG, tối đa khoảng 6 KB mỗi tem; nền tem lấy từ token nên một file dùng được cho mọi mùa.
- Trên trang địa điểm: tem rộng khoảng 92px, xoay 6°, đè nửa lên mép dưới ảnh bìa, bấm vào mở sổ tem.

**Trạng thái trong sổ tem:**

| Trạng thái | Hiển thị |
| --- | --- |
| Đã có | Tem đầy đủ màu, xoay ngẫu nhiên -3° đến 3° |
| Chưa có | Khung nét đứt mờ 55%, dấu "?" ở giữa, vẫn hiện tên địa điểm |
| Vừa nhận | Hiệu ứng đóng dấu (mục 8) |

**Nguồn hình vẽ:** bắt đầu với 10–15 tem cho các điểm trong lịch trình mẫu. Tự vẽ hoặc thuê hoạ sĩ theo đúng quy cách ở trên; nếu dùng AI để phác thảo thì phải vẽ lại thành nét vector thống nhất và không mô phỏng phong cách của hoạ sĩ cụ thể. Địa điểm chưa có tem riêng dùng tem chung theo danh mục (ly cà phê, bát, đồi, hồ…).

## 11. Khả năng truy cập và hiệu năng

Phong cách sổ tay không được đánh đổi khả năng đọc và tốc độ; mục tiêu LCP dưới 2,5 giây trên 4G và tương phản đạt WCAG AA.

**Khả năng truy cập:**

- Tương phản chữ tối thiểu 4,5:1 (chữ từ 24px trở lên: 3:1). `--ink-soft` trên `--paper` đạt yêu cầu; không dùng chữ trắng trên `--accent`.
- Trạng thái không chỉ dựa vào màu: chip "Đang mở" luôn có chữ, ghim đang chọn to hơn và có viền dày hơn.
- Dùng thẻ đúng nghĩa: `<button>`, `<a href>`, `<label>` cho ô nhập; nút chỉ có biểu tượng phải có `aria-label`.
- Vùng bấm tối thiểu 44×44px; khoảng cách giữa hai vùng bấm ít nhất 8px.
- Hình minh hoạ, tem trang trí có `alt` rỗng; tem trong sổ tem có tên địa điểm làm nhãn.
- Bản đồ luôn có danh sách thay thế (bottom sheet toàn màn hình hoặc cột trái trên desktop) để không phụ thuộc vào việc chạm vào ghim.

**Hiệu năng:**

- Font: chỉ tải bộ ký tự `vietnamese` và `latin`, `font-display: swap`; Patrick Hand tải sau cùng vì chỉ dùng cho ghi chú. Cân nhắc tự host font trên Cloudflare thay vì Google Fonts.
- Ảnh WebP 400/800/1200 px với `srcset`, `loading="lazy"` trừ ảnh bìa trang địa điểm.
- MapLibre chỉ tải khi cần (mục 6); hình minh hoạ mùa và tem là SVG nội tuyến nhỏ.
- Ô thời tiết lấy từ endpoint đã cache, không chặn hiển thị phần còn lại của trang.

## 12. Giao diện quản trị

Quản trị dùng cùng token với web khách nhưng dày thông tin hơn: chữ 13–14px, bảng, thanh bên nền `--ink`, thêm ba màu trạng thái. Admin là app riêng (Vue 3 + Vite) trên Cloudflare Pages tại admin.ranhduong.vn, dùng chung packages/ui và packages/contracts với web khách. Bốn màn hình cho lát 1 nằm trong [bản mẫu UI](https://claude.ai/artifact/M81fn6X8fzBBqpnNYviz3v), hàng dưới cùng của canvas.

| Màn hình | URL | Thiết bị | Nội dung chính | Story |
| --- | --- | --- | --- | --- |
| Danh sách địa điểm | `admin.ranhduong.vn/dia-diem` | Desktop | Tab trạng thái có số đếm (Tất cả, Nháp, Đang hiển thị, Bị nghi ngờ, Cần xác minh lại); tìm theo tên; lọc cụm, danh mục, nguồn xác nhận; bảng tên, danh mục, cụm, trạng thái, xác nhận, xác minh lần cuối, số ảnh; hành động theo trạng thái (Sửa, Hoàn thiện, Xác minh, Xem báo cáo) | S07 |
| Form địa điểm | `admin.ranhduong.vn/dia-diem/{id}` | Điện thoại trước | Thông tin cơ bản, cảnh báo nghi trùng ngay dưới ô tên; ghim vị trí bằng cách kéo bản đồ; ô dán giờ mở cửa theo mẫu Google Sheet kèm bảng từng ngày (Đóng, Mở cả ngày, thêm ca); tags, mức giá, thời gian tham quan, trong nhà hoặc ngoài trời, ghi chú thực tế; ảnh bắt buộc chọn nguồn; xác nhận (quán, Facebook, điểm công cộng); thanh dưới Lưu nháp và Kích hoạt; tự lưu nháp | S05, S06 |
| Import CSV | `admin.ranhduong.vn/import` | Desktop | 3 bước (Tải file, Kiểm tra, Tạo nháp); tóm tắt sẵn sàng, lỗi, nghi trùng; bảng lỗi kèm cách sửa; bảng nghi trùng với Bỏ qua dòng hoặc Vẫn tạo | S21 |
| Soạn lịch trình mẫu | `admin.ranhduong.vn/lich-trinh/{id}` | Desktop | Đầu trang: tên, trạng thái, số ngày, mùa, phong cách, phương tiện, nhịp độ, slug; ba cột: kho địa điểm kéo thả, lịch trình theo ngày, xem trước điện thoại và Google | S15 |

**Màu trạng thái (chỉ dùng trong quản trị):**

| Token | Chữ / nền | Dùng cho |
| --- | --- | --- |
| `status-ok` | #1F6B3F / #DCEFE2 | Đang hiển thị, Mở, ảnh có nguồn, số dòng sẵn sàng |
| `status-warn` | #6E4A00 / #FCEFB4 | Cần xác minh lại, nhắc nhở, nghi trùng |
| `status-bad` | #8E2F22 / #F6DAD5 | Bị nghi ngờ, lỗi chặn, thiếu nguồn ảnh, lỗi định dạng |
| Nháp | `--ink` / `--mist` | Địa điểm và lịch trình chưa công khai |

Chip trạng thái luôn có chữ và chấm tròn, không chỉ dựa vào màu.

**Điều kiện kích hoạt:** địa điểm chỉ kích hoạt được khi có toạ độ, giờ mở cửa hợp lệ, đã chọn nguồn xác nhận và mọi ảnh có nguồn. Lịch trình chỉ công khai được khi không còn lỗi; nhắc nhở không chặn.

**Kiểm tra khi soạn lịch trình:**

| Kiểm tra | Mức | Lát |
| --- | --- | --- |
| Giờ đến hoặc giờ đi nằm ngoài giờ mở cửa của địa điểm vào ngày đó | Lỗi | 1 |
| Địa điểm đang bị nghi ngờ, ẩn hoặc đã đóng | Lỗi | 1 |
| Địa điểm còn ở trạng thái Nháp | Nhắc | 1 |
| Địa điểm quá 90 ngày chưa xác minh hoặc chưa có ảnh hợp lệ | Nhắc | 1 |
| Thiếu bữa trưa (11:30–13:30) hoặc bữa tối (18:00–20:00) khi lịch trình đi qua khung giờ đó | Nhắc | 1 |
| Kết thúc sau 21:30 | Nhắc | 1 |
| Hai cụm không kề nhau trong một ngày | Nhắc | Sau |
| Điểm ngoài trời buổi chiều trong lịch trình mùa mưa | Nhắc | Sau |

**Tự tính giờ:** giờ điểm sau = giờ điểm trước + thời gian tham quan + thời gian di chuyển ước lượng (chim bay × 1,4 ÷ 25 km/h, làm tròn 5 phút). Giờ sửa tay được giữ nguyên và có dấu nhỏ "đã sửa tay"; các điểm sau vẫn tính lại từ đó.

**Trên điện thoại:** form địa điểm dùng đầy đủ; lịch trình chỉ sửa nhanh (giờ, ghi chú, đổi điểm), soạn từ đầu trên desktop.

## 13. Phân lát và câu hỏi mở

Toàn bộ UI trong tài liệu được làm, nhưng chia theo lát để lát 1 vẫn ra mắt đúng mùa dã quỳ; phần thêm vào lát 1 khoảng 16 giờ, đã đưa vào backlog.

| Phần UI | Lát | Story | Ước lượng |
| --- | --- | --- | --- |
| Token, component nền, giọng văn | 1 | Nằm trong S09–S16 | — |
| Bản đồ phong cách sổ tay | 1 (P0) | S22 | 6 giờ |
| Giao diện theo mùa | 1 (P0) | S23 | 3 giờ |
| Ô thời tiết và chế độ mưa | 1 (P1) | S24 | 4 giờ |
| Chuyển động | 1 (P1) | S25 | 3 giờ |
| Tem trang trí trên trang địa điểm | 1 nếu kịp có hình vẽ, nếu không thì lát 2 | — | Phụ thuộc hình vẽ |
| Vé lịch trình để chia sẻ | 2 | Backlog lát 2 | Khoảng 8 giờ |
| Sổ tem, hiệu ứng đóng dấu | 4 | Backlog lát 4 | — |

**Câu hỏi mở:**

- [ ] Nhà cung cấp thời tiết dùng cho mục đích thương mại (Open-Meteo gói trả phí hay nhà cung cấp khác)
- [ ] Ai vẽ tem: tự vẽ hay thuê hoạ sĩ; ngân sách cho 10–15 tem đầu
- [ ] Tự host font hay dùng Google Fonts
- [ ] Toạ độ khung nhìn bản đồ cho Đà Lạt
- [ ] Ngày bắt đầu và kết thúc từng mùa cho năm 2026–2027
- [x] Tên miền chính thức: đã chốt ranhduong.vn
