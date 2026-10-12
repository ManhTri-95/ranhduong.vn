# S22: bản đồ phong cách sổ tay

Code triển khai trên nhánh `feat/S22-notebook-map`. Style Positron của OpenFreeMap được chỉnh màu/lớp theo Spec UI §6, mở và xuất qua Maputnik 3.1.0; tile và glyph vẫn lấy trực tiếp từ OpenFreeMap.

## Tài sản và cấu hình

- Style: `apps/web/public/maps/notebook/style.json`, URL mặc định `/maps/notebook/style.json`.
- Sprite: `sprite.json` + `sprite.png` và `sprite@2x.json` + `sprite@2x.png`, namespace `rd-pins`, đủ sáu danh mục chính: attraction, cafe, food, activity, stay, shop.
- Hình gốc vector: `apps/web/app/entities/place/lib/map-pin.ts`. Cùng một SVG dùng để xuất sprite và hiển thị ghim được chọn; không có nội dung địa điểm trong chuỗi SVG.
- Xuất lại sprite sau khi sửa hình hoặc token: `node apps/web/scripts/generate-map-sprites.mjs` từ gốc repo. Dùng sharp đã có trong API, không thêm dependency. PNG 1x là 240×48, 2x là 480×96; mỗi ghim có khoảng đệm trong suốt để không lẫn cạnh atlas.
- `NUXT_PUBLIC_MAP_STYLE_URL` vẫn nhận URL style khác. `resolveMapStyleSprites` trong shared chuyển đường dẫn sprite thành URL tuyệt đối theo URL style và domain đang chạy, áp dụng cho cả bản đồ địa điểm và lịch trình. Style thay thế chưa có namespace `rd-pins` được thêm sprite của web khi bản đồ địa điểm tải xong.
- Nền, rừng/công viên, nước, lõi/viền đường và nhãn theo token. Đường nhỏ chỉ hiện từ zoom 13, lối đi từ 14. Toà nhà ẩn; không có lớp POI hoặc nhãn sân bay của OSM. Nhãn ưu tiên `name:vi`, sau đó tên bản địa; giữ Noto Sans và glyph tiếng Việt.

## Sửa bằng Maputnik

