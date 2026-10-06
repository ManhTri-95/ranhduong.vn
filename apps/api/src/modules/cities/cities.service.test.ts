import { CitySeed } from '@ranhduong/contracts';
import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { CitiesRepository } from './cities.repository';
import { CitiesService } from './cities.service';
import { CITY_MODEL, CitySchema, type CityModel } from './schemas/city.schema';
import { ZONE_MODEL, ZoneSchema, type ZoneModel } from './schemas/zone.schema';

const square = (w: number, s: number, e: number, n: number) => ({
  type: 'Polygon',
  coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
});

const ZONE_A = { slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A', area: square(0.1, 0.1, 0.4, 0.4) };
const ZONE_B = { slug: 'cum-gia-lap-b', name: 'Cụm Giả Lập B', area: square(0.6, 0.6, 0.9, 0.9) };

// Thành phố và cụm giả lập quanh [0, 0], tên rõ là giả.
function fakeSeed(zones: unknown[] = [ZONE_A, ZONE_B]): CitySeed {
  return CitySeed.parse({
    city: {
      slug: 'thanh-pho-gia-lap',
      name: 'Thành phố Giả Lập',
      center: { type: 'Point', coordinates: [0.5, 0.5] },
      timezone: 'Asia/Ho_Chi_Minh',
      active: true,
      accent: '#123456',
      mapBounds: [0, 0, 1, 1],
    },
    zones,
  });
}

describe('CitiesService.applySeed', () => {
  let conn: Connection;
  let cities: CityModel;
  let zones: ZoneModel;
  let service: CitiesService;

  const zoneIds = async () =>
    (await zones.find({}, { slug: 1 }).sort({ slug: 1 }).lean()).map((z) => `${z.slug}:${z._id.toString()}`);

  beforeAll(async () => {
    conn = await connectTestDb();
    cities = conn.model(CITY_MODEL, CitySchema);
    zones = conn.model(ZONE_MODEL, ZoneSchema);
    service = new CitiesService(new CitiesRepository(cities, zones));
  });
  afterAll(async () => {
    await dropTestDb(conn);
  });
  // Mỗi test bắt đầu từ DB trống, chưa có index: applySeed phải tự tạo index.
  beforeEach(async () => {
    await conn.dropDatabase();
  });

  it('lần đầu tạo thành phố, các cụm và index', async () => {
    const result = await service.applySeed(fakeSeed());
    expect(result).toMatchObject({ cityCreated: true, zonesCreated: 2, zonesUpdated: 0, staleZoneSlugs: [] });
    expect(result.cityId).toMatch(/^[0-9a-f]{24}$/);
    expect(await cities.countDocuments()).toBe(1);
    expect(await zones.countDocuments({ cityId: new Types.ObjectId(result.cityId) })).toBe(2);

    const cityIndexes = new Map((await cities.listIndexes()).map((i) => [i.name, i]));
    expect(cityIndexes.get('slug_1')).toMatchObject({ key: { slug: 1 }, unique: true });
    const zoneIndexes = new Map((await zones.listIndexes()).map((i) => [i.name, i]));
    expect(zoneIndexes.get('cityId_1_slug_1')).toMatchObject({ key: { cityId: 1, slug: 1 }, unique: true });
    expect(zoneIndexes.get('area_2dsphere')?.key).toEqual({ area: '2dsphere' });
  });

  it('chạy lại không tạo trùng và giữ nguyên _id (Place.zoneId không gãy)', async () => {
    const first = await service.applySeed(fakeSeed());
    const before = await zoneIds();
    const second = await service.applySeed(fakeSeed());
    expect(second).toEqual({
      cityId: first.cityId,
      cityCreated: false,
      zonesCreated: 0,
      zonesUpdated: 2,
      staleZoneSlugs: [],
    });
    expect(await cities.countDocuments()).toBe(1);
    expect(await zones.countDocuments()).toBe(2);
    expect(await zoneIds()).toEqual(before);
  });

  it('cập nhật tên và polygon của cụm khi file seed đổi', async () => {
    await service.applySeed(fakeSeed());
    await service.applySeed(fakeSeed([{ ...ZONE_A, name: 'Cụm Giả Lập A mới', area: square(0.1, 0.1, 0.3, 0.3) }, ZONE_B]));
    const a = await zones.findOne({ slug: 'cum-gia-lap-a' }).lean().orFail();
    expect(a.name).toBe('Cụm Giả Lập A mới');
    expect(a.area.coordinates[0]?.[2]).toEqual([0.3, 0.3]);
  });

  it('không ghi đè seasons và active đã sửa trong admin', async () => {
    await service.applySeed(fakeSeed());
    const season = {
      key: 'mua-gia-lap',
      from: '01-01',
      to: '01-31',
      accent: '#654321',
      title: 'Mùa giả lập',
      sub: 'Mô tả giả lập',
      illustration: 'gia-lap',
    };
    await cities.updateOne({ slug: 'thanh-pho-gia-lap' }, { $set: { active: false, seasons: [season] } });
    await service.applySeed(fakeSeed());
    const city = await cities.findOne({ slug: 'thanh-pho-gia-lap' }).lean().orFail();
    expect(city.active).toBe(false);
    expect(city.seasons).toMatchObject([season]);
  });

  it('cụm bị bỏ khỏi seed vẫn giữ trong DB và được báo lại', async () => {
    await service.applySeed(fakeSeed());
    const result = await service.applySeed(fakeSeed([ZONE_A]));
    expect(result.staleZoneSlugs).toEqual(['cum-gia-lap-b']);
    expect(await zones.countDocuments()).toBe(2);
  });

  it('seed sai (polygon chưa khép) thì báo lỗi và không ghi gì', async () => {
    const openRing = [[0.1, 0.1], [0.4, 0.1], [0.4, 0.4], [0.1, 0.4]];
    const invalid = { ...fakeSeed(), zones: [{ ...ZONE_A, area: { type: 'Polygon', coordinates: [openRing] } }] };
    await expect(service.applySeed(invalid)).rejects.toThrow(/trùng điểm đầu/);
    expect(await cities.countDocuments()).toBe(0);
  });

  it('hai lần seed chạy cùng lúc vẫn chỉ có một thành phố và đủ cụm', async () => {
    await Promise.all([service.applySeed(fakeSeed()), service.applySeed(fakeSeed()), service.applySeed(fakeSeed())]);
    expect(await cities.countDocuments()).toBe(1);
    expect(await zones.countDocuments()).toBe(2);
  });

  it('cụm trùng {cityId, slug} bị unique index chặn', async () => {
    const { cityId } = await service.applySeed(fakeSeed());
    // Ghi qua new Model().save() vì kiểu của Model.create() chỉ nhận enum literal đã suy ra từ schema.
    const duplicate: Record<string, unknown> = {
      cityId: new Types.ObjectId(cityId),
      slug: 'cum-gia-lap-a',
      name: 'Bản trùng giả lập',
      area: square(0.1, 0.1, 0.2, 0.2),
    };
    await expect(new zones(duplicate).save()).rejects.toMatchObject({ code: 11000 });
  });

  it('DB đã có hai thành phố trùng slug thì seed dừng với lỗi E11000, không ghi cụm', async () => {
    await conn.collection('cities').insertMany([{ slug: 'thanh-pho-gia-lap' }, { slug: 'thanh-pho-gia-lap' }]);
    await expect(service.applySeed(fakeSeed())).rejects.toMatchObject({ code: 11000 });
    expect(await zones.countDocuments()).toBe(0);
  });
});
