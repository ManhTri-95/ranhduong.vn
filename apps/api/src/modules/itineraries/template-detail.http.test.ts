import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { FAKE_PHOTO, fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { ItinerariesModule } from './itineraries.module';

describe('S16 public template detail HTTP', () => {
  let t: TestApp;
  let cityId: string;
  let otherCityId: string;
  const id = () => new Types.ObjectId();
  const stop = (placeId: Types.ObjectId, extra: Record<string, unknown> = {}) => ({ placeId, start: '08:00', end: '09:00', travelMinFromPrev: 0, kind: 'visit', note: 'Ghi chú Giả Lập', ...extra });
  const template = (extra: Record<string, unknown> = {}) => ({
    cityId: new Types.ObjectId(cityId), kind: 'template', slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập',
    description: 'Mô tả Giả Lập', season: 'Mùa Giả Lập', style: 'Đi chậm', seoTitle: 'Tiêu đề Google Giả Lập', seoDescription: 'Mô tả Google Giả Lập',
    status: 'published', visibility: 'public', params: { days: 2, transport: 'car', pace: 'relaxed' }, days: [], ...extra,
  });
  const get = async (slug = 'lich-trinh-gia-lap', city = 'thanh-pho-gia-lap') => {
    const response = await fetch(`${t.url}/cities/${city}/itineraries/templates/${slug}`);
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  };
  beforeAll(async () => {
    t = await createTestApp([ItinerariesModule]);
    const cities = t.app.get(CitiesService);
    cityId = (await cities.applySeed(fakeCitySeed())).cityId;
    otherCityId = (await cities.applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-hai' }))).cityId;
  });
  afterAll(async () => { await t.close(); });
  beforeEach(async () => {
    await t.conn.collection('itineraries').deleteMany({});
    await t.conn.collection('places').deleteMany({});
  });
  it('keeps daily order, stored manual times, repeat visits and public direction facts', async () => {
    const a = id(); const b = id();
    await t.conn.collection('places').insertMany([
      fakePlaceDoc(cityId, { _id: a, slug: 'quan-gia-lap-a', photos: [{ key: 'fake/cover', ...FAKE_PHOTO }], ids: { googlePlaceId: 'fake-google-id' }, ownerId: id() }),
      fakePlaceDoc(cityId, { _id: b, slug: 'quan-gia-lap-b' }),
    ]);
    await t.conn.collection('itineraries').insertOne(template({ days: [
      { day: 1, stops: [stop(b), stop(a, { start: '10:15', end: '11:45', travelMinFromPrev: 15 })] },
      { day: 2, stops: [stop(a), stop(a, { start: '12:00', end: '13:00' })] },
    ] }));
    const result = await get();
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ title: 'Lịch trình Giả Lập', description: 'Mô tả Giả Lập', season: 'Mùa Giả Lập', seoTitle: 'Tiêu đề Google Giả Lập', transport: 'car', days: [
      { day: 1, stops: [{ number: 1, place: { slug: 'quan-gia-lap-b' } }, { number: 2, start: '10:15', end: '11:45', travelMinFromPrev: 15, place: { slug: 'quan-gia-lap-a', location: { coordinates: [0.2, 0.2] }, googlePlaceId: 'fake-google-id', coverKey: 'fake/cover' } }] },
      { day: 2, stops: [{ number: 1 }, { number: 2, start: '12:00' }] },
    ] });
    const json = JSON.stringify(result.body);
    for (const field of ['ownerId', 'guestId', 'analysis', 'manualStart', 'placeId']) expect(json).not.toContain(`"${field}"`);
    const days = result.body.days as { stops: { key: string }[] }[];
    expect(new Set(days.flatMap((day) => day.stops.map((item) => item.key))).size).toBe(4);
  });
  it('retains slots without leaking draft, hidden, closed, deleted or foreign-city places', async () => {
    const unavailable = ['draft', 'hidden', 'closed', 'suspected', 'merged'].map((status) => ({ status, _id: id() }));
    const foreign = id(); const deleted = id();
    await t.conn.collection('places').insertMany([
      ...unavailable.map((row) => fakePlaceDoc(cityId, { ...row, slug: `private-${row.status}`, name: 'Tên riêng tư Giả Lập' })),
      fakePlaceDoc(otherCityId, { _id: foreign, name: 'Tên riêng tư Giả Lập' }),
    ]);
    await t.conn.collection('itineraries').insertOne(template({ days: [{ day: 1, stops: [...unavailable.map((row) => stop(row._id, { note: 'Tên riêng tư Giả Lập · Địa chỉ riêng tư Giả Lập' })), stop(foreign), stop(deleted)] }] }));
    const result = await get();
    expect(result.status).toBe(200);
    expect(result.body.days).toMatchObject([{ stops: Array.from({ length: 7 }, (_, i) => ({ number: i + 1, place: null })) }, { day: 2, stops: [] }]);
    expect(JSON.stringify(result.body)).not.toContain('Tên riêng tư');
    expect(JSON.stringify(result.body)).not.toContain('Địa chỉ riêng tư');
  });
  it.each([{ status: 'draft' }, { kind: 'user' }, { visibility: 'unlisted' }, { city: 'other' }])('returns 404 for private or wrong-city templates: %j', async (extra) => {
    await t.conn.collection('itineraries').insertOne(template({ ...extra, ...(extra.city ? { cityId: new Types.ObjectId(otherCityId) } : {}) }));
    expect(await get()).toMatchObject({ status: 404, body: { code: 'NOT_FOUND' } });
  });
  it('reads legacy metadata and days without keys, using narrative as description', async () => {
    await t.conn.collection('itineraries').insertOne(template({ description: undefined, season: undefined, style: undefined, seoTitle: undefined, seoDescription: undefined, narrative: 'Nội dung cũ Giả Lập', visibility: undefined }));
    expect(await get()).toMatchObject({ status: 200, body: { description: 'Nội dung cũ Giả Lập', season: '', days: [{ day: 1, stops: [] }, { day: 2, stops: [] }] } });
  });
  it.each(['params', 'time'])('returns 404 instead of 500 for corrupt %s', async (field) => {
    await t.conn.collection('itineraries').insertOne(template(field === 'params' ? { params: { days: 9 } } : { days: [{ day: 1, stops: [stop(id(), { start: '25:00' })] }] }));
    expect(await get()).toMatchObject({ status: 404, body: { code: 'NOT_FOUND' } });
  });
  it.each([
    { label: 'missing place ID', stops: [{ start: '08:00', end: '09:00' }] },
    { label: 'null stop', stops: [null] },
    { label: 'non-array stops', stops: { broken: true } },
    { label: 'invalid place ID', stops: [{ placeId: 'bad-id', start: '08:00', end: '09:00' }] },
  ])('returns 404 for malformed legacy structure: $label', async ({ stops }) => {
    await t.conn.collection('itineraries').insertOne(template({ days: [{ day: 1, stops }] }));
    expect(await get()).toMatchObject({ status: 404, body: { code: 'NOT_FOUND' } });
  });
  it('returns validated errors for missing city/template and invalid slug', async () => {
    expect((await get('missing')).status).toBe(404);
    expect((await get('lich-trinh-gia-lap', 'khong-co')).status).toBe(404);
    expect((await get('bad_slug')).status).toBe(400);
  });
});
