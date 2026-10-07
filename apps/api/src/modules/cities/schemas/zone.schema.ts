import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PolygonSchema } from '../../../shared/db/geojson.schema';

export const ZONE_MODEL = 'Zone';

/** Cụm khu vực trong một thành phố; polygon dùng để vẽ và tra điểm thuộc cụm nào. */
export const ZoneSchema = new Schema(
  {
    cityId: { type: Schema.Types.ObjectId, required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    area: { type: PolygonSchema, required: true },
  },
  { collection: 'zones', timestamps: true },
);

ZoneSchema.index({ cityId: 1, slug: 1 }, { unique: true });
ZoneSchema.index({ area: '2dsphere' });

export type ZoneDoc = InferSchemaType<typeof ZoneSchema>;
export type ZoneModel = Model<ZoneDoc>;
