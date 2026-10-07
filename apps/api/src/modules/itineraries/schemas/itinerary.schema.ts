import { ItineraryKind, ItineraryPace, ItineraryStatus, ItineraryTransport, ItineraryVisibility, StopKind } from '@ranhduong/contracts';
import { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PointSchema } from '../../../shared/db/geojson.schema';

export const ITINERARY_MODEL = 'Itinerary';

const StopSchema = new Schema(
  {
    placeId: { type: Schema.Types.ObjectId, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    travelMinFromPrev: { type: Number, default: 0 },
    locked: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    kind: { type: String, enum: StopKind.options, default: 'visit' },
  },
  { _id: false },
);

const DaySchema = new Schema(
  {
    day: { type: Number, required: true, min: 1 },
    zoneIds: { type: [Schema.Types.ObjectId], default: [] },
    stops: { type: [StopSchema], default: [] },
  },
  { _id: false },
);

const ParamsSchema = new Schema(
  {
    days: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    startDate: { type: String },
    transport: { type: String, enum: ItineraryTransport.options, required: true },
    with: { type: String },
    tags: { type: [String], default: [] },
    pace: { type: String, enum: ItineraryPace.options, required: true },
    stayLocation: { type: PointSchema },
  },
  { _id: false },
);

/**
 * Lịch trình (technical-design mục 3), thêm `status` cho lịch trình mẫu.
 * S09 chỉ đọc bản mẫu đã công khai. S15 thêm phần ghi và schema Zod cho form.
 */
export const ItinerarySchema = new Schema(
  {
    cityId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ItineraryKind.options, required: true },
    slug: { type: String },
    title: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId },
    guestId: { type: String },
    params: { type: ParamsSchema, required: true },
    paramsHash: { type: String },
    templateId: { type: Schema.Types.ObjectId },
    days: { type: [DaySchema], default: [] },
    narrative: { type: String },
    shareId: { type: String },
    visibility: { type: String, enum: ItineraryVisibility.options, default: 'public' },
    status: { type: String, enum: ItineraryStatus.options, default: 'draft' },
  },
  { collection: 'itineraries', timestamps: true },
);

// URL /{city}/lich-trinh/{slug} (ADR 0010). Lịch trình của khách không có slug nên không bị ràng buộc.
// Index {paramsHash} và {shareId} thêm ở lát 2, khi có tạo và chia sẻ lịch trình.
ItinerarySchema.index({ cityId: 1, kind: 1, slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' } } });

export type ItineraryDoc = InferSchemaType<typeof ItinerarySchema>;
export type ItineraryModel = Model<ItineraryDoc>;
