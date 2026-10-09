import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PHOTO_CONTENT_TYPES, PhotoSource } from '@ranhduong/contracts';

export const MEDIA_UPLOAD_MODEL = 'MediaUpload';
export const MediaUploadSchema = new Schema({
  _id: { type: String, required: true },
  cityId: { type: String, required: true },
  placeId: { type: String, required: true },
  email: { type: String, required: true },
  key: { type: String, required: true },
  originalKey: { type: String, required: true },
  contentType: { type: String, enum: PHOTO_CONTENT_TYPES, required: true },
  size: { type: Number, required: true },
  source: { type: String, enum: PhotoSource.options, required: true },
  credit: { type: String, required: true },
  license: { type: String, required: true },
  sourceUrl: { type: String },
  status: { type: String, enum: ['pending', 'queued', 'ready', 'failed', 'deleted'], required: true },
  cleanedAt: { type: Date },
  message: { type: String },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, collection: 'media_uploads' });

export type MediaUploadRow = InferSchemaType<typeof MediaUploadSchema>;
export type MediaUploadModel = Model<MediaUploadRow>;
