import { Injectable } from '@nestjs/common';
import { CitySeed, type CitySeedResult } from '@ranhduong/contracts';
import { CitiesRepository } from './cities.repository';

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
}
