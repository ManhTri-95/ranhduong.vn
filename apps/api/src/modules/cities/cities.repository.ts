import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { GeoPolygon, type CityInput, type LngLat, type ZoneInput } from '@ranhduong/contracts';
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

  /** Thành phố đang hoạt động theo slug; null nếu không có hoặc đã tắt. */
  async findActiveBySlug(slug: string) {
    const doc = await this.cities.findOne({ slug, active: true }, { slug: 1, name: 1, accent: 1, center: 1, mapBounds: 1 }).lean();
    if (!doc) return null;
    return { id: doc._id.toString(), slug: doc.slug, name: doc.name, accent: doc.accent, center: doc.center, mapBounds: doc.mapBounds };
  }

  /** Các cụm của thành phố theo thứ tự tạo, tức thứ tự trong file seed. */
  async listZones(cityId: string): Promise<{ id: string; slug: string; name: string }[]> {
    const docs = await this.zones.find({ cityId: new Types.ObjectId(cityId) }, { slug: 1, name: 1 }).sort({ _id: 1 }).lean();
    return docs.map((d) => ({ id: d._id.toString(), slug: d.slug, name: d.name }));
  }

  /** Polygon các cụm của thành phố theo thứ tự seed, để gợi ý cụm khi ghim. */
  async listZoneAreas(cityId: string): Promise<{ slug: string; name: string; rings: LngLat[][] }[]> {
    const docs = await this.zones.find({ cityId: new Types.ObjectId(cityId) }, { slug: 1, name: 1, area: 1 }).sort({ _id: 1 }).lean();
    // Cụm đã qua CitySeed khi ghi; parse lại để có kiểu [lng, lat].
    return docs.map((d) => ({ slug: d.slug, name: d.name, rings: GeoPolygon.parse(d.area).coordinates }));
  }

  /** Cụm theo slug trong một thành phố; null nếu không có. */
  async findZone(cityId: string, slug: string): Promise<{ id: string; slug: string; name: string } | null> {
    const doc = await this.zones.findOne({ cityId: new Types.ObjectId(cityId), slug }, { slug: 1, name: 1 }).lean();
    return doc ? { id: doc._id.toString(), slug: doc.slug, name: doc.name } : null;
  }
}
