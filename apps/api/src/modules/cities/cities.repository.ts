import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CityInput, ZoneInput } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { CITY_MODEL, type CityModel } from './schemas/city.schema';
import { ZONE_MODEL, type ZoneModel } from './schemas/zone.schema';

interface UpsertResult {
  id: string;
  created: boolean;
}

/** Lớp dữ liệu của module cities: chỉ file này import model City và Zone. */
@Injectable()
export class CitiesRepository {
  constructor(
    @InjectModel(CITY_MODEL) private readonly cities: CityModel,
    @InjectModel(ZONE_MODEL) private readonly zones: ZoneModel,
  ) {}

  /** Tạo index khai báo trong schema; không xoá index lạ (khác syncIndexes). */
  async ensureIndexes(): Promise<void> {
    await Promise.all([this.cities.createIndexes(), this.zones.createIndexes()]);
  }

  /**
   * Upsert theo slug. Seed là nguồn của các trường cố định; seasons và active chỉ đặt khi tạo mới
   * để không ghi đè chỉnh sửa trong admin (S23).
   */
  async upsertCity(city: CityInput): Promise<UpsertResult> {
    const { seasons, active, ...fixed } = city;
    const res = await this.cities.updateOne(
      { slug: city.slug },
      { $set: fixed, $setOnInsert: { seasons, active } },
      { upsert: true },
    );
    if (res.upsertedId) return { id: res.upsertedId.toString(), created: true };
    const existing = await this.cities.findOne({ slug: city.slug }, { _id: 1 }).lean().orFail();
    return { id: existing._id.toString(), created: false };
  }

  /** Upsert theo {cityId, slug}; _id giữ nguyên khi cập nhật để Place.zoneId không gãy. */
  async upsertZone(cityId: string, zone: ZoneInput): Promise<UpsertResult> {
    const filter = { cityId: new Types.ObjectId(cityId), slug: zone.slug };
    const res = await this.zones.updateOne(filter, { $set: { name: zone.name, area: zone.area } }, { upsert: true });
    if (res.upsertedId) return { id: res.upsertedId.toString(), created: true };
    const existing = await this.zones.findOne(filter, { _id: 1 }).lean().orFail();
    return { id: existing._id.toString(), created: false };
  }

  async listZoneSlugs(cityId: string): Promise<string[]> {
    const docs = await this.zones.find({ cityId: new Types.ObjectId(cityId) }, { slug: 1 }).lean();
    return docs.map((d) => d.slug);
  }
}
