import { CitySeed, type DalatZone, type GeoPolygon } from '@ranhduong/contracts';
import { boundsOf } from '@ranhduong/geo';

type LngLat = [number, number];

/** Polygon GeoJSON từ các đỉnh đi ngược chiều kim đồng hồ; tự khép vòng. */
function polygon(...vertices: LngLat[]): GeoPolygon {
  const first = vertices[0];
  if (!first) throw new Error('Polygon cần ít nhất một đỉnh');
  return { type: 'Polygon', coordinates: [[...vertices, first]] };
}

// Khung ngoài (cũng là khung bản đồ) và ba đường chia cụm, đơn vị độ.
const WEST = 108.34;
const EAST = 108.62;
const SOUTH = 11.81;
const NORTH = 12.09;
/** Kinh tuyến tách Phía Đông khỏi Trung tâm và Phía Nam. */
const EAST_LINE = 108.48;
/** Vĩ tuyến tách Phía Bắc khỏi các cụm còn lại. */
const NORTH_LINE = 11.97;
/** Vĩ tuyến tách Trung tâm và Phía Nam. */
const SOUTH_LINE = 11.922;

/**
 * 4 cụm khu vực theo product-spec mục 4. RANH GIỚI PHÁC THẢO, chủ dự án duyệt trên geojson.io trước khi
 * seed staging/production. Các cụm phủ kín khung bản đồ, chung cạnh, không khe, không chồng.
 * Cạnh chung dùng chung đỉnh (kể cả đỉnh giữa cạnh dài) vì MongoDB vẽ cạnh theo đường trắc địa: một cạnh dài
 * ghép với hai cạnh ngắn sẽ lệch nhau vài mét.
 * Đổi ranh giới thì sửa các đường chia ở trên rồi chạy lại `pnpm seed` (_id cụm giữ nguyên).
 * Gán cụm cho địa điểm vẫn chọn tay (data-collection mục 5); polygon dùng để vẽ và gợi ý.
 */
const ZONES: { slug: DalatZone; name: string; area: GeoPolygon }[] = [
  {
    // Hồ Xuân Hương, chợ Đà Lạt, ga Đà Lạt
    slug: 'trung-tam',
    name: 'Trung tâm',
    area: polygon([WEST, SOUTH_LINE], [EAST_LINE, SOUTH_LINE], [EAST_LINE, NORTH_LINE], [WEST, NORTH_LINE]),
  },
  {
    // Tuyền Lâm, Datanla, Trúc Lâm, Prenn
    slug: 'phia-nam',
    name: 'Phía Nam',
    area: polygon([WEST, SOUTH], [EAST_LINE, SOUTH], [EAST_LINE, SOUTH_LINE], [WEST, SOUTH_LINE]),
  },
  {
    // Langbiang, Lạc Dương, Đankia
    slug: 'phia-bac',
    name: 'Phía Bắc',
    area: polygon([WEST, NORTH_LINE], [EAST_LINE, NORTH_LINE], [EAST, NORTH_LINE], [EAST, NORTH], [WEST, NORTH]),
  },
  {
    // Trại Mát, Cầu Đất, Trạm Hành
    slug: 'phia-dong',
    name: 'Phía Đông',
    area: polygon([EAST_LINE, SOUTH], [EAST, SOUTH], [EAST, NORTH_LINE], [EAST_LINE, NORTH_LINE], [EAST_LINE, SOUTH_LINE]),
  },
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
    // maxBounds cho MapLibre: đúng khung bao 4 cụm (các cụm phủ kín khung nên không nới thêm).
    mapBounds: boundsOf(ZONES.flatMap((zone) => zone.area.coordinates.flat())),
    // Mùa nhập qua admin ở S23; seed chỉ đặt khi tạo mới.
    seasons: [],
  },
  zones: ZONES,
});
