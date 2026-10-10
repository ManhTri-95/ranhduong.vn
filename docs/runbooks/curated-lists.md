# S14 — Danh sách gợi ý theo chủ đề

Admin có mục **Danh sách gợi ý** ở `/danh-sach`. Bấm **Tạo danh sách** để nhập tiêu đề (tối đa 200 ký tự), mô tả (2000 ký tự), chọn tối đa 50 địa điểm đang hiển thị và sắp thứ tự bằng nút **Lên**, **Xuống**. Tìm tên có dấu hoặc không dấu; địa điểm đã chọn không xuất hiện lại trong kho. Nút **Bỏ** chỉ bỏ địa điểm khỏi danh sách.

**Lưu nháp** giữ danh sách riêng tư, cho phép chưa chọn địa điểm. **Công khai danh sách** yêu cầu ít nhất một địa điểm và tất cả địa điểm đã chọn phải đang hiển thị, thuộc đúng thành phố. Sau khi công khai, dùng **Lưu và công khai** để cập nhật hoặc **Chuyển về nháp** để ngừng hiển thị. Enter trong các ô nhập không công khai danh sách; thao tác công khai phải bấm nút tương ứng.

Đường dẫn là `/{city}/top/{slug}`, Đà Lạt dùng `/da-lat/top/{slug}`. Slug sinh một lần từ tiêu đề bằng `slugify`, thêm hậu tố số nếu trùng; đổi tiêu đề giữ nguyên URL. Chưa có thao tác xoá hay sửa slug của danh sách. Danh sách công khai được liên kết từ trang chủ thành phố ở mục **Gợi ý theo chủ đề**.

Trang công khai render SSR, hiện tiêu đề, mô tả và các thẻ địa điểm có số theo đúng thứ tự đã lưu. Địa điểm không còn active bị loại khỏi nội dung công khai, các chỗ còn lại giữ thứ tự; không lộ ID hoặc trường quản trị. Nếu mọi địa điểm bị ẩn/đóng, URL vẫn trả 200 với thông báo đang cập nhật. Danh sách nháp, slug hoặc thành phố không tồn tại trả 404.

## API và dữ liệu

- `GET /v1/admin/cities/:city/curated-lists`: mọi danh sách của thành phố.
- `POST /v1/admin/cities/:city/curated-lists`: tạo danh sách; 201.
- `GET /v1/admin/curated-lists/:id`: đọc để sửa.
- `PUT /v1/admin/curated-lists/:id`: thay tiêu đề, mô tả, mảng ID có thứ tự và trạng thái; slug/city giữ nguyên.
- `GET /v1/cities/:city/curated-lists`: tóm tắt các danh sách published, số địa điểm active hiện tại.
- `GET /v1/cities/:city/curated-lists/:slug`: nội dung công khai theo thứ tự.

Body ghi: `{ title, description, placeIds, status: 'draft' | 'published' }`. Schema dùng chung ở `packages/contracts/src/curated-list.ts`. Request admin cần cookie phiên; request ghi cần Origin hợp lệ. ID địa điểm trùng, thiếu, sai thành phố, đã merged bị từ chối. Nháp có thể giữ địa điểm tạm ẩn; công khai yêu cầu active.

Collection `curated_lists` lưu `cityId`, `slug`, `title`, `description`, `placeIds` (ObjectId[]), `status`, `createdAt`, `updatedAt`. Unique index `{cityId, slug}` và retry lỗi duplicate key bảo vệ tạo đồng thời. Module chỉ truy cập collection của nó; dữ liệu địa điểm đi qua PlacesService. Không có dependency hoặc biến môi trường mới; triển khai API trước web/admin vì trang chủ gọi endpoint mới.

HTML dùng SWR 3600 giây. Chỉnh sửa, chuyển về nháp hoặc ẩn địa điểm có thể cần tối đa một giờ để hết HTML cũ. Phản hồi 404/503 là no-store; API lỗi giữ các phần tải thành công, trả 503 và nút **Thử lại**. SEO cơ bản có title, description và canonical; OG/JSON-LD/sitemap đầy đủ thuộc S17.

## Khôi phục nội dung đang soạn

Form giữ bản đang sửa trên localStorage theo thành phố và ID (hoặc `moi`), kể cả nội dung chưa đủ điều kiện lưu. Khi quay lại có lựa chọn **Khôi phục** hoặc **Bỏ bản trên máy**. Lưu thành công xoá bản cục bộ. Mất mạng hoặc hết phiên không làm trống form; hết phiên có link **Đăng nhập lại để lưu tiếp**. Khi localStorage bị chặn/hết chỗ, form không báo đã giữ trên máy; nội dung vẫn ở tab đang mở.

## Kiểm chứng và kiểm tra staging

- `pnpm turbo run lint typecheck test build`: toàn workspace; API integration dùng MongoDB/Redis thật và database riêng, kiểm quyền/Origin, thứ tự, trạng thái, tham chiếu và tạo đồng thời.
- `pnpm --filter @ranhduong/web test:ssr`: production SSR, canonical, thứ tự thẻ, liên kết trang chủ, SWR 1 giờ, 404/503 no-store, retry/hồi phục và trang rỗng.
- Chrome headless: 390×844 và 1440×1000 với dữ liệu Giả Lập. Kiểm tìm/chọn, Lên/Xuống, lưu nháp/công khai, Enter không công khai, hết phiên/khôi phục, trang công khai đúng thứ tự và SSR khi tắt JavaScript. Kiểm không tràn ngang và không lỗi runtime.

Ảnh fixture: [admin 390px](assets/s14-admin-mobile.png), [admin desktop](assets/s14-admin-desktop.png), [web 390px](assets/s14-public-mobile.png), [web desktop](assets/s14-public-desktop.png).

Staging: tạo nháp thật với dữ liệu đã thu thập; đổi thứ tự, công khai, mở URL trên Android/iPhone; đổi tiêu đề kiểm URL giữ nguyên; ẩn một địa điểm kiểm danh sách sau khi cache hết hạn; hết phiên khi soạn kiểm đăng nhập/khôi phục. Chờ CI remote, staging (S02), điện thoại thật và Sentry 24 giờ trước khi đánh dấu story **Xong**. Chưa merge hoặc tạo PR.
