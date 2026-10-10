import { Schema, type InferSchemaType, type Model } from 'mongoose';

export const CURATED_LIST_MODEL = 'CuratedList';
export const CuratedListSchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, required: true },
  slug: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  placeIds: { type: [Schema.Types.ObjectId], default: [] },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', required: true },
}, { collection: 'curated_lists', timestamps: true });
CuratedListSchema.index({ cityId: 1, slug: 1 }, { unique: true });
CuratedListSchema.index({ cityId: 1, status: 1, createdAt: -1 });
export type CuratedListDocument = InferSchemaType<typeof CuratedListSchema>;
export type CuratedListModel = Model<CuratedListDocument>;
