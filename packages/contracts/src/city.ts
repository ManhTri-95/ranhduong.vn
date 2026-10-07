import { z } from 'zod';
import { HexColor, MonthDay, ObjectIdString, Slug } from './common.js';
import { BBox, GeoPoint, GeoPolygon, type LngLat } from './geojson.js';

/** Một mùa trong City.seasons (ui-spec mục 7); admin chỉnh ở S23. */
export const CitySeason = z.object({
  key: Slug,
  from: MonthDay,
  to: MonthDay,
  accent: HexColor,
  title: z.string().min(1),
  sub: z.string().min(1),
  illustration: z.string().min(1),
  featuredItineraryId: ObjectIdString.optional(),
});
export type CitySeason = z.infer<typeof CitySeason>;

export const CityInput = z.object({
  slug: Slug,
  name: z.string().min(1),
  center: GeoPoint,
  timezone: z.literal('Asia/Ho_Chi_Minh'),
  active: z.boolean(),
  accent: HexColor,
  mapBounds: BBox,
  seasons: z.array(CitySeason).default([]),
});
export type CityInput = z.infer<typeof CityInput>;

/** Cụm khu vực, định nghĩa thủ công bằng polygon (product-spec mục 4). */
export const ZoneInput = z.object({
  slug: Slug,
  name: z.string().min(1),
  area: GeoPolygon,
});
export type ZoneInput = z.infer<typeof ZoneInput>;

/** Dữ liệu seed một thành phố: thông tin thành phố và các cụm khu vực. */
export const CitySeed = z
  .object({ city: CityInput, zones: z.array(ZoneInput).min(1, 'Cần ít nhất một cụm') })
  .superRefine((seed, ctx) => {
    const [west, south, east, north] = seed.city.mapBounds;
    const inBounds = ([lng, lat]: LngLat) => lng >= west && lng <= east && lat >= south && lat <= north;
    if (!inBounds(seed.city.center.coordinates)) {
      ctx.addIssue({ code: 'custom', path: ['city', 'center'], message: 'Tâm thành phố nằm ngoài khung bản đồ' });
    }
    const seen = new Set<string>();
    seed.zones.forEach((zone, i) => {
      if (seen.has(zone.slug)) {
        ctx.addIssue({ code: 'custom', path: ['zones', i, 'slug'], message: `Trùng slug cụm: ${zone.slug}` });
      }
      seen.add(zone.slug);
      if (!zone.area.coordinates.every((ring) => ring.every(inBounds))) {
        ctx.addIssue({ code: 'custom', path: ['zones', i, 'area'], message: `Cụm ${zone.slug} nằm ngoài khung bản đồ` });
      }
    });
  });
export type CitySeed = z.infer<typeof CitySeed>;

/** Kết quả ghi seed; cụm có trong DB mà không còn trong seed nằm ở staleZoneSlugs (không bị xoá). */
export const CitySeedResult = z.object({
  cityId: ObjectIdString,
  cityCreated: z.boolean(),
  zonesCreated: z.number().int().min(0),
  zonesUpdated: z.number().int().min(0),
  staleZoneSlugs: z.array(Slug),
});
export type CitySeedResult = z.infer<typeof CitySeedResult>;
