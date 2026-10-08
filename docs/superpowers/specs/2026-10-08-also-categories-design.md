# S27 Danh mục phụ và mức mái che: Design

8/10/2026 · thiết kế đã được chủ dự án duyệt trong phiên brainstorming cùng ngày (hai phần: danh mục phụ, mức mái che)

## Bối cảnh

**Danh mục.** Một số quán ở Đà Lạt vừa là quán cà phê vừa phục vụ đồ ăn (cơm, bún, bánh mì…). Hiện `Place.category` chỉ có một giá trị, nên:

- quán chỉ hiện ở một trang danh mục (`/da-lat/ca-phe` hoặc `/da-lat/an-uong`);
- lọc `category` của `GET /v1/cities/:city/places`, chữ trên thẻ địa điểm, biểu tượng ghim, tem và loại JSON-LD đều dựa vào giá trị duy nhất đó;
- lịch trình (technical-design mục 7, bước 9) chỉ chèn bữa ăn vào quán `food`.

**Trong nhà, ngoài trời.** `Place.indoor` là đúng/sai, form S05 cho ba lựa chọn Chưa rõ, Trong nhà, Ngoài trời. Nhiều quán ngoài trời có vài khu mái che, nhiều quán trong nhà có thêm khu ngoài trời. Trường này dùng cho phương án khi trời mưa (data-collection mục 4): chế độ mưa (S24), chip lọc trên bản đồ (S12), lịch trình chiều mùa mưa (technical-design mục 7), chip thuộc tính trên trang địa điểm (S11).

## Mục tiêu

Chủ dự án chọn:

- quán vừa cà phê vừa ăn uống **hiện ở cả trang Cà phê lẫn trang Ăn uống**, và **được chọn làm bữa trưa, bữa tối trong lịch trình**;
- mục "Trong nhà hay ngoài trời" thành **mức mái che** ba mức, vì câu khách cần trả lời là "trời mưa có ngồi được không" và "có chỗ ngồi ngoài trời không".

Không đổi: URL công khai (ADR 0010), biểu tượng ghim, tem. Chưa có dữ liệu thật trong DB (S05 chưa merge) nên không cần migrate.

## Quyết định

**Danh mục chính + danh mục phụ.** Giữ `category` làm danh mục chính, thêm `alsoCategories`. Đã cân nhắc và bỏ:

- chỉ dùng thẻ (`co-do-an`): không đổi schema nhưng quán không hiện ở trang Ăn uống, lịch trình không chèn bữa vào đó;
- nhiều danh mục ngang nhau (`categories: []`): ghim, tem, JSON-LD, chữ trên thẻ vẫn cần một danh mục chính nên cuối cùng thành cách trên mà phải sửa nhiều hơn.

**Mức mái che thay cho `indoor`.** Một trường `cover: 'full' | 'partial' | 'none'`, để trống là chưa rõ. Đã cân nhắc và bỏ:

- hai cờ "có chỗ che mưa", "có chỗ ngoài trời": diễn tả được như nhau nhưng thành hai câu hỏi trên form và có tổ hợp vô nghĩa;
- giữ `indoor` và thêm thẻ (`co-mai-che`, `co-khu-ngoai-troi`): dữ liệu dễ mâu thuẫn, chế độ mưa phải đọc thêm thẻ.

## Thiết kế

### 1. Dữ liệu và luật chung (`packages/contracts`)

**Danh mục phụ**

- `Place.alsoCategories: PlaceCategory[]`, mặc định `[]`; schema Mongoose thêm trường cùng tên (enum `PlaceCategory`, mặc định `[]`).
- Luật hợp lệ (Zod, dùng chung cho `Place` và `PlaceEditInput`): tối đa 2 giá trị, không trùng nhau, không chứa danh mục chính. Vi phạm thì lỗi ở đường dẫn `alsoCategories`, câu tiếng Việt.
- `PlaceEditInput.alsoCategories` (mặc định `[]`), `AdminPlace.alsoCategories`.
- Hàm `servesCategory(place: { category; alsoCategories? }, c: PlaceCategory): boolean`: đúng khi `c` là danh mục chính hoặc nằm trong danh mục phụ. Mọi nơi hỏi "quán này có phục vụ X không" dùng hàm này.
- Danh mục chính vẫn quyết định: biểu tượng ghim, tem chung theo danh mục, loại JSON-LD đứng đầu.

**Mức mái che**

- Enum `PlaceCover = 'full' | 'partial' | 'none'`:
  - `full`: trong nhà hoặc có mái che hết, mưa vẫn ngồi được;
  - `partial`: có cả chỗ che mưa và chỗ ngoài trời;
  - `none`: ngoài trời, không chỗ che mưa (đồi chè, thác…).
- `Place.cover`, `PlaceEditInput.cover`, `AdminPlace.cover` tuỳ chọn (không có là chưa rõ); bỏ hẳn `indoor` ở contracts, schema Mongoose, `place-edit.ts`, form.
- Hàm `rainSafe(place)` đúng khi `cover` là `full` hoặc `partial`; `hasOpenAir(place)` đúng khi `cover` là `partial` hoặc `none`; chưa rõ thì cả hai sai.
- `COVER_LABEL` (chip thuộc tính trên trang địa điểm): `full` "Trong nhà", `partial` "Trong nhà và ngoài trời", `none` "Ngoài trời".

### 2. API, web khách, lịch trình

