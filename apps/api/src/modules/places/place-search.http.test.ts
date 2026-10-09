import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceListResponse } from '@ranhduong/contracts';
import { ConfigModule } from '../../config/config.module';
import { loadEnv } from '../../config/env';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { PlacesModule } from './places.module';
import { PlacesRepository } from './places.repository';

describe('S13 configured Atlas candidates with current MongoDB records', () => {
  let t: TestApp;
  let repo: PlacesRepository;
  let cityId: string;
  beforeAll(async () => {
    t = await createTestApp([ConfigModule.register(loadEnv({
      MONGODB_URI: 'mongodb://localhost:27017/gia-lap', GOOGLE_CLIENT_ID: 'gia-lap', GOOGLE_CLIENT_SECRET: 'gia-lap',
      PLACE_SEARCH_INDEX: 'places-public',
    })), PlacesModule]);
    repo = t.app.get(PlacesRepository);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
  });
  afterAll(async () => { await t.close(); });
  beforeEach(async () => { vi.restoreAllMocks(); await t.conn.collection('places').deleteMany({}); });

  it('revalidates candidates against active city records and matching text while retaining unfiltered tag facets', async () => {
    await t.conn.collection('places').insertMany([
      fakePlaceDoc(cityId, { slug: 'may-gia-lap', name: 'Mây Giả Lập', tags: ['chill'] }),
      fakePlaceDoc(cityId, { slug: 'may-chua-index', name: 'Mây Giả Lập Chưa Index', tags: ['an-sang'] }),
      fakePlaceDoc(cityId, { slug: 'may-an', name: 'Mây Giả Lập Đã Ẩn', status: 'hidden' }),
      fakePlaceDoc(new Types.ObjectId().toString(), { slug: 'may-khac', name: 'Mây Giả Lập Khác Thành Phố' }),
      fakePlaceDoc(cityId, { slug: 'khong-khop', name: 'Quán Giả Lập Đổi Tên', category: 'food' }),
    ]);
    // Only the external Atlas query is substituted; HTTP, ranking and current DB reads are real.
    vi.spyOn(repo, 'searchSlugs').mockResolvedValue(['may-gia-lap', 'may-an', 'may-khac', 'khong-khop']);
    const response = await fetch(`${t.url}/cities/thanh-pho-gia-lap/places?q=may&limit=6`);
    expect(response.status).toBe(200);
    const body = await response.json() as PlaceListResponse;
    expect(body.items.map((item) => item.slug)).toEqual(['may-gia-lap']);
    expect(body.tags).toEqual([{ slug: 'an-sang', count: 1 }, { slug: 'chill', count: 1 }]);
  });

  it('an empty Atlas result does not fall back to unrelated active places', async () => {
    await t.conn.collection('places').insertOne(fakePlaceDoc(cityId, { name: 'Mây Giả Lập' }));
    vi.spyOn(repo, 'searchSlugs').mockResolvedValue([]);
    const response = await fetch(`${t.url}/cities/thanh-pho-gia-lap/places?q=may`);
    expect((await response.json() as PlaceListResponse).items).toEqual([]);
  });

  it('Atlas errors surface through the normal API error contract', async () => {
    vi.spyOn(repo, 'searchSlugs').mockRejectedValue(new Error('Atlas unavailable'));
    const response = await fetch(`${t.url}/cities/thanh-pho-gia-lap/places?q=may`);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('ordinary listing works without running the configured search index', async () => {
    await t.conn.collection('places').insertOne(fakePlaceDoc(cityId));
    vi.spyOn(repo, 'searchSlugs').mockRejectedValue(new Error('Listing must not depend on Atlas'));
    const response = await fetch(`${t.url}/cities/thanh-pho-gia-lap/places`);
    expect(response.status).toBe(200);
    expect((await response.json() as PlaceListResponse).items).toHaveLength(1);
  });
});
