/** Web-owned static pages; update lastmod when the published content changes. */
export const LEGAL_PAGES = [
  { path: '/dieu-khoan', title: 'Điều khoản sử dụng', description: 'Điều khoản sử dụng cẩm nang Rành Đường, thông tin địa điểm và quyền sử dụng nội dung.', lastmod: '2026-10-12T00:00:00.000Z' },
  { path: '/quyen-rieng-tu', title: 'Quyền riêng tư', description: 'Cách Rành Đường dùng dữ liệu truy cập, cookie khách và vị trí nơi ở khi tạo lịch trình; lựa chọn đo lượt truy cập của bạn.', lastmod: '2026-10-21T00:00:00.000Z' },
  { path: '/ghi-nguon', title: 'Ghi nguồn', description: 'Nguồn dữ liệu bản đồ OpenStreetMap, OpenFreeMap và thông tin bản quyền ảnh trên Rành Đường.', lastmod: '2026-10-12T00:00:00.000Z' },
] as const;

export type LegalPage = typeof LEGAL_PAGES[number];