1. Chạy web local, mở [Maputnik](https://maplibre.org/maputnik/).
2. Tạo bản tạm của style, đổi URL sprite thành URL đầy đủ của web đang chạy, ví dụ `http://localhost:3100/maps/notebook/sprite`. Import bằng **Open → Open local Style**. Maputnik ở domain khác cần URL đầy đủ/CORS cho sprite; có thể xem nền khi bỏ sprite khỏi bản tạm.
3. Chỉnh layer trong editor, kiểm tại zoom 11–16 quanh Đà Lạt, Hồ Xuân Hương, Tuyền Lâm và vùng rừng. Giữ source/glyph OpenFreeMap, Noto Sans và không thêm POI.
4. **Save** xuất JSON. Đưa lại vào repo, đổi URL sprite về `/maps/notebook/sprite`, giữ metadata nguồn và giấy phép. Không lưu domain local, ID editor ngẫu nhiên hoặc token truy cập vào bản production.
5. Kiểm typecheck/build và mở cả hai bản đồ. Bản export S22 có metadata `maputnik:renderer` và `rd:editor`.

## Ghim và xử lý lỗi

- Địa điểm thường: symbol layer, ghim giọt nước 36×44, nền giấy và nét mực, biểu tượng theo danh mục chính. Gom cụm giữ vòng tròn giấy/viền mực và số ở giữa.
- Đang chọn: một HTML marker 45×55, màu `--accent` hiện tại, vùng bấm ít nhất 44px và nhãn truy cập có tên địa điểm. Ẩn symbol trùng; vẫn giữ điểm trong GeoJSON để số cụm không đổi.
- Phần tử con chạy `translateY(-40px) → 4px → 0`, 700ms ease-out. Transform định vị của MapLibre trên phần tử cha giữ nguyên. Cập nhật viewport không tạo lại marker; giảm chuyển động tắt animation và chuyển camera tức thì.
- Chọn trước lúc map tải xong được đồng bộ trong load handler. Đổi danh mục, retry và unmount dọn marker cũ.
- Lỗi sprite/style/tile giữ danh sách, thông báo và nút thử lại. Không xoá lỗi chỉ vì MapLibre phát `load`: sự kiện này vẫn có thể xảy ra sau khi sprite thất bại. Retry khởi tạo lại map và sprite.
- Bản đồ lịch trình dùng cùng nền mặc định, giữ ghim HTML đánh số của S16.

## Kiểm đã chạy

Node 24.20.0, pnpm 12.9.1:

```bash
pnpm turbo run lint typecheck test build
pnpm --filter @ranhduong/web test:ssr
node apps/web/scripts/generate-map-sprites.mjs
```

20 task workspace xanh, web 19 file/82 test xanh, 64 test SSR xanh. Bốn test mới kiểm sprite theo origin local/staging, URL style remote, string/array sprites và style không có sprite. Ba ca đã thấy đỏ trước khi sửa rồi xanh. Schema style MapLibre hợp lệ; atlas bounds/pixelRatio đúng và xuất lại cho byte giống nhau.

Review độc lập tìm hai lỗi runtime; cả hai đã sửa và tái hiện đỏ/xanh trên Chrome: URL sprite tương đối và thông báo lỗi bị load handler xoá. Bản build cuối không có lỗi console/hydration trong luồng tải thành công. Lỗi mạng cố ý được giới hạn vào lượt kiểm retry.

| Tiêu chí | Bằng chứng local |
| --- | --- |
| Style trong repo, chỉnh từ Positron bằng Maputnik | File export và [ảnh editor](assets/s22-maputnik.png); tile/glyph thật quanh Đà Lạt |
| Màu/lớp theo Spec, POI ẩn | Schema hợp lệ; không có POI/aerodrome label; building hidden; [mobile](assets/s22-map-mobile.png) và [desktop](assets/s22-map-desktop.png) |
| Sáu danh mục và retina | Chrome kiểm đủ sáu image ID, sáu danh mục rendered và request `sprite@2x.png` khi deviceScaleFactor 2 |
| Gom cụm | Sáu điểm Giả Lập thành cụm, bấm thật phóng to; chọn một điểm vẫn đếm sáu |
| Ghim chọn/rơi | Bấm sprite thật mở đúng thẻ, HTML marker 45×55, màu nhấn, animation 0.7s; không trùng symbol hoặc tạo lại sau refresh; [ảnh ghim chọn](assets/s22-map-selected.png) |
| Giảm chuyển động | Emulation `prefers-reduced-motion: reduce`: animationName none |
| Lifecycle, lỗi | Đổi danh mục/unmount bỏ marker; chặn riêng sprite JSON/PNG giữ retry sau load rồi phục hồi; chặn style, chọn từ danh sách trước load, retry hiện đúng một marker |
| URL override | Kiểm lại toàn luồng với Positron remote, namespace riêng vẫn dùng được; itinerary override giữ ghim số |
| Lazy/loading/nguồn | Trang chủ không tải JS/worker/style/sprite bản đồ; itinerary chỉ tải sau bấm mở; attribution luôn thấy, không tràn ngang ở 390px/desktop |

Ảnh chỉ dùng địa điểm mang tên **Giả Lập**, không ghi fixture vào database.

## Nguồn và giấy phép

Style gốc từ [OpenFreeMap styles](https://github.com/hyperknot/openfreemap-styles), fork [OpenMapTiles Positron](https://github.com/openmaptiles/positron-gl-style), thiết kế gốc CartoDB Basemaps bởi Stamen và Paul Norman. Giữ `LICENSE.md` (upstream OpenFreeMap) và `LICENSE-positron.md` (BSD 3-Clause, CC BY 4.0) cạnh JSON. Trang `/ghi-nguon#ban-do` ghi tác giả, giấy phép và thay đổi; link cạnh cả hai bản đồ. Ghim danh mục vẽ riêng cho Rành Đường.

## Nghiệm thu còn lại

- [ ] Commit/PR, CI remote, merge và deploy staging sau S02.
- [ ] Staging: `/maps/notebook/*` trả đúng JSON/PNG, CSP cho tile/glyph/worker, URL local/staging và cache sau cập nhật.
- [ ] Điện thoại thật Android/iPhone: chạm/pinch, lọc/chọn/cụm, giảm chuyển động của hệ điều hành, xoay máy, Back và thử mạng yếu.
- [ ] Theo dõi Sentry 24 giờ. Chỉ đổi story sang Xong khi đủ definition of done.
