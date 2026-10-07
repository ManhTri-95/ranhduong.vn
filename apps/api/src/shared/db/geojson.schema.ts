import { Schema } from 'mongoose';

/** GeoJSON Point { type: 'Point', coordinates: [lng, lat] }; index 2dsphere khai báo ở schema dùng nó. */
export const PointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

/** GeoJSON Polygon: mảng vòng kín, mỗi vòng là mảng [lng, lat]. */
export const PolygonSchema = new Schema(
  {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
  { _id: false },
);
