import { Injectable } from '@nestjs/common';
import type { PlaceListQuery, PlaceListResponse } from '@ranhduong/contracts';
import { CitiesService } from '../cities/cities.service';
import { countTags, hasAllTags, pageByFeatured, searchPlaces, toPlaceCard, type ListedPlace } from './place-listing';
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

  /**
   * GET /v1/cities/:city/places. Lọc thành phố, danh mục, cụm trong DB; thẻ, từ khoá, phân trang trong bộ nhớ
   * (vài trăm điểm mỗi thành phố). `tags` đếm trên tập chưa lọc thẻ để trang danh mục luôn hiện đủ chip.
   * Có từ khoá thì xếp theo độ khớp, không phân trang; không có thì theo thứ tự nổi bật, phân trang bằng cursor.
   */
  async list(citySlug: string, query: PlaceListQuery): Promise<PlaceListResponse> {
    const city = await this.cities.resolveCity(citySlug);
    const zone = query.zone ? await this.cities.resolveZone(city.id, query.zone) : undefined;
    const [places, zoneNames] = await Promise.all([
      this.repo.listActive(city.id, { categories: query.category, zoneId: zone?.id }),
      this.cities.zoneNames(city.id),
    ]);
    const wanted = query.tags ?? [];
    const filtered = places.filter((place) => hasAllTags(place, wanted));
    const toCard = (place: ListedPlace) => toPlaceCard(place, zoneNames);
    const tags = countTags(places);
    if (query.q) return { items: searchPlaces(filtered, query.q).slice(0, query.limit).map(toCard), tags };
    const page = pageByFeatured(filtered, query.cursor, query.limit);
    return { items: page.items.map(toCard), nextCursor: page.nextCursor, tags };
  }

  /** Ảnh bìa (ảnh đầu tiên) của các địa điểm active; dùng cho thẻ lịch trình. */
  coverKeys(placeIds: string[]): Promise<Map<string, string>> {
    return this.repo.coverKeys(placeIds);
  }
}
