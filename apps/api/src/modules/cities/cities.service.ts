import { HttpStatus, Injectable } from '@nestjs/common';
import { CityPublic, CitySeed, type CityRef, type CitySeedResult } from '@ranhduong/contracts';
import { ApiException } from '../../shared/http/api-exception';
import { CitiesRepository } from './cities.repository';

const cityNotFound = () => new ApiException('NOT_FOUND', HttpStatus.NOT_FOUND, 'Không tìm thấy thành phố');

@Injectable()
export class CitiesService {
  constructor(private readonly repo: CitiesRepository) {}

  /**
   * Ghi dữ liệu seed của một thành phố; chạy lại hay chạy song song cũng không tạo trùng.
   * - Validate toàn bộ seed bằng CitySeed trước khi ghi bất cứ thứ gì.
   * - Tạo index trước (unique {slug} cho city, {cityId, slug} cho zone) để upsert đồng thời không sinh bản trùng.
   * - Upsert theo slug nên _id giữ nguyên, Place.zoneId không bị gãy.
   * - Cụm có trong DB mà không còn trong seed không bị xoá (Place có thể đang trỏ tới), chỉ báo trong staleZoneSlugs.
   */
  async applySeed(input: unknown): Promise<CitySeedResult> {
    const seed = CitySeed.parse(input);
    await this.repo.ensureIndexes();
    const city = await this.repo.upsertCity(seed.city);
    let zonesCreated = 0;
    let zonesUpdated = 0;
    for (const zone of seed.zones) {
      const { created } = await this.repo.upsertZone(city.id, zone);
      if (created) zonesCreated++;
      else zonesUpdated++;
    }
    const seedSlugs = new Set(seed.zones.map((z) => z.slug));
    const staleZoneSlugs = (await this.repo.listZoneSlugs(city.id)).filter((slug) => !seedSlugs.has(slug)).sort();
    return { cityId: city.id, cityCreated: city.created, zonesCreated, zonesUpdated, staleZoneSlugs };
  }

  /** Thành phố đang hoạt động theo slug; không có hoặc đã tắt thì 404 NOT_FOUND. */
  async resolveCity(slug: string): Promise<CityRef> {
    const city = await this.repo.findActiveBySlug(slug);
    if (!city) throw cityNotFound();
    return { id: city.id, slug: city.slug, name: city.name };
  }

  /** zoneId → tên cụm, để thẻ địa điểm hiện "Cà phê · Trung tâm". */
  async zoneNames(cityId: string): Promise<Map<string, string>> {
    const zones = await this.repo.listZones(cityId);
    return new Map(zones.map((zone) => [zone.id, zone.name]));
  }

  /** GET /v1/cities/:city: parse lại bằng CityPublic để chỉ trả đúng các trường công khai. */
  async getPublic(slug: string): Promise<CityPublic> {
    const city = await this.repo.findActiveBySlug(slug);
    if (!city) throw cityNotFound();
    const zones = await this.repo.listZones(city.id);
    return CityPublic.parse({ ...city, zones: zones.map(({ slug: zoneSlug, name }) => ({ slug: zoneSlug, name })) });
  }
}
