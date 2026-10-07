# ADR 0008: Bản đồ MapLibre GL JS với tile OpenFreeMap và style tự sửa

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 1, 11, 14; [ui-spec.md](../ui-spec.md) mục 6; [architecture.md](../architecture.md) mục 3; [decisions.md](../decisions.md)

## Bối cảnh

Bản đồ là màn hình chính của lát 1, cần phong cách "sổ tay" riêng, miễn phí, không giới hạn lượt và không vướng điều khoản Google ([ADR 0001](0001-google-places-place-id-only.md)). Người dùng không được kéo ra khỏi khu vực Đà Lạt.

## Quyết định

- Dùng MapLibre GL JS với tile OpenFreeMap bản public (không cần API key). Không dùng Google Maps JS.
- Style JSON sửa từ "positron" bằng Maputnik, lưu trong repo, phục vụ từ `ranhduong.vn`. URL style nằm trong cấu hình (`NUXT_PUBLIC_MAP_STYLE_URL`) để có thể chuyển sang PMTiles tự host trên R2.
- Khoá `maxBounds` quanh Đà Lạt và các điểm ngoại ô, `minZoom` khoảng 11. Ẩn POI của OSM, chỉ hiện ghim của mình.
- Chỉ tải MapLibre khi mở trang bản đồ hoặc khi bản đồ nhỏ cuộn vào màn hình.

## Hệ quả

- Tile đi thẳng từ OpenFreeMap, không qua VPS.
- Luôn hiển thị "© OpenStreetMap contributors"; dữ liệu OSM theo giấy phép ODbL.
- Nhãn bản đồ dùng glyph Noto Sans của OpenFreeMap; muốn font viết tay thì phải tự host glyph.
- Bản đồ luôn có danh sách thay thế để không phụ thuộc vào thao tác chạm ghim (khả năng truy cập).
- Cần tìm địa chỉ hoặc tuyến đường theo dữ liệu Việt Nam thì cân nhắc API của Goong, ghi ADR mới.
