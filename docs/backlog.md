# Backlog lát 1: Cẩm nang số Đà Lạt

6/10/2026 · @Manh Tri

Lát 1 ra mắt bản đồ, trang địa điểm, danh sách curate và 5 lịch trình mẫu tĩnh trước 15/11/2026, để đón mùa dã quỳ và cao điểm cuối năm.

## 1. Mục tiêu và tiêu chí hoàn thành

Lát 1 thành công khi khách tìm thấy web qua Google hoặc group Facebook, xem địa điểm, và bấm chỉ đường để đi thật. Chỉ số chính là **lượt bấm chỉ đường mỗi tuần**.

Lát 1 được coi là xong khi:

- [ ] 80–100 địa điểm `active`; quán đã xác nhận hoặc gắn nhãn chưa xác nhận; ảnh hợp lệ hoặc hiển thị "Ảnh đang cập nhật"
- [ ] 5 lịch trình mẫu công khai, trong đó có một lịch trình mùa dã quỳ
- [ ] 3–5 danh sách curate công khai
- [ ] Trang địa điểm, danh mục, lịch trình được Google index (kiểm tra trong Search Console)
- [ ] Đo được `place_view`, `direction_click`, `call_click` theo từng địa điểm
- [ ] Web chạy tốt trên điện thoại, LCP dưới 2,5 giây trên 4G
- [ ] Có trang điều khoản, quyền riêng tư và ghi nguồn OSM, ảnh

## 2. Phạm vi và giả định

Lát 1 chỉ gồm phần đọc cho khách và công cụ nhập liệu cho bạn và cộng tác viên; khách chưa cần đăng nhập, chưa có tạo lịch trình theo yêu cầu, chưa có điểm.

| Trong lát 1 | Để lát sau |
| --- | --- |
| Bản đồ, trang chủ thành phố, danh mục, khu vực, trang địa điểm | Tạo lịch trình theo yêu cầu, đổi điểm, tối ưu lại, vé chia sẻ lịch trình (lát 2) |
| Tìm kiếm không dấu | Đăng nhập cho khách, đóng góp, hàng chờ duyệt (lát 3) |
| Danh sách curate, 5 lịch trình mẫu tĩnh | Check-in, điểm, quà, voucher, sổ tem (lát 4) |
| Công cụ nhập liệu cho admin | Trang chủ quán, nhận quản lý địa điểm |
| SEO, đo lường, giám sát, backup | LLM, OSRM, ma trận khoảng cách |

**Quyết định đơn giản hoá cho lát 1:**

- Trang quản trị là app riêng ngay từ đầu (`apps/admin`, Vue 3 + Vite SPA) deploy lên Cloudflare Pages tại `admin.ranhduong.vn`, có Cloudflare Access chặn trước; tốn thêm khoảng 5 giờ (story S26) để đổi lấy ranh giới rõ ràng và không phải tách về sau.
- Đăng nhập chỉ dành cho admin: Google OAuth với danh sách email được phép, chưa phân vai trò. Dữ liệu do bạn tự thu thập từ Facebook và nhắn quán xác nhận, chưa dùng cộng tác viên.
- Lịch trình mẫu nhập tay trong admin, giờ và mô tả do bạn viết; bản đồ lịch trình nối các điểm theo thứ tự, chưa vẽ tuyến đường thật.
- Chưa cần BullMQ: rollup số liệu và backup chạy bằng cron trong container API.

**Giả định về thời gian:** khoảng 20 giờ code mỗi tuần trong 5 tuần (khoảng 100 giờ), có dùng AI hỗ trợ code. Sau khi thêm phần UI theo Spec UI, P0 khoảng 126 giờ (đã gồm app admin riêng), tức khoảng 25 giờ/tuần; nếu không đủ, bỏ các story P1 ở mục 4, dời S22 sang ngay sau ra mắt, hoặc lùi ngày ra mắt.

## 3. Lộ trình 5 tuần

Tuần 1–2 dành cho nền tảng và công cụ nhập liệu, tuần 3–5 cho web khách, SEO và đo lường; dữ liệu và nội dung chạy song song từ tuần 1.

*Công cụ nhập liệu xong tuần 2, ra mắt giữa tháng 11.*

