import {
  BestTime,
  DEFAULT_CHECKIN_RADIUS_M,
  PhotoSource,
  PlaceCategory,
  PlaceSource,
  PlaceStatus,
  Transport,
  VerifySource,
  VipTier,
} from '@ranhduong/contracts';
import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PointSchema } from '../../../shared/db/geojson.schema';

export const PLACE_MODEL = 'Place';

const OpeningSlotSchema = new Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    open: { type: String, required: true },
    close: { type: String, required: true },
  },
  { _id: false },
);

const PhotoSchema = new Schema(
  {
    key: { type: String, required: true },
    source: { type: String, enum: PhotoSource.options, required: true },
    credit: { type: String, required: true },
    license: { type: String, required: true },
  },
  { _id: false },
);

/** Địa điểm (technical-design mục 3); input được validate bằng `Place` của contracts trước khi ghi. */
export const PlaceSchema = new Schema(
  {
    cityId: { type: Schema.Types.ObjectId, required: true },
    zoneId: { type: Schema.Types.ObjectId },
    slug: { type: String, required: true },
    slugHistory: { type: [String], default: [] },
    name: { type: String, required: true },
    aliases: { type: [String], default: [] },
    nameNorm: { type: String, default: '' },
    category: { type: String, enum: PlaceCategory.options, required: true },
    tags: { type: [String], default: [] },
    location: { type: PointSchema, required: true },
    address: { type: String },
    checkinRadiusM: { type: Number, default: DEFAULT_CHECKIN_RADIUS_M },
    openingHours: { type: [OpeningSlotSchema], default: [] },
    visitDurationMin: { type: Number },
    bestTime: { type: [String], enum: BestTime.options, default: [] },
    indoor: { type: Boolean },
    priceLevel: { type: Number, enum: [1, 2, 3, 4] },
    transport: { type: [String], enum: Transport.options, default: [] },
    practicalNotes: { type: String },
    contact: { phone: String, fanpage: String, website: String },
    ids: { googlePlaceId: String, osmId: String },
    photos: { type: [PhotoSchema], default: [] },
    status: { type: String, enum: PlaceStatus.options, required: true, default: 'draft' },
    mergedInto: { type: Schema.Types.ObjectId },
    lastVerifiedAt: { type: Date },
    verifySource: { type: String, enum: VerifySource.options },
    suspicionScore: { type: Number, default: 0 },
    source: { type: String, enum: PlaceSource.options, required: true },
    ownerId: { type: Schema.Types.ObjectId },
    vipTier: { type: String, enum: VipTier.options, default: 'free' },
    stampKey: { type: String },
    ratingAvg: { type: Number },
    ratingCount: { type: Number, default: 0 },
  },
  { collection: 'places', timestamps: true },
);

// Bảng index ở technical-design mục 3.
PlaceSchema.index({ location: '2dsphere' });
PlaceSchema.index({ cityId: 1, slug: 1 }, { unique: true });
PlaceSchema.index({ cityId: 1, category: 1, status: 1 });

export type PlaceDoc = InferSchemaType<typeof PlaceSchema>;
export type PlaceModel = Model<PlaceDoc>;
