import { CitySeed, type DalatZone, type GeoPolygon } from '@ranhduong/contracts';
import { boundsOf } from '@ranhduong/geo';

/** Hình chữ nhật [tây, nam, đông, bắc] thành polygon GeoJSON, vòng ngoài ngược chiều kim đồng hồ. */
function rect(west: number, south: number, east: number, north: number): GeoPolygon {
  return {
    type: 'Polygon',
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  };
}

/**
 * 4 cụm khu vực theo product-spec mục 4. RANH GIỚI PHÁC THẢO: hình chữ nhật, các cụm cách nhau 300–800 m,
 * không chạm nhau; chủ dự án duyệt trên geojson.io trước khi seed staging/production.
 * Đổi ranh giới thì sửa ở đây rồi chạy lại `pnpm seed` (_id cụm giữ nguyên).
 * Gán cụm cho địa điểm vẫn chọn tay (data-collection mục 5); polygon dùng để vẽ và gợi ý.
 */
const ZONES: { slug: DalatZone; name: string; area: GeoPolygon }[] = [
  // Hồ Xuân Hương, chợ Đà Lạt, ga Đà Lạt
  { slug: 'trung-tam', name: 'Trung tâm', area: rect(108.415, 11.925, 108.478, 11.968) },
  // Tuyền Lâm, Datanla, Trúc Lâm, Prenn
  { slug: 'phia-nam', name: 'Phía Nam', area: rect(108.395, 11.86, 108.48, 11.92) },
  // Langbiang, Lạc Dương, Đankia
  { slug: 'phia-bac', name: 'Phía Bắc', area: rect(108.36, 11.975, 108.48, 12.07) },
  // Trại Mát, Cầu Đất, Trạm Hành
  { slug: 'phia-dong', name: 'Phía Đông', area: rect(108.483, 11.83, 108.6, 11.968) },
];

export const DA_LAT_SEED: CitySeed = CitySeed.parse({
  city: {
    slug: 'da-lat',
    name: 'Đà Lạt',
    // Toạ độ trung tâm đã dùng trong data-collection.md mục 5.
    center: { type: 'Point', coordinates: [108.4583, 11.9404] },
    timezone: 'Asia/Ho_Chi_Minh',
    active: true,
    // Màu nhấn mặc định của Đà Lạt (ui-spec mục 2: vàng dã quỳ).
    accent: '#E9B824',
    // maxBounds cho MapLibre: khung bao 4 cụm, nới 0,02° (khoảng 2 km) mỗi phía.
    mapBounds: boundsOf(ZONES.flatMap((zone) => zone.area.coordinates.flat()), 0.02),
    // Mùa nhập qua admin ở S23; seed chỉ đặt khi tạo mới.
    seasons: [],
  },
  zones: ZONES,
});