| Tuần | Code | Dữ liệu | Nội dung |
| --- | --- | --- | --- |
| Tuần 1 (6–12/10) | S01 Monorepo, CI<br>S02 Hạ tầng, staging<br>S03–S04, S26 Schema, admin app | Ghi thông tin 40 điểm đợt 1<br>Nhắn quán đợt 1 | Bài khảo sát 2–3 group |
| Tuần 2 (13–19/10) | S05 Form nhập địa điểm<br>S06 Upload ảnh<br>S07, S21 Xác minh, import CSV | Ghi thông tin 30 điểm đợt 2<br>Nhắc đợt 1, nhập vào admin | Chọn 5 lịch trình mẫu<br>Chọn 3–5 danh sách curate |
| Tuần 3 (20–26/10) | S09 Trang chủ<br>S10 Danh mục, khu vực<br>S11 Trang địa điểm | 40 điểm active<br>Nhắn quán đợt 2 | Viết lịch trình dã quỳ |
| Tuần 4 (27/10–2/11) | S12, S22 Bản đồ + style sổ tay<br>S14, S23 Curate, theo mùa<br>S15 Admin lịch trình mẫu | 80 điểm active | Nhập 5 lịch trình mẫu<br>Bài tổng hợp từ group |
| Tuần 5 (3–9/11) | S16 Trang lịch trình<br>S17–S18 SEO, tracking<br>S19–S20, S24–S25 (P1) | 90 điểm active, rà soát | Chuẩn bị bài ra mắt<br>Xin admin group ghim bài |

**Ra mắt (10–15/11):** Ra mắt lát 1: 90 điểm, 5 lịch trình mẫu, 3–5 danh sách.

Story P1 (S13 tìm kiếm không dấu) chèn vào tuần nào còn dư giờ. S08 (import OSM) làm trong tuần 1–2 để có sẵn tên và toạ độ, đỡ nhập tay.

## 4. Backlog

26 story, tổng khoảng 137 giờ; phần P0 khoảng 126 giờ. Làm theo thứ tự ID, vì công cụ nhập liệu phải xong sớm để chuyển dữ liệu từ Google Sheet vào admin từ cuối tuần 2.

