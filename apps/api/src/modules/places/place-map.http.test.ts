import { PlaceListResponse } from '@ranhduong/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { PlacesModule } from './places.module';

describe('S12 geographic public places', () => {
  let t: TestApp;
  let cityId: string;
  let otherCityId: string;
  const path = '/cities/thanh-pho-gia-lap/places';
  const get = async (query: string) => {
    const response = await fetch(`${t.url}${path}?${query}`);
    return { status: response.status, body: await response.json() as unknown };
  };
  beforeAll(async () => {
    t = await createTestApp([PlacesModule]);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
    otherCityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'gia-lap-khac' }))).cityId;
  });
  afterAll(async () => { if (t) await t.close(); });
  beforeEach(async () => { await t.conn.collection('places').deleteMany({}); });

  it('returns only active located places in the viewport and city, matching secondary categories', async () => {
    await t.conn.collection('places').insertMany([
      fakePlaceDoc(cityId, { slug: 'trong-khung', alsoCategories: ['food'] }),
      fakePlaceDoc(cityId, { slug: 'ngoai-khung', category: 'food', location: { type: 'Point', coordinates: [0.8, 0.8] } }),
      fakePlaceDoc(cityId, { slug: 'khong-vi-tri', category: 'food', location: undefined }),
      fakePlaceDoc(cityId, { slug: 'sai-danh-muc' }),
      ...['draft', 'hidden', 'closed', 'merged', 'suspected'].map((status) => fakePlaceDoc(cityId, { slug: `rieng-tu-${status}`, category: 'food', status })),
      fakePlaceDoc(otherCityId, { slug: 'khac-thanh-pho', category: 'food' }),
    ]);
    const response = await get('bbox=0.1,0.1,0.4,0.4&category=food');
    expect(response.status).toBe(200);
    const data = PlaceListResponse.parse(response.body);
    expect(data.items.map((place) => place.slug)).toEqual(['trong-khung']);
    expect(data.items[0]).toMatchObject({ location: { type: 'Point', coordinates: [0.2, 0.2] } });
    expect(data.items[0]).not.toHaveProperty('contact');
    const plain = PlaceListResponse.parse((await get('category=food')).body);
    expect(plain.items[0]).not.toHaveProperty('location');
  });

  it('paginates more than fifty viewport places without dropping or repeating them', async () => {
    await t.conn.collection('places').insertMany(Array.from({ length: 55 }, (_, index) => fakePlaceDoc(cityId, { slug: `gia-lap-${String(index).padStart(3, '0')}` })));
    const first = PlaceListResponse.parse((await get('bbox=0.1,0.1,0.4,0.4&limit=50')).body);
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toBeDefined();
    const second = PlaceListResponse.parse((await get(`bbox=0.1,0.1,0.4,0.4&limit=50&cursor=${first.nextCursor}`)).body);
    expect(second.items).toHaveLength(5);
    expect(new Set([...first.items, ...second.items].map((place) => place.slug)).size).toBe(55);
    expect(second.nextCursor).toBeUndefined();
  });

  it('uses lat,lng and radius in metres for near queries', async () => {
    await t.conn.collection('places').insertMany([
      fakePlaceDoc(cityId, { slug: 'gan', location: { type: 'Point', coordinates: [0.3, 0.2] } }),
      fakePlaceDoc(cityId, { slug: 'xa', location: { type: 'Point', coordinates: [0.31, 0.2] } }),
    ]);
    const data = PlaceListResponse.parse((await get('near=0.2,0.3&radius=500')).body);
    expect(data.items.map((place) => place.slug)).toEqual(['gan']);
    expect(data.items[0]).toHaveProperty('location');
  });

  it.each(['bbox=0,,1,1', 'bbox=1,0,0,1', 'bbox=0,0,1,91', 'near=0,0', 'radius=1', 'near=0,0&radius=50001', 'near=0,0&radius=500&bbox=0,0,1,1'])('rejects invalid geographic input %s', async (query) => {
    expect(await get(query)).toMatchObject({ status: 400, body: { code: 'VALIDATION_FAILED' } });
  });
});
