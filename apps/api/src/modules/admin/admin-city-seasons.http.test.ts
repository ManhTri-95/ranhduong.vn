import { CityNow, CitySeasonEditInput, CitySeasonSettings, SeasonItineraryOptions } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdminTestApp, type AdminTestApp } from '../../testing/admin-app';
import { fakeCitySeed } from '../../testing/fixtures';
import { SessionStore } from '../../shared/session/session.store';
import { CitiesService } from '../cities/cities.service';
import { CityNowModule } from '../city-now/city-now.module';
import { CityNowService } from '../city-now/city-now.service';
import { AdminModule } from './admin.module';

const CITY = 'thanh-pho-gia-lap';
const season = { key: 'hoa-gia-lap', kind: 'flower', from: '01-01', to: '12-31', accent: '#E58FA8', title: 'Mùa Giả Lập', sub: 'Mô tả Giả Lập', illustration: 'cherry-blossom' };
const templateId = new Types.ObjectId();

describe('S23 seasons HTTP and persistence', () => {
  let t: AdminTestApp;
  let cityId: Types.ObjectId;
  beforeAll(async () => {
    t = await createAdminTestApp([AdminModule, CityNowModule]);
    cityId = new Types.ObjectId((await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId);
  });
  afterAll(async () => { if (t) await t.close(); });
  beforeEach(async () => {
    await t.conn.collection('cities').updateOne({ _id: cityId }, { $set: { active: true, seasons: [], updatedAt: new Date('2026-01-01T00:00:00Z') } });
    await t.conn.collection('itineraries').deleteMany({});
    await t.conn.collection('itineraries').insertOne({ _id: templateId, cityId, kind: 'template', status: 'published', visibility: 'public', slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập', params: { days: 1, transport: 'motorbike', pace: 'relaxed' }, days: [] });
  });
  function call(path: string, method = 'GET', body?: unknown, cookie = t.cookie, origin: string | null = t.origin) {
    return fetch(`${t.url}${path}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  }
  async function settings(): Promise<CitySeasonSettings> {
    const response = await call(`/admin/cities/${CITY}/seasons`);
    expect(response.status).toBe(200);
    return CitySeasonSettings.parse(await response.json());
  }
  async function save(seasons: unknown[] = [season]) {
    const previous = await settings();
    return call(`/admin/cities/${CITY}/seasons`, 'PUT', { seasons, updatedAt: previous.updatedAt });
  }
  it('requires admin membership and a valid Origin, including reads', async () => {
    expect((await call(`/admin/cities/${CITY}/seasons`, 'GET', undefined, '')).status).toBe(401);
    const deniedSid = await t.app.get(SessionStore).create({ email: 'nguoi-la-gia-lap@example.com', subject: 'gia-lap', createdAt: new Date().toISOString() });
    const cookieName = t.cookie.slice(0, t.cookie.indexOf('='));
    expect((await call(`/admin/cities/${CITY}/seasons`, 'GET', undefined, `${cookieName}=${deniedSid}`)).status).toBe(403);
    const body = { seasons: [season], updatedAt: '2026-01-01T00:00:00.000Z' };
    expect((await call(`/admin/cities/${CITY}/seasons`, 'PUT', body, t.cookie, null)).status).toBe(403);
    expect((await call(`/admin/cities/${CITY}/seasons`, 'PUT', body, t.cookie, 'https://wrong.example')).status).toBe(403);
  });
  it('roundtrips fields, preserves them when seeded again, and permits clearing all seasons', async () => {
    const response = await save([{ ...season, featuredItineraryId: templateId.toString() }]);
    expect(response.status).toBe(200);
    expect(CitySeasonSettings.parse(await response.json()).seasons).toMatchObject([{ ...season, featuredItineraryId: templateId.toString() }]);
    await t.app.get(CitiesService).applySeed(fakeCitySeed());
    expect((await settings()).seasons[0]?.kind).toBe('flower');
    expect((await save([])).status).toBe(200);
    expect((await settings()).seasons).toEqual([]);
  });
  it('rejects duplicate keys and stale versions without changing stored seasons', async () => {
    const previous = await settings();
    const invalid = await call(`/admin/cities/${CITY}/seasons`, 'PUT', { ...previous, seasons: [season, season] });
    expect(invalid.status).toBe(400);
    expect((await save()).status).toBe(200);
    const conflict = await call(`/admin/cities/${CITY}/seasons`, 'PUT', { ...previous, seasons: [] });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ code: 'CONFLICT' });
    expect((await settings()).seasons).toHaveLength(1);
  });
  it.each([{ status: 'draft' }, { visibility: 'unlisted' }, { cityId: new Types.ObjectId() }, { kind: 'user' }, { params: { days: 8, transport: 'motorbike', pace: 'relaxed' } }])('rejects an unavailable featured template %j', async (change) => {
    await t.conn.collection('itineraries').updateOne({ _id: templateId }, { $set: change });
    expect((await save([{ ...season, featuredItineraryId: templateId.toString() }])).status).toBe(400);
    expect((await settings()).seasons).toEqual([]);
  });
  it('offers only eligible public templates to the admin picker', async () => {
    await t.conn.collection('itineraries').insertMany([
      { cityId, kind: 'template', status: 'draft', visibility: 'public', slug: 'nhap', title: 'Nháp Giả Lập', params: { days: 1, transport: 'car', pace: 'relaxed' } },
      { cityId, kind: 'template', status: 'published', visibility: 'unlisted', slug: 'rieng', title: 'Riêng Giả Lập', params: { days: 1, transport: 'car', pace: 'relaxed' } },
    ]);
    const res = await call(`/admin/cities/${CITY}/seasons/itineraries`);
    expect(res.status).toBe(200);
    const options = SeasonItineraryOptions.parse(await res.json());
    expect(options.items.map((item) => item.id)).toEqual([templateId.toString()]);
  });
  it('returns the city accent without a matching season and 404 for inactive/unknown cities', async () => {
    const res = await call(`/cities/${CITY}/now`, 'GET', undefined, '');
    expect(res.status).toBe(200);
    expect(CityNow.parse(await res.json())).toMatchObject({ accent: '#123456', season: null, featuredItinerary: null });
    await t.conn.collection('cities').updateOne({ _id: cityId }, { $set: { active: false } });
    expect((await call(`/cities/${CITY}/now`)).status).toBe(404);
    expect((await call(`/cities/khong-co/now`)).status).toBe(404);
  });
  it('resolves the featured card outside the list limit and removes it immediately after unpublishing', async () => {
    await t.conn.collection('itineraries').insertMany(Array.from({ length: 12 }, (_, i) => ({ cityId, kind: 'template', status: 'published', visibility: 'public', slug: `gia-lap-${i}`, title: 'Giả Lập', params: { days: 1, transport: 'car', pace: 'relaxed' }, createdAt: new Date() })));
    expect((await save([{ ...season, featuredItineraryId: templateId.toString() }])).status).toBe(200);
    const res = await call(`/cities/${CITY}/now`, 'GET', undefined, '');
    const data = CityNow.parse(await res.json());
    expect(data.accent).toBe('#E58FA8');
    expect(data.season).not.toHaveProperty('featuredItineraryId');
    expect(data.featuredItinerary?.slug).toBe('lich-trinh-gia-lap');
    expect(res.headers.get('cache-control')).toMatch(/max-age=\d+/);
    await t.conn.collection('itineraries').updateOne({ _id: templateId }, { $set: { status: 'draft' } });
    expect(CityNow.parse(await (await call(`/cities/${CITY}/now`)).json()).featuredItinerary).toBeNull();
  });
  it('uses a new cache version after saving, including two saves at the same wall-clock time', async () => {
    const now = new Date('2026-10-12T05:00:00Z');
    const service = t.app.get(CityNowService);
    expect((await save()).status).toBe(200);
    expect((await service.current(CITY, now)).accent).toBe('#E58FA8');
    expect((await save([{ ...season, accent: '#8DB3CF' }])).status).toBe(200);
    expect((await service.current(CITY, now)).accent).toBe('#8DB3CF');
    const edit = CitySeasonEditInput.parse(await settings());
    expect(edit.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });
});
