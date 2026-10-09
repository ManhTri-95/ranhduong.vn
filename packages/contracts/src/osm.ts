import { z } from 'zod';
import { GeoPoint } from './geojson.js';

/** Numeric IDs overlap between OSM element types. */
export const OsmId = z.string().regex(/^(node|way|relation)\/[1-9]\d*$/, 'Mã OSM cần có dạng node/123, way/123 hoặc relation/123');
export type OsmId = z.infer<typeof OsmId>;

const lat = z.number().min(-90).max(90);
const lon = z.number().min(-180).max(180);
export const OsmElement = z.object({
  type: z.enum(['node', 'way', 'relation']),
  id: z.number().int().positive(),
  lat: lat.optional(),
  lon: lon.optional(),
  center: z.object({ lat, lon }).optional(),
  tags: z.record(z.string(), z.string()).default({}),
});
export type OsmElement = z.infer<typeof OsmElement>;

/** Validate the envelope first, then skip malformed individual elements. A remark may signal partial data. */
export const OverpassResponse = z.object({
  elements: z.array(z.unknown()),
  remark: z.string().optional(),
}).superRefine((response, ctx) => {
  if (response.remark?.trim()) ctx.addIssue({ code: 'custom', path: ['remark'], message: `Overpass trả kết quả chưa đầy đủ: ${response.remark}` });
});
export type OverpassResponse = z.infer<typeof OverpassResponse>;

export const OsmDraft = z.object({
  osmId: OsmId,
  name: z.string().trim().min(1).max(120),
  category: z.enum(['cafe', 'food', 'attraction']),
  location: GeoPoint,
  address: z.string().trim().min(1).max(300).optional(),
});
export type OsmDraft = z.infer<typeof OsmDraft>;

export const OsmImportResult = z.object({
  received: z.number().int().min(0),
  created: z.number().int().min(0),
  wouldCreate: z.number().int().min(0),
  existing: z.number().int().min(0),
  skipped: z.number().int().min(0),
  dryRun: z.boolean(),
});
export type OsmImportResult = z.infer<typeof OsmImportResult>;