| ID | Epic | Story | Tiêu chí nghiệm thu | Giờ | Ưu tiên | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Nền tảng | Khởi tạo monorepo (Nuxt web, NestJS API, packages contracts, geo, config) | Lint, typecheck, test chạy trên GitHub Actions; một lệnh chạy cả web và API ở local | 5 | P0 | Chưa làm |
| S02 | Nền tảng | Hạ tầng production và staging | VPS + Docker Compose, Cloudflare DNS/CDN, Atlas M0 cho prod và staging, bucket R2, HTTPS; merge vào main tự deploy staging | 6 | P0 | Chưa làm |
| S03 | Nền tảng | Schema City, Zone, Place và seed Đà Lạt | 4 zone có polygon; index 2dsphere và {cityId, slug} unique; chạy seed lại không tạo trùng | 4 | P0 | Chưa làm |
| S04 | Nhập liệu | Đăng nhập admin bằng Google | Chỉ email trong danh sách được dùng admin.ranhduong.vn; email khác bị từ chối ở cả Cloudflare Access và API | 4 | P0 | Chưa làm |
| S05 | Nhập liệu | Form tạo và sửa địa điểm trên điện thoại | Ghim vị trí trên bản đồ; giờ mở cửa theo từng ngày; zone, tags, mức giá, trong nhà/ngoài trời, ghi chú thực tế; lưu nháp; dùng tốt ở màn hình 375px; ô dán giờ theo mẫu Google Sheet; cảnh báo nghi trùng dưới ô tên; chọn nguồn xác nhận; chỉ kích hoạt khi đủ toạ độ, giờ hợp lệ, nguồn xác nhận và mọi ảnh có nguồn (Spec UI mục 12) | 12 | P0 | Chưa làm |
| S06 | Nhập liệu | Upload ảnh | Presigned URL R2; chỉ JPEG, PNG, WebP dưới 8MB; sinh WebP 400/800/1200; xoá EXIF vị trí; bắt buộc chọn nguồn ảnh | 6 | P0 | Chưa làm |
| S07 | Nhập liệu | Danh sách và xác minh trong admin | Lọc theo trạng thái, zone, danh mục; nút "Đã xác minh" cập nhật lastVerifiedAt và verifySource; chuyển draft sang active; chọn quán đã xác nhận (owner) hay chỉ dựa trên Facebook (admin); tab trạng thái có số đếm; hành động theo trạng thái (Hoàn thiện, Xác minh, Xem báo cáo) | 4 | P0 | Chưa làm |
| S08 | Nhập liệu | Import OSM làm nháp | Script Overpass lấy quán cà phê, quán ăn, điểm tham quan trong Đà Lạt; tạo draft có osmId; chạy lại không trùng | 4 | P0 | Chưa làm |
| S09 | Web khách | Trang chủ Đà Lạt | Danh mục, danh sách nổi bật, lịch trình mẫu, ô tìm kiếm; render SSR | 6 | P0 | Chưa làm |
| S10 | Web khách | Trang danh mục và khu vực | Lọc theo tags; phân trang cursor; URL đúng mục 11 tài liệu kỹ thuật | 6 | P0 | Chưa làm |
| S11 | Web khách | Trang chi tiết địa điểm | Ảnh, giờ mở cửa kèm trạng thái đang mở/đóng theo giờ Việt Nam, ghi chú thực tế; nút chỉ đường (URL Google Maps), gọi, fanpage; cảnh báo khi quá 90 ngày chưa xác minh; 6 địa điểm gần đó; nhãn "Thông tin chưa được quán xác nhận" khi quán chưa xác nhận; "Ảnh đang cập nhật" khi chưa có ảnh | 8 | P0 | Chưa làm |
| S12 | Web khách | Bản đồ MapLibre | Tải theo vùng đang xem, lọc danh mục, gom cụm khi nhiều điểm, bấm marker mở thẻ địa điểm; ghi nguồn OSM; chỉ tải khi mở bản đồ; dùng tile OpenFreeMap với URL style trong cấu hình; khoá maxBounds và minZoom quanh Đà Lạt | 8 | P0 | Chưa làm |
| S13 | Web khách | Tìm kiếm không dấu | Gõ "ca phe may" ra "Cà phê Mây"; gợi ý khi đang gõ | 4 | P1 | Chưa làm |
| S14 | Web khách | Danh sách curate | Admin tạo danh sách (tiêu đề, mô tả, thứ tự địa điểm); trang công khai /da-lat/top/{slug} | 5 | P0 | Chưa làm |
| S15 | Lịch trình | Admin tạo lịch trình mẫu | Chọn địa điểm theo từng ngày, giờ, ghi chú, mô tả; xem trước điện thoại và Google trước khi công khai; kéo thả từ kho địa điểm; tự tính giờ; kiểm tra lỗi và nhắc nhở theo Spec UI mục 12, còn lỗi thì không công khai được | 6 | P0 | Chưa làm |
| S16 | Lịch trình | Trang lịch trình mẫu | Timeline theo ngày; bản đồ đánh số các điểm; nút chỉ đường từng điểm; chia sẻ qua Zalo, Messenger, copy link | 8 | P0 | Chưa làm |
| S17 | SEO | SEO kỹ thuật | Meta, OG, canonical; JSON-LD địa điểm, TouristTrip, ItemList, BreadcrumbList; sitemap index; robots chặn /admin; cache SWR; xác minh Search Console | 6 | P0 | Chưa làm |
| S18 | Đo lường | Tracking và báo cáo | POST /events, bộ đếm Redis, cron gộp vào place\_metrics; Umami hoặc PostHog cho traffic; màn hình admin hiển thị lượt bấm chỉ đường theo tuần | 6 | P0 | Chưa làm |
| S19 | Vận hành | Giám sát và backup | Sentry cho web và API; uptime check; mongodump hằng đêm lên R2 giữ 14 bản; thử khôi phục một lần | 3 | P0 | Chưa làm |
| S20 | Pháp lý | Trang điều khoản, quyền riêng tư, ghi nguồn | Trang tĩnh có link ở footer; ghi nguồn OSM trên bản đồ và nguồn ảnh trên trang địa điểm | 2 | P0 | Chưa làm |
| S21 | Nhập liệu | Import CSV từ Google Sheet | Đọc CSV theo cột và định dạng giờ mở cửa trong tài liệu quy trình (mục 5); chỉ lấy dòng có status hợp lệ và imported khác yes; validate bằng Zod; tạo Place nháp với verifySource owner hoặc admin; không tạo trùng khi chạy lại (theo id Sheet, osmId, số điện thoại); màn hình 3 bước với bảng lỗi kèm cách sửa và bảng nghi trùng (Bỏ qua dòng, Vẫn tạo) | 3 | P0 | Chưa làm |
| S22 | UI | Style bản đồ phong cách sổ tay | Style JSON sửa từ positron bằng Maputnik theo mục 6 Spec UI; ẩn POI của OSM; sprite ghim theo danh mục; gom cụm; ghim đang chọn có hiệu ứng rơi; style lưu trong repo | 6 | P0 | Chưa làm |
| S23 | UI | Giao diện theo mùa | City.seasons lưu trong DB, admin sửa được; endpoint /now trả mùa hiện tại; token --accent đổi theo mùa; banner mùa trên trang chủ đẩy lịch trình nổi bật (mục 7 Spec UI) | 3 | P0 | Chưa làm |
| S24 | UI | Ô thời tiết và chế độ mưa | Gọi API thời tiết phía server, cache Redis 15 phút; ánh xạ mã WMO sang 4 trạng thái; chế độ mưa hiện liên kết quán trong nhà và chọn sẵn chip Trong nhà trên bản đồ; lỗi thì ẩn ô | 4 | P1 | Chưa làm |
| S25 | UI | Chuyển động | Nét đứt tự vẽ và mốc hiện ra khi cuộn tới; ghim rơi; minh hoạ mùa lắc nhẹ; tắt hết khi người dùng bật giảm chuyển động (mục 8 Spec UI) | 3 | P1 | Chưa làm |
| S26 | Nền tảng | Dựng app admin riêng | apps/admin (Vue 3 + Vite, FSD) build tĩnh lên Cloudflare Pages tại admin.ranhduong.vn; Cloudflare Access chỉ cho email được phép; API bật CORS có credentials cho ranhduong.vn và admin.ranhduong.vn, kiểm Origin cùng danh sách; layout thanh bên theo Spec UI mục 12 | 5 | P0 | Chưa làm |

