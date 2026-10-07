# ADR 0010: URL công khai ổn định, slug không dấu, đổi slug thì 301

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10-06
- Nguồn: [technical-design.md](../technical-design.md) mục 3, 9, 11; [backlog.md](../backlog.md) mục 1, S10, S17; [ui-spec.md](../ui-spec.md) mục 5

## Bối cảnh

Khách tìm đến web qua Google và link chia sẻ trong group Facebook, Zalo. Lát 1 chỉ hoàn thành khi trang được Google index. Đổi URL công khai sẽ mất thứ hạng và làm hỏng link đã chia sẻ.

## Quyết định

- Thành phố nằm trong path, URL theo bảng ở technical-design mục 11: `/da-lat`, danh mục (`/da-lat/ca-phe`…), `/da-lat/khu-vuc/{slug}`, `/da-lat/top/{slug}`, `/da-lat/dia-diem/{slug}`, `/da-lat/lich-trinh/{slug}`, `/da-lat/bang-xep-hang`. Lịch trình cá nhân ở `/l/{shareId}` và luôn `noindex`.
- Slug không dấu, chữ thường, gạch nối, sinh bằng `slugify` trong `packages/geo`; unique theo `{cityId, slug}`.
- Đổi slug thì lưu `slugHistory` và trả 301 từ slug cũ. Địa điểm `merged` trả 301 sang bản chính. Địa điểm `closed` vẫn giữ trang (200), hiển thị "đã đóng cửa" và gợi ý quán tương tự.
- Trang công khai render SSR, cache SWR ở Cloudflare. Mỗi trang có `title`, `description`, `canonical`, Open Graph và JSON-LD; sitemap index tách theo loại.

## Hệ quả

- Không đổi hay xoá route công khai khi chưa hỏi chủ dự án; đổi cấu trúc URL phải có ADR mới.
- Thêm thành phố chỉ thêm prefix mới, không đổi URL cũ.
- Logic slug và redirect thuộc nhóm "logic có điều kiện", bắt buộc có unit test.
