import { Injectable } from '@nestjs/common';
import type { PlaceListQuery, PlaceListResponse } from '@ranhduong/contracts';
import { CitiesService } from '../cities/cities.service';
import { compareFeatured, searchPlaces, toPlaceCard } from './place-listing';
import { PlacesRepository } from './places.repository';

@Injectable()
export class PlacesService {
  constructor(
    private readonly repo: PlacesRepository,
    private readonly cities: CitiesService,
  ) {}

  /** Dùng cho lệnh seed và khởi tạo môi trường mới; CRUD địa điểm thêm ở S05. */
  ensureIndexes(): Promise<void> {
    return this.repo.ensureIndexes();
  }

  /** GET /v1/cities/:city/places: có từ khoá thì xếp theo độ khớp, không có thì theo thứ tự nổi bật. */
  async list(citySlug: string, query: PlaceListQuery): Promise<PlaceListResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const [places, zoneNames] = await Promise.all([this.repo.listActive(city.id, query.category), this.cities.zoneNames(city.id)]);
    const ranked = query.q ? searchPlaces(places, query.q) : places.sort(compareFeatured);
    return { items: ranked.slice(0, query.limit).map((place) => toPlaceCard(place, zoneNames)) };
  }

  /** Ảnh bìa (ảnh đầu tiên) của các địa điểm active; dùng cho thẻ lịch trình. */
  coverKeys(placeIds: string[]): Promise<Map<string, string>> {
    return this.repo.coverKeys(placeIds);
  }
}
