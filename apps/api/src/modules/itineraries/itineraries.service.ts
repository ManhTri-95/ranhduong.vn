import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ItineraryPublicStop, ItineraryTemplateDetail, ObjectIdString, TripDays } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApiException } from '../../shared/http/api-exception';
import type { ItineraryCard, ItineraryCardList, ItineraryTemplateQuery } from '@ranhduong/contracts';
import { SeasonItineraryOptions } from '@ranhduong/contracts';
import { CitiesService } from '../cities/cities.service';
import { PlacesService } from '../places/places.service';
import { ItinerariesRepository } from './itineraries.repository';
import { toItineraryCard } from './itinerary-card';

// Stored MongoDB rows may predate the editor or have been imported without validation.
const StoredStop = ItineraryPublicStop.omit({ key: true, number: true, place: true }).extend({
  placeId: z.preprocess((value) => value instanceof Types.ObjectId ? value.toString() : value, ObjectIdString),
  note: ItineraryPublicStop.shape.note.default(''), kind: ItineraryPublicStop.shape.kind.default('visit'),
  travelMinFromPrev: ItineraryPublicStop.shape.travelMinFromPrev.default(0),
});
const StoredSchedule = z.object({
  params: z.object({ days: TripDays }),
  days: z.array(z.object({ stops: z.array(StoredStop).max(20).default([]) })).max(5).default([]),
});

@Injectable()
export class ItinerariesService {
  async featuredTemplate(cityId: string, id: string): Promise<ItineraryCard | null> {
    const row = await this.repo.featuredTemplate(cityId, id);
    const schedule = StoredSchedule.safeParse(row);
    if (!row || !schedule.success) return null;
    const stopPlaceIds = schedule.data.days.flatMap((day) => day.stops.map((stop) => stop.placeId));
    const covers = await this.places.coverKeys([...new Set(stopPlaceIds)]);
    // Same card fields as the list (season chip, stopCount): promoteItinerary swaps the list copy for this one.
    return toItineraryCard({ id, slug: row.slug ?? undefined, title: row.title, days: row.params.days, transport: row.params.transport, pace: row.params.pace, season: row.season ?? undefined, stopPlaceIds }, covers);
  }

  async seasonOptions(cityId: string): Promise<SeasonItineraryOptions> {
    const ids = await this.repo.seasonTemplateIds(cityId);
    const cards = await Promise.all(ids.map(async (id) => {
      const card = await this.featuredTemplate(cityId, id);
      return card ? { ...card, id } : null;
    }));
    return { items: cards.filter((card) => card !== null) };
  }

  async sitemapSources(cityId: string, citySlug: string) {
    const sources = await this.repo.sitemapSources(cityId);
    const results = [];
    for (const source of sources) {
      try { await this.templateDetail(citySlug, source.slug); results.push(source); }
      catch (error) {
        if (!(error instanceof ApiException) || error.getStatus() !== 404) throw error;
      }
    }
    return results;
  }
  private readonly logger = new Logger(ItinerariesService.name);

  constructor(
    private readonly repo: ItinerariesRepository,
    private readonly cities: CitiesService,
    private readonly places: PlacesService,
  ) {}

  /** Dùng cho lệnh seed và khởi tạo môi trường mới. */
  ensureIndexes(): Promise<void> {
    return this.repo.ensureIndexes();
  }

  /** GET /v1/cities/:city/itineraries/templates. Bản hỏng bị bỏ qua và ghi log để sửa trong admin. */
  async listTemplates(citySlug: string, query: ItineraryTemplateQuery): Promise<ItineraryCardList> {
    const city = await this.cities.resolveCity(citySlug);
    const templates = await this.repo.listPublishedTemplates(city.id, query.limit);
    const covers = await this.places.coverKeys([...new Set(templates.flatMap((template) => template.stopPlaceIds))]);
    const items: ItineraryCard[] = [];
    for (const template of templates) {
      const card = toItineraryCard(template, covers);
      if (card) items.push(card);
      else this.logger.warn(`Bỏ qua lịch trình mẫu ${template.id}: dữ liệu không hợp lệ`);
    }
    return { items };
  }

  async templateDetail(citySlug: string, slug: string): Promise<ItineraryTemplateDetail> {
    const city = await this.cities.resolveCity(citySlug);
    const template = await this.repo.publishedTemplate(city.id, slug);
    const notFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy lịch trình');
    const schedule = StoredSchedule.safeParse(template);
    if (!template || !schedule.success) throw notFound();
    // The schedule is editorial: preserve saved times rather than recalculating against today's hours.
    const days = Array.from({ length: schedule.data.params.days }, (_, index) => ({
      day: index + 1, stops: schedule.data.days[index]?.stops ?? [],
    }));
    const ids = [...new Set(days.flatMap((day) => day.stops.map((stop) => stop.placeId)))];
    const places = await this.places.itineraryPlaces(city.id, ids);
    const result = ItineraryTemplateDetail.safeParse({
      slug: template.slug, title: template.title, description: template.description || template.narrative || '',
      season: template.season ?? '', style: template.style ?? '', seoTitle: template.seoTitle ?? '', seoDescription: template.seoDescription ?? '',
      transport: template.params.transport, pace: template.params.pace,
      days: days.map((day) => ({ day: day.day, stops: day.stops.map((stop, index) => ({
        key: `${day.day}-${index + 1}`, number: index + 1, start: stop.start, end: stop.end,
        travelMinFromPrev: stop.travelMinFromPrev, note: places.has(stop.placeId) ? stop.note : '', kind: stop.kind,
        place: places.get(stop.placeId) ?? null,
      })) })),
    });
    if (!result.success) {
      this.logger.warn(`Lịch trình mẫu ${slug}: lịch giờ không hợp lệ`);
      throw notFound();
    }
    return result.data;
  }
}
