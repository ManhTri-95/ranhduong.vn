import { z } from 'zod';

const Lng = z.number().min(-180).max(180);
const Lat = z.number().min(-90).max(90);

/** Toạ độ GeoJSON theo thứ tự [lng, lat] (kinh độ trước). */
export const LngLat = z.tuple([Lng, Lat]);
export type LngLat = z.infer<typeof LngLat>;

export const GeoPoint = z.object({ type: z.literal('Point'), coordinates: LngLat });
export type GeoPoint = z.infer<typeof GeoPoint>;

/** Vòng kín theo chuẩn GeoJSON: ít nhất 4 điểm, điểm cuối trùng điểm đầu. */
const LinearRing = z
  .array(LngLat)
  .min(4, 'Vòng polygon cần ít nhất 4 điểm')
  .refine((ring) => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first !== undefined && last !== undefined && first[0] === last[0] && first[1] === last[1];
  }, 'Điểm cuối của vòng polygon phải trùng điểm đầu');

export const GeoPolygon = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(LinearRing).min(1, 'Polygon cần ít nhất một vòng'),
});
export type GeoPolygon = z.infer<typeof GeoPolygon>;

/** Khung bản đồ [tây, nam, đông, bắc], dùng làm maxBounds của MapLibre. */
export const BBox = z
  .tuple([Lng, Lat, Lng, Lat])
  .refine(([west, south, east, north]) => west < east && south < north, 'Khung bản đồ cần tây < đông và nam < bắc');
export type BBox = z.infer<typeof BBox>;
