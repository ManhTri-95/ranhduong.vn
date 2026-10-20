import { DalatZone } from '@ranhduong/contracts';
import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CitiesRepository } from '../modules/cities/cities.repository';
import { CitiesService } from '../modules/cities/cities.service';
import { CITY_MODEL, CitySchema, type CityModel } from '../modules/cities/schemas/city.schema';
import { ZONE_MODEL, ZoneSchema, type ZoneModel } from '../modules/cities/schemas/zone.schema';
import { connectTestDb, dropTestDb } from '../testing/mongo';
import { DA_LAT_SEED } from './da-lat';

describe('DA_LAT_SEED', () => {
  it('có đúng 4 cụm theo DalatZone', () => {
    expect(DA_LAT_SEED.zones.map((z) => z.slug).sort()).toEqual([...DalatZone.options].sort());
  });

  it('bảng kề đúng quyết định 19/10/2026, không ghép Bắc–Đông', () => {
    const graph = Object.fromEntries(DA_LAT_SEED.zones.map((z) => [z.slug, [...z.adjacentZones].sort()]));
    expect(graph).toEqual({
      'trung-tam': ['phia-bac', 'phia-dong', 'phia-nam'],
      'phia-nam': ['phia-dong', 'trung-tam'],
      'phia-bac': ['trung-tam'],
      'phia-dong': ['phia-nam', 'trung-tam'],
    });
  });

  describe('ghi vào MongoDB', () => {
    let conn: Connection;
    let cities: CityModel;
    let zones: ZoneModel;
    let service: CitiesService;

    beforeAll(async () => {
      conn = await connectTestDb();
      cities = conn.model(CITY_MODEL, CitySchema);
      zones = conn.model(ZONE_MODEL, ZoneSchema);
      service = new CitiesService(new CitiesRepository(cities, zones));
    });
    afterAll(async () => {
      await dropTestDb(conn);
    });

    it('chạy seed hai lần vẫn chỉ có 1 thành phố và 4 cụm có polygon', async () => {
      await service.applySeed(DA_LAT_SEED);
      const again = await service.applySeed(DA_LAT_SEED);
      expect(again).toMatchObject({ cityCreated: false, zonesCreated: 0, zonesUpdated: 4, staleZoneSlugs: [] });
      expect(await cities.countDocuments({ slug: 'da-lat' })).toBe(1);
      expect(await zones.countDocuments({ cityId: new Types.ObjectId(again.cityId), 'area.type': 'Polygon' })).toBe(4);
    });

    it('mỗi điểm trong khung bản đồ thuộc đúng một cụm (phủ kín, không khe, không chồng)', async () => {
      const [west, south, east, north] = DA_LAT_SEED.city.mapBounds;
      const steps = 14;
      const misses: string[] = [];
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < steps; j++) {
          // Lấy tâm từng ô lưới để điểm thử không rơi đúng lên cạnh chung giữa hai cụm.
          const lng = west + ((i + 0.5) * (east - west)) / steps;
          const lat = south + ((j + 0.5) * (north - south)) / steps;
          const point = { type: 'Point', coordinates: [lng, lat] };
          const hits = await zones.find({ area: { $geoIntersects: { $geometry: point } } }, { slug: 1 }).lean();
          if (hits.length !== 1) {
            misses.push(`[${lng.toFixed(4)}, ${lat.toFixed(4)}] → ${hits.map((h) => h.slug).join(', ') || 'không cụm nào'}`);
          }
        }
      }
      expect(misses).toEqual([]);
    });

    it('itineraryZones đọc lại bảng kề theo thứ tự seed; seed lại thì cập nhật', async () => {
      const { cityId } = await service.applySeed(DA_LAT_SEED);
      expect((await service.itineraryZones(cityId)).map((z) => [z.slug, z.adjacentZones.length])).toEqual([
        ['trung-tam', 3], ['phia-nam', 2], ['phia-bac', 1], ['phia-dong', 2],
      ]);
      const edited = { ...DA_LAT_SEED, zones: DA_LAT_SEED.zones.map((z) => ({ ...z, adjacentZones: [] })) };
      await service.applySeed(edited);
      expect((await service.itineraryZones(cityId)).every((z) => z.adjacentZones.length === 0)).toBe(true);
      await service.applySeed(DA_LAT_SEED); // trả lại bảng kề gốc cho các test sau
    });

    it('tâm thành phố nằm trong cụm Trung tâm', async () => {
      const hits = await zones
        .find({ area: { $geoIntersects: { $geometry: DA_LAT_SEED.city.center } } }, { slug: 1 })
        .lean();
      expect(hits.map((h) => h.slug)).toEqual(['trung-tam']);
    });
  });
});
