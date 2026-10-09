# Import OSM thành nháp (S08)

Script lấy quán cà phê (`amenity=cafe`), quán ăn (`restaurant`, `fast_food`, `food_court`) và điểm tham quan (`tourism=attraction`, `museum`, `viewpoint`, `gallery`, `zoo`, `theme_park`) từ Overpass. Truy vấn cả node, way và relation trong `City.mapBounds`. Khung Đà Lạt hiện có bao gồm các cụm du lịch xung quanh, không phải ranh giới hành chính.

## Chạy

1. Chạy MongoDB (`pnpm infra:up`), đặt `MONGODB_URI` trong `apps/api/.env` theo `.env.example`. CLI không cần cấu hình Google, Redis hay R2.
2. `pnpm seed` nếu chưa có thành phố Đà Lạt và các cụm.
3. `pnpm import:osm --dry-run` để xem số lượng; không ghi địa điểm hay tạo index.
4. `pnpm import:osm` để tạo nháp. Lệnh build API và các package cần thiết trước khi chạy.
5. Vào admin `/dia-diem`, tab Nháp để chọn điểm muốn giữ, kiểm tra ghim, chọn khu vực, bổ sung thông tin và xác minh trước khi kích hoạt.

`pnpm import:osm --help` liệt kê các tùy chọn. Có thể dùng `--city <slug>` khi đã seed thành phố khác.

Nếu đã có file JSON xuất từ Overpass, dùng đường dẫn tuyệt đối để tránh nhầm thư mục chạy:

```powershell
pnpm import:osm --input 'C:\data\osm-da-lat.json' --dry-run
pnpm import:osm --input 'C:\data\osm-da-lat.json'
```

File cần có dạng `{ "elements": [...] }`. Đường dẫn tương đối tính từ `apps/api`. File hỏng, thiếu elements hoặc có remark báo kết quả chưa đầy đủ làm lệnh dừng trước khi ghi.

## Dữ liệu và chống trùng

- Chỉ nhập điểm có tên, danh mục hỗ trợ và tọa độ hợp lệ trong khung. Tên ưu tiên `name:vi`, rồi `name`; địa chỉ chỉ ghép từ các tag `addr:*` có sẵn. Dòng sai hoặc tên vượt giới hạn form được bỏ qua.
- Tọa độ node lấy từ lon/lat, way/relation lấy center của khung bao. Center có thể nằm ngoài hình thực tế: kiểm tra và sửa ghim trước khi công khai. Center ngoài mapBounds được bỏ qua.
- Nháp có `source=admin` (người thực hiện import), `status=draft`, `ids.osmId=node/123`, `way/123` hoặc `relation/123`. Cùng số nhưng khác loại là hai ID khác nhau.
- Không tự chọn zone hoặc điền giờ mở cửa, giá, ảnh, số điện thoại, website, nguồn/ngày xác minh. OSM chỉ cung cấp nền để hoàn thiện thủ công theo quy trình thu thập dữ liệu.
- Index unique có điều kiện trên `{cityId, ids.osmId}` và upsert chỉ chèn giúp chạy lại hoặc chạy đồng thời không sinh bản trùng. Nháp đã sửa, địa điểm active/hidden/closed/merged và timestamps giữ nguyên. Import không cập nhật dữ liệu OSM mới vào địa điểm đã có.
- Tên trùng vẫn có thể là hai cơ sở khác nhau. Slug dùng helper chung, tránh slug hiện tại và slugHistory; S08 chỉ chống trùng chính xác theo OSM ID, không tự gộp node/way khác ID hay địa điểm nhập tay chưa có OSM ID.
- Xóa hẳn một nháp rồi import lại sẽ tạo lại nháp đó. Không lưu danh sách ID đã xóa trong S08.

## Lỗi và vận hành

- Overpass có giới hạn tải: HTTP 429/503 hoặc timeout thì chờ rồi chạy lại, hoặc đổi `OVERPASS_URL` trong `apps/api/.env`. Không lặp truy vấn liên tục. Thời gian tối đa truy vấn phía server 25 giây, phía client 30 giây.
- Lệnh dừng khi có lỗi hệ thống và trả exit code 1. Nếu đã nhập một phần trước lỗi DB, chạy lại để tiếp tục; các ID đã lưu được bỏ qua.
- Nếu DB cũ đã có nhiều document cùng `{cityId, ids.osmId}`, việc tạo unique index sẽ thất bại. Rà soát và gộp/sửa dữ liệu trước khi chạy; script không tự xóa dữ liệu để tạo index.
- Không commit snapshot chứa dữ liệu thực tế vào repo. Khi công khai dữ liệu OSM, phần ghi nguồn theo S20 phải có liên kết OpenStreetMap và thông tin giấy phép ODbL.

Tham chiếu: [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), [Overpass QL: khung truy vấn và out center](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL), [nguồn và giấy phép OSM](https://www.openstreetmap.org/copyright).

## Kiểm tra đã thực hiện (09/10/2026)

- Toàn repo: 20/20 tác vụ lint/typecheck/test/build qua, không dùng cache.
- CLI đã build trong MongoDB tạm: xem trước dự kiến một nháp, không tạo collection/index; lần đầu tạo một nháp, lần hai tạo zero và giữ nguyên toàn bộ document; JSON có remark trả exit code 1. Database tạm đã được dọn.
- Test MongoDB: chạy lại, tám lượt đồng thời cùng ID, ba loại OSM cùng số ID/tên, slugHistory, giữ địa điểm đã sửa ở trạng thái draft/active/closed/merged, không tự điền nguồn xác minh.
- Truy vấn Overpass thật trong khung seed Đà Lạt: 887 phần tử, 674 đủ điều kiện ánh xạ, bỏ qua 213; không ghi vào database địa điểm của dự án. Số lượng sẽ thay đổi theo OSM.
- Review độc lập không có lỗi Critical/Important; còn đề xuất nhỏ bổ sung fixture riêng cho center way/relation nằm ngoài khung (kiểm tra bounds hiện đã áp dụng cho center).
- Staging và kiểm tra nháp trên admin bằng điện thoại thật còn chờ S02/chủ dự án.
