import { PlaceDetailResponse } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { FAKE_PHOTO, fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { PlacesModule } from './places.module';

describe('S11 public place detail HTTP', () => {
  let t: TestApp;
  let cityId: string;
  let otherCityId: string;
  const places = () => t.conn.collection('places');
  const get = (slug: string, city = 'thanh-pho-gia-lap') => fetch(`${t.url}/cities/${city}/places/${slug}`, { redirect: 'manual' });

  beforeAll(async () => {
    t = await createTestApp([PlacesModule]);
    const cities = t.app.get(CitiesService);
    cityId = (await cities.applySeed(fakeCitySeed())).cityId;
    otherCityId = (await cities.applySeed(fakeCitySeed({ slug: 'thanh-pho-khac' }))).cityId;
    await cities.applySeed(fakeCitySeed({ slug: 'thanh-pho-tat', active: false }));
  });
  afterAll(async () => { await t.close(); });
  beforeEach(async () => { await places().deleteMany({}); });

  it('returns editorial details and only public fields', async () => {
    const zone = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-a' });
    await places().insertOne(fakePlaceDoc(cityId, {
      zoneId: zone?._id, address: 'Địa chỉ Giả Lập', practicalNotes: 'Ghi chú Giả Lập.',
      openingHours: [{ day: 1, open: '07:00', close: '22:00' }], verifySource: 'admin',
      lastVerifiedAt: new Date('2026-01-01'), cover: 'partial', priceLevel: 2,
      contact: { phone: '+84912345678', fanpage: 'https://facebook.com/fake' },
      ids: { googlePlaceId: 'fake-id', osmId: 'node/123' },
      photos: [{ key: 'fake/photo', ...FAKE_PHOTO }], ownerId: new Types.ObjectId(), suspicionScore: 42,
    }));
    const res = await get('quan-gia-lap');
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = PlaceDetailResponse.parse(body);
    expect(parsed.place).toMatchObject({ zoneName: 'Cụm Giả Lập A', address: 'Địa chỉ Giả Lập', practicalNotes: 'Ghi chú Giả Lập.', unconfirmed: true, lastVerifiedAt: '2026-01-01T00:00:00.000Z', googlePlaceId: 'fake-id' });
    expect(parsed.place.photos).toHaveLength(1);
    expect(JSON.stringify(body)).not.toMatch(/ownerId|suspicionScore|osmId|nameNorm|slugHistory/);
  });

  it.each(['draft', 'hidden', 'suspected'])('does not expose %s via current or historical slug', async (status) => {
    await places().insertOne(fakePlaceDoc(cityId, { status, slugHistory: ['ancienne'] }));
    expect((await get('quan-gia-lap')).status).toBe(404);
    expect((await get('ancienne')).status).toBe(404);
  });

  it('unknown place/city and inactive city return 404', async () => {
    await places().insertOne(fakePlaceDoc(cityId));
    expect((await get('absent')).status).toBe(404);
    expect((await get('quan-gia-lap', 'absent')).status).toBe(404);
    expect((await get('quan-gia-lap', 'thanh-pho-tat')).status).toBe(404);
  });

  it('historical slugs and merged chains redirect 301 directly to the canonical slug', async () => {
    const targetId = new Types.ObjectId();
    const middleId = new Types.ObjectId();
    await places().insertMany([
      fakePlaceDoc(cityId, { _id: targetId, slug: 'canonical', slugHistory: ['old'] }),
      fakePlaceDoc(cityId, { _id: middleId, slug: 'middle', status: 'merged', mergedInto: targetId }),
      fakePlaceDoc(cityId, { slug: 'merged', status: 'merged', mergedInto: middleId }),
    ]);
    for (const slug of ['old', 'merged', 'middle']) {
      const res = await get(slug);
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('/v1/cities/thanh-pho-gia-lap/places/canonical');
    }
  });

  it('broken/cyclic/cross-city merges and hidden merge targets return 404', async () => {
    const a = new Types.ObjectId();
    const b = new Types.ObjectId();
    const foreign = new Types.ObjectId();
    const hidden = new Types.ObjectId();
    await places().insertMany([
      fakePlaceDoc(cityId, { _id: a, slug: 'cycle-a', status: 'merged', mergedInto: b }),
      fakePlaceDoc(cityId, { _id: b, slug: 'cycle-b', status: 'merged', mergedInto: a }),
      fakePlaceDoc(otherCityId, { _id: foreign, slug: 'foreign' }),
      fakePlaceDoc(cityId, { slug: 'cross-city', status: 'merged', mergedInto: foreign }),
      fakePlaceDoc(cityId, { slug: 'broken', status: 'merged', mergedInto: new Types.ObjectId() }),
      fakePlaceDoc(cityId, { _id: hidden, slug: 'hidden-target', status: 'hidden' }),
      fakePlaceDoc(cityId, { slug: 'to-hidden', status: 'merged', mergedInto: hidden }),
    ]);
    for (const slug of ['cycle-a', 'cycle-b', 'cross-city', 'broken', 'to-hidden']) expect((await get(slug)).status).toBe(404);
  });

  it('finds six nearest active places, excluding self, private states and other cities', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId),
      ...Array.from({ length: 8 }, (_, i) => fakePlaceDoc(cityId, { slug: `near-${i}`, location: { type: 'Point', coordinates: [0.2 + (i + 1) * 0.001, 0.2] } })),
      fakePlaceDoc(otherCityId, { slug: 'foreign', location: { type: 'Point', coordinates: [0.2, 0.2] } }),
      ...['draft', 'hidden', 'closed', 'suspected', 'merged'].map((status) => fakePlaceDoc(cityId, { slug: status, status })),
    ]);
    const body = PlaceDetailResponse.parse(await (await get('quan-gia-lap')).json());
    expect(body.nearby.map((p) => p.slug)).toEqual(['near-0', 'near-1', 'near-2', 'near-3', 'near-4', 'near-5']);
  });

  it('closed places keep 200 and suggest three similar active places including secondary categories', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId, { status: 'closed' }),
      fakePlaceDoc(cityId, { slug: 'food-only', category: 'food' }),
      ...Array.from({ length: 4 }, (_, i) => fakePlaceDoc(cityId, { slug: `similar-${i}`, category: 'food', alsoCategories: ['cafe'], location: { type: 'Point', coordinates: [0.2 + (i + 1) * 0.001, 0.2] } })),
    ]);
    const res = await get('quan-gia-lap');
    expect(res.status).toBe(200);
    const body = PlaceDetailResponse.parse(await res.json());
    expect(body.place.status).toBe('closed');
    expect(body.nearby.map((p) => p.slug)).toEqual(['similar-0', 'similar-1', 'similar-2']);
  });

  it('filters invalid legacy photos/links and handles missing data', async () => {
    await places().insertOne(fakePlaceDoc(cityId, { location: undefined, photos: [{ key: 'bad', source: 'self' }], contact: { fanpage: 'javascript:alert(1)' } }));
    const body = PlaceDetailResponse.parse(await (await get('quan-gia-lap')).json());
    expect(body.place.photos).toEqual([]);
    expect(body.place.contact).toEqual({});
    expect(body.nearby).toEqual([]);
  });
});
