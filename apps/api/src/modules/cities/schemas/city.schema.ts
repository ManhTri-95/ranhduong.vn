import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PointSchema } from '../../../shared/db/geojson.schema';

export const CITY_MODEL = 'City';

const SeasonSchema = new Schema(
  {
    key: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    accent: { type: String, required: true },
    title: { type: String, required: true },
    sub: { type: String, required: true },
    illustration: { type: String, required: true },
    featuredItineraryId: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

/** Thành phố (technical-design mục 3); input được validate bằng `CityInput` của contracts trước khi ghi. */
export const CitySchema = new Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    center: { type: PointSchema, required: true },
    timezone: { type: String, enum: ['Asia/Ho_Chi_Minh'], required: true },
    active: { type: Boolean, required: true, default: false },
    accent: { type: String, required: true },
    /** [tây, nam, đông, bắc] */
    mapBounds: { type: [Number], required: true },
    seasons: { type: [SeasonSchema], default: [] },
  },
  { collection: 'cities', timestamps: true },
);

CitySchema.index({ slug: 1 }, { unique: true });

export type CityDoc = InferSchemaType<typeof CitySchema>;
export type CityModel = Model<CityDoc>;
