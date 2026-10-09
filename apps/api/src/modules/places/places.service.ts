import { Injectable } from '@nestjs/common';
import type { PlaceDetailResponse, PlaceListQuery, PlaceListResponse } from '@ranhduong/contracts';
import { CitiesService } from '../cities/cities.service';
import { countTags, hasAllTags, pageByFeatured, searchPlaces, toPlaceCard, type ListedPlace } from './place-listing';
import { PlacesRepository } from './places.repository';
import { toPlaceDetail } from './place-detail';
import { placeNotFound } from './place-errors';

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

  async detail(citySlug: string, slug: string): Promise<PlaceDetailResponse> {
    const city = await this.cities.resolveCity(citySlug);
    let row = await this.repo.findDetail(city.id, slug);
    const visited = new Set<string>();
    while (row?.status === 'merged') {
      const id = row._id.toString();
      if (visited.has(id) || visited.size >= 20 || !row.mergedInto) throw placeNotFound();
      visited.add(id);
      row = await this.repo.findDetailById(city.id, row.mergedInto.toString());
    }
    if (!row || (row.status !== 'active' && row.status !== 'closed')) throw placeNotFound();
    const [nearby, zoneRefs] = await Promise.all([this.repo.nearby(city.id, row), this.cities.zones(city.id)]);
    const zones = new Map(zoneRefs.map((zone) => [zone.id, zone.name]));
    const zone = zoneRefs.find((zone) => zone.id === row.zoneId?.toString());
    return {
      place: toPlaceDetail(row, zone),
      nearby: nearby.map((place) => toPlaceCard({
        slug: place.slug, name: place.name, category: place.category,
        alsoCategories: place.alsoCategories ?? [], aliases: place.aliases ?? [], tags: place.tags ?? [],
        zoneId: place.zoneId?.toString(), practicalNotes: place.practicalNotes ?? undefined,
        openingHours: (place.openingHours ?? []).map(({ day, open, close }) => ({ day, open, close })),
        verifySource: place.verifySource ?? undefined, lastVerifiedAt: place.lastVerifiedAt ?? undefined,
        coverKey: toPlaceDetail(place).photos[0]?.key,
      }, zones)),
    };
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
