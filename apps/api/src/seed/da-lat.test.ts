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

    it('các cụm không chồng lên nhau (mỗi điểm trên bản đồ thuộc tối đa một cụm)', async () => {
      for (const zone of DA_LAT_SEED.zones) {
        const hits = await zones.find({ area: { $geoIntersects: { $geometry: zone.area } } }, { slug: 1 }).lean();
        expect(hits.map((h) => h.slug), zone.slug).toEqual([zone.slug]);
      }
    });

    it('tâm thành phố nằm trong cụm Trung tâm', async () => {
      const hits = await zones
        .find({ area: { $geoIntersects: { $geometry: DA_LAT_SEED.city.center } } }, { slug: 1 })
        .lean();
      expect(hits.map((h) => h.slug)).toEqual(['trung-tam']);
    });
  });
});
