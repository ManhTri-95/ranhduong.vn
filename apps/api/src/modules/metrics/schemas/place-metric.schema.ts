import { Schema, type InferSchemaType, type Model } from 'mongoose';
export const PLACE_METRIC_MODEL = 'PlaceMetric';
export const PlaceMetricSchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, required: true }, placeId: { type: Schema.Types.ObjectId, required: true }, dayKey: { type: String, required: true },
  views: { type: Number, default: 0 }, directionClicks: { type: Number, default: 0 }, calls: { type: Number, default: 0 }, fanpageClicks: { type: Number, default: 0 },
}, { collection: 'place_metrics', timestamps: true });
PlaceMetricSchema.index({ placeId: 1, dayKey: 1 }, { unique: true });
PlaceMetricSchema.index({ cityId: 1, dayKey: 1 });
export type PlaceMetricModel = Model<InferSchemaType<typeof PlaceMetricSchema>>;
