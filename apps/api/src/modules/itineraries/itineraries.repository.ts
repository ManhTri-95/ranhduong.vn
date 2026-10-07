import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { TemplateSummary } from './itinerary-card';
import { ITINERARY_MODEL, type ItineraryModel } from './schemas/itinerary.schema';

// Mongoose suy kiểu kết quả từ projection nhưng không hiểu đường dẫn lồng nhau, nên khai báo kiểu dòng đọc ra.
// Các trường đều tuỳ chọn: bản ghi có thể hỏng, service validate lại bằng ItineraryCard.
interface TemplateRow {
  _id: Types.ObjectId;
  slug?: string | null;
  title: string;
  params?: { days?: number; transport?: string; pace?: string } | null;
  days?: { stops?: { placeId: Types.ObjectId }[] }[];
}

/** Lớp dữ liệu của module itineraries: chỉ file này import model Itinerary. */
@Injectable()
export class ItinerariesRepository {
  constructor(@InjectModel(ITINERARY_MODEL) private readonly itineraries: ItineraryModel) {}

  /** Tạo index khai báo trong schema; không xoá index lạ. */
  async ensureIndexes(): Promise<void> {
    await this.itineraries.createIndexes();
  }

  /** Lịch trình mẫu đã công khai, có slug, của thành phố; mới tạo trước. */
  async listPublishedTemplates(cityId: string, limit: number): Promise<TemplateSummary[]> {
    const docs = await this.itineraries
      .find(
        { cityId: new Types.ObjectId(cityId), kind: 'template', status: 'published', slug: { $type: 'string' } },
        { slug: 1, title: 1, 'params.days': 1, 'params.transport': 1, 'params.pace': 1, 'days.stops.placeId': 1 },
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean<TemplateRow[]>();
    return docs.map((d) => ({
      id: d._id.toString(),
      slug: d.slug ?? undefined,
      title: d.title,
      days: d.params?.days,
      transport: d.params?.transport,
      pace: d.params?.pace,
      stopPlaceIds: (d.days ?? []).flatMap((day) => (day.stops ?? []).map((stop) => stop.placeId.toString())),
    }));
  }
}
