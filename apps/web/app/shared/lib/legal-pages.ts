/** Web-owned static pages; update lastmod when the published content changes. */
export const LEGAL_PAGES = [
  { path: '/dieu-khoan', title: 'Điều khoản sử dụng', description: 'Điều khoản sử dụng cẩm nang Rành Đường, thông tin địa điểm và quyền sử dụng nội dung.', lastmod: '2026-10-12T00:00:00.000Z' },
  { path: '/quyen-rieng-tu', title: 'Quyền riêng tư', description: 'Rành Đường sử dụng dữ liệu truy cập thế nào và cách bạn chọn hoặc từ chối đo lượt truy cập.', lastmod: '2026-10-12T00:00:00.000Z' },
  { path: '/ghi-nguon', title: 'Ghi nguồn', description: 'Nguồn dữ liệu bản đồ OpenStreetMap, OpenFreeMap và thông tin bản quyền ảnh trên Rành Đường.', lastmod: '2026-10-12T00:00:00.000Z' },
] as const;

export type LegalPage = typeof LEGAL_PAGES[number];
