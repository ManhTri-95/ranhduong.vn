# S23 — Giao diện theo mùa

## Cấu hình trong admin

Mở `/mua` trong admin, mục **Mùa & giao diện**. Thêm mùa, nhập ngày bắt đầu/kết thúc dạng MM-DD, màu #RRGGBB, tiêu đề và mô tả banner, minh hoạ và lịch trình nổi bật rồi bấm **Lưu cấu hình mùa**. Ngày lặp lại mỗi năm, tính cả hai đầu; `12-20` → `02-28` kéo dài qua năm mới. Ngày tính theo Asia/Ho_Chi_Minh.

Các nút Dã quỳ / Mai anh đào / Mùa mưa điền màu, loại mùa và minh hoạ theo spec. Ngày và mô tả để trống để admin xác nhận theo thực tế; không tự ghi lịch mùa 2026–2027 vào DB. Không thêm dữ liệu địa điểm hoặc lịch trình thật.

Mùa hoa thắng các mùa khác khi trùng ngày. Các mùa hoa trùng nhau lấy mùa ở trên trước; những mùa còn lại lấy theo thứ tự cấu hình. Nút Lên / Xuống thay thứ tự. Khoá mùa phải duy nhất, không dấu; tối đa 24 mùa. Không có mùa phù hợp thì web dùng City.accent và giữ thứ tự lịch trình mẫu hiện có. Thống kê lượt xem lịch trình chưa có trong repo nên chưa có xếp hạng theo lượt xem.

Lịch trình có thể để trống. Picker chỉ lấy mẫu published/public hợp lệ của thành phố. Nếu lịch trình đã chọn bị chuyển nháp, unlisted, xoá hoặc dữ liệu hỏng, API không tạo liên kết cho banner. Admin cần chọn lại hoặc bỏ liên kết trước lần lưu tiếp theo.

## Lưu, khôi phục và xung đột

Bản đang sửa được giữ trong localStorage `rd:seasons:{city}` kể cả ngày đang nhập dở. Tải lại hoặc đăng nhập lại thì có nút Khôi phục. Lỗi mạng/phiên không xoá nội dung. Nếu storage bị chặn hoặc đầy, giao diện báo chưa giữ được và hỏi trước khi rời trang.

Bỏ lời nhắc khôi phục cũ vẫn giữ và lưu bản đang nhập mới. Nếu lần lưu này thất bại, trạng thái trên máy chuyển sang chưa giữ được và chặn rời trang khi cần.

Lưu dùng updatedAt làm phiên bản, so sánh trong findOneAndUpdate. Hai tab cùng sửa: bản đến sau trả 409, không ghi đè. Bấm Tải phiên bản mới vẫn giữ input hiện tại; chỉ bấm **Giữ bản đang sửa với phiên bản mới** mới nhận phiên bản mới để lưu lại. Thao tác này thay cấu hình hiện tại bằng bản đang sửa; cần kiểm nội dung trước khi lưu.

Seed dùng $setOnInsert cho seasons/active và giữ cấu hình đã chỉnh. Seed thay updatedAt nên có thể làm bản form đang mở cần tải phiên bản mới.

## API và cache

- `GET /v1/admin/cities/:city/seasons`: CitySeasonSettings, no-store, AdminGuard.
- `PUT` cùng route: CitySeasonEditInput gồm seasons + updatedAt; AdminGuard và OriginGuard. Validate shared Zod trước ghi.
- `GET /v1/admin/cities/:city/seasons/itineraries`: các ID và card hợp lệ cho picker; no-store, AdminGuard.
- `GET /v1/cities/:city/now`: accent, season hoặc null, featuredItinerary hoặc null, expiresAt; không có ID nội bộ hoặc dữ liệu thời tiết.

Module city-now gọi service của cities/itineraries ở tầng ngoài cùng; CitiesModule không phụ thuộc ngược vào itineraries. Redis cache dữ liệu mùa tối đa 900 giây, rút ngắn tới nửa đêm Việt Nam. Cache key có city ID, updatedAt và ngày địa phương; một request cũ không ghi đè cache của cấu hình mới. Redis lỗi thì tính từ MongoDB. Mỗi request API kiểm lại quyền công khai của lịch trình; card không được lưu trong cache mùa.