## 5. Dữ liệu và nội dung

Bạn tự thu thập thông tin từ Facebook và nhắn quán xác nhận, mỗi ngày khoảng 1 giờ (5–6 giờ mỗi tuần, cộng thêm vào thời gian code). Chi tiết cách làm, mẫu tin nhắn và trạng thái: [Quy trình thu thập và xác nhận dữ liệu](data-collection.md).

**Tuần 1 (6–12/10):**

- [ ] Đăng bài khảo sát trong 2–3 group du lịch Đà Lạt (chỉ hỏi, không link)
- [ ] Ghi đủ thông tin 40 điểm đợt 1 (điểm dừng của 5 lịch trình mẫu + điểm tham quan công cộng) vào Google Sheet
- [ ] Nhắn lần 1 các quán đợt 1

**Tuần 2 (13–19/10):**

- [ ] Ghi đủ thông tin 30 điểm đợt 2
- [ ] Nhắc lại các quán đợt 1 chưa trả lời
- [ ] Chọn chủ đề 5 lịch trình mẫu và 3–5 danh sách curate
- [ ] Cuối tuần: nhập đợt 1 từ Google Sheet vào admin

**Tuần 3 (20–26/10):**

- [ ] 40 điểm active
- [ ] Ghi thêm 20 điểm đợt 2, nhắn lần 1 các quán đợt 2
- [ ] Viết lịch trình mẫu đầu tiên: mùa dã quỳ

**Tuần 4 (27/10–2/11):**

- [ ] 80 điểm active
- [ ] Nhắc lại các quán đợt 2
- [ ] Nhập 5 lịch trình mẫu và các danh sách curate vào admin
- [ ] Đăng bài tổng hợp gợi ý từ thành viên group

**Tuần 5 (3–9/11):**

- [ ] 90 điểm active, rà lại dữ liệu, ảnh, nguồn ảnh
- [ ] Gửi link trang cho các quán đã xác nhận
- [ ] Chuẩn bị bài ra mắt; liên hệ admin 1–2 group lớn để xin ghim bài

## 6. Definition of done, rủi ro và câu hỏi mở

Một story chỉ chuyển sang "Xong" khi đạt đủ các điều kiện dưới đây; rủi ro lớn nhất của lát 1 là dữ liệu, không phải code.

**Definition of done cho mỗi story:**

- Đạt toàn bộ tiêu chí nghiệm thu trong bảng mục 4
- Merge vào `main`, CI xanh, đã deploy và thử trên staging
- Đã thử trên điện thoại thật (Android và iPhone nếu có)
- Logic có điều kiện (giờ mở cửa, slug, chống trùng ID OSM) có unit test
- Không có lỗi mới trong Sentry sau 24 giờ trên staging

**Rủi ro:**

| Rủi ro | Dấu hiệu sớm | Cách xử lý |
| --- | --- | --- |
| Quán ít trả lời tin nhắn | Dưới 30% quán đợt 1 trả lời sau 7 ngày | Đăng chưa xác nhận kèm nhãn; gọi điện cho các quán nằm trong lịch trình mẫu |
| Thiếu giờ code | Hết tuần 2 chưa xong S07 | Bỏ S13; dời phần dashboard của S18 sang sau ra mắt |
| Ảnh hợp lệ không đủ | Dưới 50% quán có ảnh hợp lệ vào tuần 4 | Ưu tiên ảnh quán gửi; cho phép 1 ảnh cho điểm ít quan trọng |
| Google index chậm | Tuần 5 chưa có trang nào được index | Gửi sitemap sớm từ tuần 3 (staging chặn index, production mở) |
| Ra mắt trễ mùa dã quỳ | Hết tuần 4 chưa có 60 điểm active | Ra mắt với lịch trình dã quỳ và các điểm đã có, bổ sung dần |

**Câu hỏi mở:**

- [x] Tên miền và tên sản phẩm: đã chốt Rành Đường, ranhduong.vn (đăng ký trước S02)
- [ ] Số giờ code thực tế mỗi tuần
- [x] Nhà cung cấp tile bản đồ: đã chốt MapLibre + OpenFreeMap
- [ ] Umami hay PostHog
- [ ] Tài khoản dùng để nhắn quán: Facebook cá nhân hay fanpage của web
