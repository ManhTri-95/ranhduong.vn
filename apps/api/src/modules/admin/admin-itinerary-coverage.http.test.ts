import { ItineraryCoverageReport } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdminTestApp, type AdminTestApp } from '../../testing/admin-app';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { AdminModule } from './admin.module';

describe('S36 admin coverage HTTP', () => {
  let t: AdminTestApp;
  let cityId: string;
  const path = '/admin/cities/thanh-pho-gia-lap/itineraries/coverage';
  beforeAll(async () => { t = await createAdminTestApp([AdminModule]); cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId; });
  afterAll(async () => { await t.close(); });
  beforeEach(async () => { await t.conn.collection('places').deleteMany({}); await t.conn.collection('itineraries').deleteMany({}); });
  const get = (suffix = '', signedIn = true) => fetch(`${t.url}${path}${suffix}`, { headers: signedIn ? { cookie: t.cookie } : {} });
  it('requires an admin and validates query/city before running the report', async () => {
    expect((await get('', false)).status).toBe(401);
    expect((await get('?transport=bus')).status).toBe(400);
    expect((await get('?startDate=2020-01-01')).status).toBe(400);
    const missing = await fetch(`${t.url}/admin/cities/khong-co/itineraries/coverage`, { headers: { cookie: t.cookie } });
    expect(missing.status).toBe(404);
  });
  it('reads city-scoped complete data, rejects malformed hours and never persists itineraries', async () => {
    const zone = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId) });
    if (!zone) throw new Error('Missing fake zone');
    const source = fakePlaceDoc(cityId, { zoneId: zone._id, visitDurationMin: 60, category: 'cafe', alsoCategories: ['food'], lastVerifiedAt: new Date(), openingHours: [{ day: 1, open: '07:00', close: '22:00' }] });
    await t.conn.collection('places').insertMany([
      { ...source, slug: 'du-du-lieu-gia-lap' },
      { ...source, slug: 'thieu-thoi-luong-gia-lap', visitDurationMin: null },
      { ...source, slug: 'gio-hong-gia-lap', openingHours: [{ day: 1, open: '09:00', close: '18:00' }, { day: 9, open: 'abc', close: 'xyz' }] },
      { ...source, cityId: new Types.ObjectId('f'.repeat(24)), slug: 'khac-thanh-pho-gia-lap' },
    ]);
    const response = await get('?transport=taxi&with=family');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const report = ItineraryCoverageReport.parse(await response.json());
    expect(report).toMatchObject({ transport: 'taxi', with: 'family', total: 420, failed: 420 });
    expect(report.zones.find((z) => z.id === zone._id.toString())).toMatchObject({ total: 1, categories: { cafe: 1, food: 1 } });
    expect(await t.conn.collection('itineraries').countDocuments()).toBe(0);
    expect(await t.conn.collection('places').countDocuments()).toBe(4);
  });
});