- `GET /v1/cities/:city/places?category=…`: địa điểm khớp khi danh mục chính **hoặc** một danh mục phụ nằm trong danh sách lọc. Repository lọc bằng `$or: [{ category: { $in } }, { alsoCategories: { $in } }]`. Thứ tự "nổi bật" giữ nguyên. Không thêm index mới: mỗi thành phố vài trăm điểm.
- `PlaceCard` thêm `alsoCategories`. Dòng meta trên thẻ ghi nhãn danh mục chính rồi danh mục phụ, cách nhau dấu phẩy: "Cà phê, Ăn uống · Trung tâm".
- Tìm không dấu (`matchScore`) so thêm nhãn danh mục phụ, để gõ "an uong" ra cả quán cà phê có đồ ăn.
- Trang chủ (danh sách nổi bật lọc `cafe,food`) không đổi; một quán chỉ hiện một lần.
- Ghi vào tài liệu để các story sau làm theo:
  - S17 JSON-LD: `@type` là mảng theo thứ tự danh mục chính rồi phụ (ví dụ `["CafeOrCoffeeShop", "Restaurant"]`).
  - S12 bản đồ: ghim dùng biểu tượng danh mục chính; chip lọc danh mục dùng `servesCategory`; chip **"Trú mưa được"** (thay chữ "Trong nhà") lọc `rainSafe`.
  - S24 chế độ mưa: liên kết **"Quán trú mưa được gần bạn"** và chip "Trú mưa được" chọn sẵn, đều theo `rainSafe`.
  - S11 trang địa điểm: chip mái che theo `COVER_LABEL`.
  - Lịch trình: "chỗ ăn" là `servesCategory(p, 'food')` (kiểm "thiếu bữa" ở S15, chèn bữa ở lát 2); chiều mùa mưa ưu tiên `cover` `full` rồi `partial`; lời nhắc "điểm ngoài trời buổi chiều mùa mưa" áp cho `none`.

### 3. Nhập liệu

- Form admin (`/dia-diem/:id`):
  - dưới "Danh mục" thêm nhóm "Cũng phục vụ" gồm các danh mục công khai trừ danh mục chính, chọn tối đa 2 (ô thứ ba bị khoá kèm lời nhắc). Đổi danh mục chính thì danh mục đó tự bỏ khỏi danh mục phụ;
  - mục "Trong nhà hay ngoài trời" đổi thành "Mái che" với bốn lựa chọn: Chưa rõ · Trong nhà hoặc có mái che hết · Có cả chỗ che mưa và chỗ ngoài trời · Ngoài trời, không chỗ che mưa; gợi ý dưới mục: khu che mưa nhỏ thì ghi vào ghi chú thực tế (ví dụ "mưa thì ít chỗ, đến sớm").
- Google Sheet: thêm cột `also_category` (nhiều giá trị cách nhau `;`, cùng danh sách với `category`); cột `indoor` (yes, no) đổi thành `cover` với dropdown `full`, `partial`, `none`. Cập nhật data-collection mục 4 (định nghĩa từng mức mái che, quy ước hai cơ sở) và mục 5 (cột). Import CSV (S21) đọc hai cột này; gặp cột `indoor` cũ thì `yes` thành `full`, `no` thành `none`.
- Danh sách admin (S07): lọc theo danh mục tính cả danh mục phụ.
- Quy ước nhập (data-collection mục 4): cùng một quán phục vụ cả hai thì một địa điểm có danh mục phụ; hai cơ sở riêng (giờ mở khác, menu khác, khác chủ, ví dụ cà phê tầng 1 và nhà hàng tầng 2) thì hai địa điểm.

### 4. Kiểm thử

- Contracts: luật danh mục phụ (tối đa 2, không trùng, không chứa danh mục chính), `servesCategory`, `PlaceCover`, `rainSafe`, `hasOpenAir`, `PlaceEditInput`/`AdminPlace` có trường mới và không còn `indoor`.
- API: trang Ăn uống (`category=food`) trả quán cà phê có danh mục phụ `food`; quán chỉ có cà phê thì không; `PlaceCard.alsoCategories` đúng; tìm "an uong" ra quán có danh mục phụ ăn uống; tạo, sửa địa điểm lưu và xoá được `alsoCategories`, `cover` (`$unset` khi chưa rõ).
- Web: dòng meta của thẻ (hàm thuần, Vitest).
- Admin: model form (đọc, gửi `alsoCategories` và `cover`; đổi danh mục chính thì bỏ khỏi danh mục phụ; giới hạn 2; "Chưa rõ" thì không gửi `cover`).

## Triển khai

- Story mới **S27 "Danh mục phụ và mức mái che"** trong backlog, khoảng 4 giờ, P0 (nên xong trước khi nhập dữ liệu từ Sheet cuối tuần 2).
- Nhánh `feat/S27-also-categories` tạo từ `feat/S05-place-form` (form và contracts của S05 chưa merge).
- Ghi vào `docs/decisions.md` (danh mục phụ; mức mái che thay `indoor`; chữ "Trú mưa được"); cập nhật technical-design mục 3 (interface Place), 6 (mô tả lọc `category`), 7 (chỗ ăn, chiều mùa mưa), 11 (JSON-LD); ui-spec mục 4 (thẻ, chip thuộc tính), 5 (chip bản đồ), 7 (chế độ mưa), 12 (form, kiểm lịch trình); product-spec mục 4 (`weather_sensitivity` thành mức mái che); backlog S24 (chữ chip, liên kết).

## Ngoài phạm vi

- Ưu tiên quán có danh mục chính trên trang danh mục.
- Danh mục phụ cho `stay`, `shop` (không có trang công khai ở lát 1); form chỉ đưa danh mục công khai vào "Cũng phục vụ".
- Đo sức chứa khu che mưa; ghi bằng ghi chú thực tế nếu cần.
