import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Slug, TemplateEditInput, TripDays, type AdminTemplate, type TemplateAnalysis, type TemplatePlace } from '@ranhduong/contracts';
import type { TemplateSummary } from './itinerary-card';
import { ITINERARY_MODEL, type ItineraryDoc, type ItineraryModel } from './schemas/itinerary.schema';

type EditorRow = ItineraryDoc & { _id: Types.ObjectId };
export type TemplateRecord = Omit<AdminTemplate, 'analysis'>;
function editorSlug(row: EditorRow): string { return Slug.safeParse(row.slug).success ? row.slug! : `lich-trinh-${row._id}`; }
function toEditor(row: EditorRow): TemplateRecord | null {
  const legacyDayCount = TripDays.safeParse(row.params?.days);
  if (!legacyDayCount.success) return null;
  const sourceDays = row.days?.length ? row.days : Array.from({ length: legacyDayCount.data }, () => ({ startTime: '07:00', stops: [] }));
  const parsed = TemplateEditInput.safeParse({
    title: row.title, description: row.description ?? row.narrative ?? '', season: row.season ?? '', style: row.style ?? '',
    seoTitle: row.seoTitle ?? '', seoDescription: row.seoDescription ?? '', status: row.status ?? 'draft',
    transport: row.params.transport, pace: row.params.pace, startWeekday: row.params.startWeekday ?? 6,
    days: sourceDays.map((day, d) => ({ startTime: day.startTime ?? day.stops[0]?.start ?? '07:00', stops: day.stops.map((stop, s) => ({
      key: stop.key ?? `${row._id.toString().slice(0, 8)}-0000-4000-8000-${String(d * 20 + s).padStart(12, '0')}`,
      placeId: stop.placeId.toString(), kind: stop.kind ?? 'visit', note: stop.note ?? '', durationMin: stop.durationMin ?? undefined,
      manualStart: stop.manualStart ?? (!stop.key ? stop.start : undefined), manualEnd: stop.manualEnd ?? (!stop.key ? stop.end : undefined),
    })) })),
  });
  return parsed.success ? { ...parsed.data, id: row._id.toString(), cityId: row.cityId.toString(), slug: editorSlug(row) } : null;
}
function editorFields(input: TemplateEditInput, analysis: TemplateAnalysis, places: TemplatePlace[]) {
  const candidates = new Map(places.map((p) => [p.id, p]));
  return {
    title: input.title, description: input.description, narrative: input.description, season: input.season, style: input.style,
    seoTitle: input.seoTitle, seoDescription: input.seoDescription, status: input.status,
    params: { days: input.days.length, transport: input.transport, pace: input.pace, startWeekday: input.startWeekday, with: input.style, tags: [] },
    days: analysis.days.map((day) => ({ ...day,
      zoneIds: [...new Set(day.stops.flatMap((stop) => candidates.get(stop.placeId)?.zoneId ?? []))].map((id) => new Types.ObjectId(id)),
      stops: day.stops.map((stop) => ({ ...stop, placeId: new Types.ObjectId(stop.placeId), locked: Boolean(stop.manualStart || stop.manualEnd), isVip: false })),
    })),
  };
}

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

  async listForEditor(cityId: string): Promise<TemplateRecord[]> {
    return (await this.itineraries.find({ cityId: new Types.ObjectId(cityId), kind: 'template' }).sort({ updatedAt: -1, _id: -1 }).lean<EditorRow[]>()).flatMap((row) => { const record = toEditor(row); return record ? [record] : []; });
  }
  async findForEditor(id: string): Promise<TemplateRecord | null> {
    const row = await this.itineraries.findOne({ _id: new Types.ObjectId(id), kind: 'template' }).lean<EditorRow>();
    return row ? toEditor(row) : null;
  }
  async insertTemplate(cityId: string, slug: string, input: TemplateEditInput, analysis: TemplateAnalysis, places: TemplatePlace[]): Promise<TemplateRecord> {
    const row = await this.itineraries.create({ ...editorFields(input, analysis, places), cityId: new Types.ObjectId(cityId), kind: 'template', slug });
    return toEditor(row.toObject())!;
  }
  async updateTemplate(id: string, input: TemplateEditInput, analysis: TemplateAnalysis, places: TemplatePlace[], slug: string): Promise<TemplateRecord | null> {
    const row = await this.itineraries.findOneAndUpdate({ _id: new Types.ObjectId(id), kind: 'template' }, { $set: { ...editorFields(input, analysis, places), slug } }, { returnDocument: 'after', runValidators: true }).lean<EditorRow>();
    return row ? toEditor(row) : null;
  }
  async referencesPlace(id: string): Promise<boolean> {
    return (await this.itineraries.exists({ kind: 'template', 'days.stops.placeId': new Types.ObjectId(id) })) !== null;
  }

  async publishedTemplate(cityId: string, slug: string): Promise<ItineraryDoc | null> {
    return this.itineraries.findOne({
      cityId: new Types.ObjectId(cityId), slug, kind: 'template', status: 'published',
      visibility: { $ne: 'unlisted' },
    }).lean<ItineraryDoc>();
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
