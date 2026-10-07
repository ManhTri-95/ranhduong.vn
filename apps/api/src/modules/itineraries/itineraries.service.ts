import { Injectable, Logger } from '@nestjs/common';
import type { ItineraryCard, ItineraryCardList, ItineraryTemplateQuery } from '@ranhduong/contracts';
import { CitiesService } from '../cities/cities.service';
import { PlacesService } from '../places/places.service';
import { ItinerariesRepository } from './itineraries.repository';
import { toItineraryCard } from './itinerary-card';

@Injectable()
export class ItinerariesService {
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
}