Cache HTTP của /now và HTML thành phố tối đa 15 phút; tìm kiếm và lỗi giữ no-store, sitemap vẫn 1 giờ. CDN/HTML có thể giữ nội dung đã công khai trong thời gian cache còn lại. Client cập nhật khi expiresAt tới hạn hoặc tab trở lại; lỗi thì dùng màu thành phố và ẩn banner cũ. Trang chủ có Thử lại. Thay đổi lưu trong admin có thể mất tới 15 phút để hiện trên các lớp cache web.

## Giao diện

Token --accent được áp dụng từ SSR trên phần tử html, được dọn khi rời thành phố. Các trang chi tiết, danh mục, bản đồ, lịch trình và footer cùng nhận màu mùa. Banner nằm sau intro, trước tìm kiếm; card nổi bật được đưa đầu dải lịch trình kể cả khi nằm ngoài giới hạn danh sách, không nhân đôi slug.

Minh hoạ SVG nội tuyến 96×96, hỗ trợ wild-sunflower/cherry-blossom/rain/notebook; khoá cũ không biết dùng sổ tay. Chỉ chọn SVG có trong code, không chèn HTML/SVG từ DB. Minh hoạ lắc -2° ↔ 2° trong 4 giây; reduced motion tắt. Chữ trên màu nhấn dùng --ink, vùng bấm tối thiểu 44px.

## Kiểm chứng

- `pnpm turbo run lint typecheck test build`: 20/20 task xanh sau bản sửa review; contracts 338, geo 37, API 361, admin 120, web 87 test xanh.
- `pnpm --filter @ranhduong/web test:ssr`: 69 test xanh, gồm ba màu, banner/link/promotion SSR, màu mặc định, lỗi /now và hồi phục cùng URL; các route thành phố s-maxage=900, sitemap giữ 3600.
- Unit/integration: ranh giới ngày Việt Nam, mùa qua năm mới/leap day, ưu tiên hoa, ngày/key/màu/ID sai, auth/Origin, lưu/xoá/CAS, seed giữ mùa, template ngoài limit và đã thu hồi công khai, raw recovery và lỗi phiên/mạng/storage. Redis lỗi đọc/ghi vẫn phục vụ mùa; request cũ hoàn tất sau khi admin cập nhật không ghi đè cache mới.

Chrome headless với fixture mang tên **Giả Lập**: ba theme/mặc định/minh hoạ không biết, không tràn ngang ở 390px và desktop; promotion/link, chuyển sang pháp lý dọn theme, màu trên bản đồ, expiresAt và retry, reduced motion. Admin sửa/lưu/reload, lỗi 401 giữ input, bỏ lời nhắc cũ vẫn giữ bản nhập mới rồi khôi phục/lưu lại. Không có runtime exception hoặc cảnh báo hydration. API admin bị chặn và trả fixture trong probe, không ghi dữ liệu vào DB thật.

Ảnh: [trang chủ 390px](assets/s23-home-mobile.png), [trang chủ desktop](assets/s23-home-desktop.png), [admin 390px](assets/s23-admin-mobile.png), [admin desktop](assets/s23-admin-desktop.png).

Review độc lập toàn bộ thay đổi: một lỗi Important về xoá bản nháp mới khi bỏ lời nhắc cũ, đã sửa sau hai test RED → GREEN (lưu được và storage lỗi). Không có Critical, Minor hoặc mục từ chối đánh giá. Không chạy vòng review thứ hai; các test hồi quy và bộ kiểm tra toàn workspace kiểm bản sửa.

Quyết định khi thực thi: thêm GET admin seasons/itineraries vì DTO danh sách cũ không có visibility để lọc picker an toàn (chi phí nếu cần đổi: một route admin); dùng PowerShell/apply_patch cho sổ theo dõi vì helper Bash lỗi đường dẫn Windows trong sandbox (không ảnh hưởng sản phẩm, chỉ thay công cụ ghi sổ).

## Nghiệm thu còn lại

- [ ] Xác nhận ngày bắt đầu/kết thúc mùa 2026–2027 và gắn lịch trình thật trong admin.
- [ ] CI remote, merge/deploy staging sau S02; kiểm các lớp CDN và /now ở domain thật.
- [ ] Điện thoại thật Android/iPhone: điều hướng/Back, form, giảm chuyển động, mạng yếu và hết phiên.
- [ ] Theo dõi Sentry 24 giờ. Chỉ chuyển story sang Xong khi đủ definition of done.
