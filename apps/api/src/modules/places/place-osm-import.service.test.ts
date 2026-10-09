import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CitiesRepository } from '../cities/cities.repository';
import { CitiesService } from '../cities/cities.service';
import { CITY_MODEL, CitySchema } from '../cities/schemas/city.schema';
import { ZONE_MODEL, ZoneSchema } from '../cities/schemas/zone.schema';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { PlaceOsmImportService } from './place-osm-import.service';
import { PlacesRepository } from './places.repository';
import { PLACE_MODEL, PlaceSchema, type PlaceModel } from './schemas/place.schema';

const CITY = 'thanh-pho-gia-lap';
const NODE = { type: 'node', id: 123, lat: 0.2, lon: 0.2, tags: { name: 'Cà phê Giả Lập', amenity: 'cafe' } };
const response = (...elements: unknown[]) => ({ elements });

describe('PlaceOsmImportService with MongoDB', () => {
  let conn: Connection;
  let places: PlaceModel;
  let repo: PlacesRepository;
  let service: PlaceOsmImportService;
  let cityId: string;
  beforeAll(async () => {
    conn = await connectTestDb();
    places = conn.model(PLACE_MODEL, PlaceSchema);
    await places.createCollection();
    repo = new PlacesRepository(places);
    const cities = new CitiesService(new CitiesRepository(conn.model(CITY_MODEL, CitySchema), conn.model(ZONE_MODEL, ZoneSchema)));
    cityId = (await cities.applySeed(fakeCitySeed())).cityId;
    service = new PlaceOsmImportService(repo, cities);
  });
  beforeEach(async () => { await places.deleteMany({}); });
  afterAll(async () => { await dropTestDb(conn); });

  it('creates only drafts with provenance and typed OSM IDs; a rerun creates zero', async () => {
    expect(await service.run(CITY, response(NODE))).toEqual({ received: 1, created: 1, wouldCreate: 0, existing: 0, skipped: 0, dryRun: false });
    expect(await service.run(CITY, response(NODE))).toMatchObject({ created: 0, existing: 1 });
    const place = await places.findOne().lean().orFail();
    expect(place).toMatchObject({ cityId: new Types.ObjectId(cityId), slug: 'ca-phe-gia-lap', source: 'admin', status: 'draft', ids: { osmId: 'node/123' }, nameNorm: 'gia lap', location: { type: 'Point', coordinates: [0.2, 0.2] }, openingHours: [], photos: [] });
    expect(place.verifySource).toBeUndefined();
    expect(place.zoneId).toBeUndefined();
    expect(place.priceLevel).toBeUndefined();
  });

  it.each(['draft', 'active', 'closed', 'merged'])('preserves an edited %s place including timestamps', async (status) => {
    const saved = await new places(fakePlaceDoc(cityId, { ids: { osmId: 'node/123' }, status, name: 'Tên Đã Sửa Giả Lập', practicalNotes: 'Ghi chú Giả Lập', updatedAt: new Date('2020-01-01') })).save();
    const before = await places.findById(saved._id).lean();
    expect(await service.run(CITY, response({ ...NODE, tags: { ...NODE.tags, name: 'Tên OSM Đã Đổi Giả Lập' } }))).toMatchObject({ created: 0, existing: 1 });
    expect(await places.findById(saved._id).lean()).toEqual(before);
  });

  it('concurrent imports of one OSM ID create exactly one document', async () => {
    await repo.ensureIndexes();
    const results = await Promise.all(Array.from({ length: 8 }, () => service.run(CITY, response(NODE))));
    expect(results.reduce((sum, result) => sum + result.created, 0)).toBe(1);
    expect(await places.countDocuments()).toBe(1);
  });

  it('keeps node/way/relation IDs distinct and resolves simultaneous same-name slug collisions', async () => {
    const results = await Promise.all(['node', 'way', 'relation'].map((type) => service.run(CITY, response({ ...NODE, type, center: { lat: 0.2, lon: 0.2 } }))));
    expect(results.reduce((sum, result) => sum + result.created, 0)).toBe(3);
    expect((await places.find().lean()).map((p) => p.slug).sort()).toEqual(['ca-phe-gia-lap', 'ca-phe-gia-lap-2', 'ca-phe-gia-lap-3']);
  });

  it('reserves historic slugs and allows places without OSM IDs', async () => {
    await new places(fakePlaceDoc(cityId, { slug: 'ten-da-doi-gia-lap', slugHistory: ['ca-phe-gia-lap'] })).save();
    await new places(fakePlaceDoc(cityId, { slug: 'quan-khac-gia-lap' })).save();
    await service.run(CITY, response(NODE));
    expect(await places.findOne({ 'ids.osmId': 'node/123' }).lean()).toMatchObject({ slug: 'ca-phe-gia-lap-2' });
    await expect(new places(fakePlaceDoc(cityId, { slug: 'thu-trung-osm-gia-lap', ids: { osmId: 'node/123' } })).save()).rejects.toMatchObject({ code: 11000 });
    await expect(new places(fakePlaceDoc(new Types.ObjectId().toString(), { ids: { osmId: 'node/123' } })).save()).resolves.toBeDefined();
  });

  it('skips bad/unnamed/out-of-bounds entries and duplicates within the same response', async () => {
    expect(await service.run(CITY, response(NODE, NODE, { ...NODE, id: 124, lon: 2 }, { type: 'node', id: 125 }, null))).toMatchObject({ received: 5, created: 1, existing: 1, skipped: 3 });
  });

  it('dry run counts prospective drafts without inserting or creating indexes', async () => {
    await places.collection.dropIndexes();
    const indexes = await places.listIndexes();
    expect(await service.run(CITY, response(NODE, NODE), true)).toMatchObject({ created: 0, wouldCreate: 1, existing: 1, dryRun: true });
    expect(await places.countDocuments()).toBe(0);
    expect(await places.listIndexes()).toEqual(indexes);
  });

  it('rejects partial responses before writing anything', async () => {
    await expect(service.run(CITY, { elements: [NODE], remark: 'runtime error: timeout' })).rejects.toThrow(/Overpass/);
    expect(await places.countDocuments()).toBe(0);
  });

  it('rejects an unknown city instead of placing data under another city', async () => {
    await expect(service.run('khong-co-gia-lap', response(NODE))).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    expect(await places.countDocuments()).toBe(0);
  });
});
