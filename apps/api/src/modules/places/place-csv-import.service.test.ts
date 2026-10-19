import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CitiesRepository } from '../cities/cities.repository';
import { CitiesService } from '../cities/cities.service';
import { CITY_MODEL, CitySchema } from '../cities/schemas/city.schema';
import { ZONE_MODEL, ZoneSchema } from '../cities/schemas/zone.schema';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { PlaceCsvImportService } from './place-csv-import.service';
import { PlacesRepository } from './places.repository';
import { PLACE_MODEL, PlaceSchema, type PlaceModel } from './schemas/place.schema';

const CITY = 'thanh-pho-gia-lap';
const csv = (values = 'D1,Quán Giả Lập,cafe,Đã xác nhận,no', extra = '') => `id,name,category,status,imported${extra}\n${values}`;
const selection = (row = 2, allowDuplicate = false) => ({ row, allowDuplicate });

describe('S21 CSV import with MongoDB', () => {
  let conn: Connection;
  let places: PlaceModel;
  let service: PlaceCsvImportService;
  let cities: CitiesService;
  let cityId: string;
  beforeAll(async () => {
    conn = await connectTestDb();
    places = conn.model(PLACE_MODEL, PlaceSchema);
    const repo = new PlacesRepository(places);
    cities = new CitiesService(new CitiesRepository(conn.model(CITY_MODEL, CitySchema), conn.model(ZONE_MODEL, ZoneSchema)));
    cityId = (await cities.applySeed(fakeCitySeed())).cityId;
    await repo.ensureIndexes();
    service = new PlaceCsvImportService(repo, cities);
  });
  beforeEach(async () => { await places.deleteMany({}); });
  afterAll(async () => { await dropTestDb(conn); });
  const run = (input: string, selections = [selection()]) => service.run(CITY, { csv: input, selections });

  it('previews without writing, imports current schema/provenance only as drafts, and preserves missing data', async () => {
    const input = csv('D1,Nhà GIẢ,stay,Đăng chưa xác nhận,no,food;shop,partial,https://example.com', ',also_category,cover,website');
    expect((await service.preview(CITY, { csv: input })).rows[0]).toMatchObject({ status: 'ready' });
    expect(await places.countDocuments()).toBe(0);
    expect((await run(input)).rows[0]).toMatchObject({ status: 'created', placeId: expect.any(String) });
    const saved = await places.findOne().lean().orFail();
    expect(saved).toMatchObject({ status: 'draft', source: 'admin', verifySource: 'admin', category: 'stay', alsoCategories: ['food', 'shop'], cover: 'partial', contact: { website: 'https://example.com' }, photos: [], openingHours: [], cityId: new Types.ObjectId(cityId) });
    expect(saved.location).toBeUndefined();
    expect(saved.lastVerifiedAt).toBeUndefined();
  });

  it('skips ineligible/imported rows, reports validation/unknown zones, and permits other valid rows', async () => {
    const input = csv('D1,,bad,Đã nhắn,no,\nD2,,bad,Đã xác nhận,yes,\nD3,Giả Lập,cafe,Đã xác nhận,no,khong-co\nD4,Giả Lập,cafe,Đã xác nhận,no,\nD5,,cafe,Đã xác nhận,no,', ',zone');
    const rows = (await service.preview(CITY, { csv: input })).rows;
    expect(rows.map((row) => row.status)).toEqual(['skipped', 'skipped', 'error', 'ready', 'error']);
    expect(rows[2]?.issues[0]).toMatchObject({ column: 'zone', fix: expect.any(String) });
    expect((await run(input, [selection(5)])).rows[0]?.status).toBe('created');
    expect(await places.countDocuments()).toBe(1);
  });

  it('repeated imports and changed Sheet values never update an existing place or its timestamp', async () => {
    const input = csv();
    await run(input);
    const original = await places.findOne().lean().orFail();
    await places.updateOne({ _id: original._id }, { $set: { name: 'ĐÃ SỬA GIẢ', status: 'hidden' } });
    const edited = await places.findById(original._id).lean();
    expect((await run(csv('D1,Tên mới Giả,food,Đăng chưa xác nhận,no'))).rows[0]?.status).toBe('existing');
    expect(await places.findById(original._id).lean()).toEqual(edited);
    expect(await places.countDocuments()).toBe(1);
  });

  it.each(['draft', 'active', 'closed', 'merged'])('skips an OSM identity already present in a %s place even with force', async (status) => {
    const saved = await new places(fakePlaceDoc(cityId, { ids: { osmId: 'node/123' }, status })).save();
    expect((await run(csv('D1,Giả Lập,cafe,Đã xác nhận,no,node/123', ',osm_id'), [selection(2, true)])).rows[0]).toMatchObject({ status: 'existing', placeId: saved._id.toString() });
    expect(await places.countDocuments()).toBe(1);
  });

  it('matches normalized phone numbers and retains old import identities after admin edits', async () => {
    await new places(fakePlaceDoc(cityId, { contact: { phone: '0912 345 678' } })).save();
    expect((await run(csv('D1,Giả Lập,cafe,Đã xác nhận,no,+84912345678', ',phone'))).rows[0]?.status).toBe('existing');
    await places.deleteMany({});
    const input = csv('D1,Giả Lập,cafe,Đã xác nhận,no,0912345678', ',phone');
    await run(input);
    await places.updateOne({}, { $set: { contact: { phone: '+84987654321' } } });
    expect((await run(csv('D2,Giả Khác,food,Đã xác nhận,no,0912345678', ',phone'))).rows[0]?.status).toBe('existing');
    expect(await places.countDocuments()).toBe(1);
  });

  it('retries exact content without any source identifiers safely', async () => {
    const input = 'name,category,status\nGiả Lập,cafe,Đã xác nhận';
    expect((await run(input)).rows[0]?.status).toBe('created');
    expect((await run(input)).rows[0]?.status).toBe('existing');
  });

  it('flags suspected matches against the database and requires an explicit override', async () => {
    await new places(fakePlaceDoc(cityId, { name: 'Cà phê Hư Cấu GIẢ', location: { type: 'Point', coordinates: [0.2, 0.2] } })).save();
    const input = csv('D1,Cà phê Hư Cấu GIẢ,cafe,Đã xác nhận,no,"0.2,0.2"', ',latlng');
    expect((await service.preview(CITY, { csv: input })).rows[0]).toMatchObject({ status: 'duplicate', matches: [expect.objectContaining({ name: 'Cà phê Hư Cấu GIẢ', placeId: expect.any(String) })] });
    expect((await run(input)).rows[0]?.status).toBe('duplicate');
    expect((await run(input, [selection(2, true)])).rows[0]?.status).toBe('created');
    expect(await places.countDocuments()).toBe(2);
  });

  it.each(['missing', 'null'])('can review duplicates against a legacy record with %s aliases', async (kind) => {
    const saved = await new places(fakePlaceDoc(cityId, { name: 'Cà phê Hư Cấu GIẢ' })).save();
    await places.collection.updateOne({ _id: saved._id }, kind === 'missing' ? { $unset: { aliases: '' } } : { $set: { aliases: null } });
    const input = csv('D1,Cà phê Hư Cấu GIẢ,cafe,Đã xác nhận,no,"0.2,0.2"', ',latlng');
    const preview = (await service.preview(CITY, { csv: input })).rows[0];
    expect(preview).toMatchObject({ status: 'duplicate', preview: { sheetId: 'D1', place: { location: { type: 'Point', coordinates: [0.2, 0.2] } } } });
    expect((await run(input)).rows[0]?.status).toBe('duplicate');
    expect(await places.countDocuments()).toBe(1);
  });

  it('detects exact identifiers and suspected duplicates within a file', async () => {
    const input = csv('D1,Cà phê Hư Cấu GIẢ,cafe,Đã xác nhận,no,"0.2,0.2"\nD1,Tên đổi GIẢ,cafe,Đã xác nhận,no,\nD3,Cà phê Hư Cấu GIẢ,cafe,Đã xác nhận,no,"0.2,0.2"', ',latlng');
    const rows = (await service.preview(CITY, { csv: input })).rows;
    expect(rows.map((row) => row.status)).toEqual(['ready', 'existing', 'duplicate']);
    expect(rows[2]?.matches).toEqual([expect.objectContaining({ row: 2, name: 'Cà phê Hư Cấu GIẢ' })]);
    expect((await run(input, [selection(2), selection(3, true), selection(4, true)])).rows.map((row) => row.status)).toEqual(['created', 'existing', 'created']);
    expect(await places.countDocuments()).toBe(2);
  });

  it('rechecks rows after preview if a place was added meanwhile', async () => {
    const input = csv('D1,Cà phê Hư Cấu GIẢ,cafe,Đã xác nhận,no,"0.2,0.2"', ',latlng');
    expect((await service.preview(CITY, { csv: input })).rows[0]?.status).toBe('ready');
    await new places(fakePlaceDoc(cityId, { name: 'Cà phê Hư Cấu GIẢ', location: { type: 'Point', coordinates: [0.2, 0.2] } })).save();
    expect((await run(input)).rows[0]?.status).toBe('duplicate');
    expect(await places.countDocuments()).toBe(1);
  });

  it('concurrent uploads with one phone or one Sheet ID create exactly one draft', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => run(csv(`D${index},Giả Lập ${index},cafe,Đã xác nhận,no,+84912345678`, ',phone'))));
    expect(results.flatMap((result) => result.rows).filter((row) => row.status === 'created')).toHaveLength(1);
    expect(await places.countDocuments()).toBe(1);
    const other = await cities.applySeed(fakeCitySeed({ slug: 'thanh-pho-khac-gia' }));
    expect((await service.run('thanh-pho-khac-gia', { csv: csv('D1,Giả Lập,cafe,Đã xác nhận,no,+84912345678', ',phone'), selections: [selection()] })).rows[0]?.status).toBe('created');
    expect(other.cityId).not.toBe(cityId);
  });

  it('resolves slug collisions while preserving historical slugs and maps zones', async () => {
    const zones = await cities.zones(cityId);
    await new places(fakePlaceDoc(cityId, { name: 'Quán Cũ Giả', slug: 'ten-khac-gia', slugHistory: ['quan-gia-lap'] })).save();
    await run(csv(`D1,Quán Giả Lập,cafe,Sẵn sàng đăng,no,${zones[0]!.slug}`, ',zone'));
    expect(await places.findOne({ name: 'Quán Giả Lập' }).lean()).toMatchObject({ slug: 'quan-gia-lap-2', zoneId: new Types.ObjectId(zones[0]!.id), verifySource: 'owner' });
  });

  it('rejects missing selected rows and unknown cities before writing', async () => {
    await expect(run(csv(), [selection(99)])).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
    await expect(service.preview('khong-co-gia', { csv: csv() })).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    expect(await places.countDocuments()).toBe(0);
  });
});
