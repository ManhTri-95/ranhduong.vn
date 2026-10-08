import { AdminPlace, AdminPlaceListResponse } from '@ranhduong/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdminTestApp, type AdminTestApp } from '../../testing/admin-app';
import { fakeCitySeed } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { AdminModule } from './admin.module';

const CITY = 'thanh-pho-gia-lap';
const DRAFT = { name: 'Quán Giả Lập', category: 'cafe' };

interface CallOptions {
  method?: string;
  body?: unknown;
  signedIn?: boolean;
  withOrigin?: boolean;
}

describe('Route quản trị địa điểm qua HTTP', () => {
  let t: AdminTestApp;

  beforeAll(async () => {
    t = await createAdminTestApp([AdminModule]);
    await t.app.get(CitiesService).applySeed(fakeCitySeed());
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.conn.collection('places').deleteMany({});
  });

  const call = (path: string, { method = 'GET', body, signedIn = true, withOrigin = true }: CallOptions = {}) =>
    fetch(`${t.url}${path}`, {
      method,
      headers: {
        ...(signedIn ? { cookie: t.cookie } : {}),
        ...(withOrigin ? { origin: t.origin } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const createDraft = async () => AdminPlace.parse(await (await call(`/admin/cities/${CITY}/places`, { method: 'POST', body: DRAFT })).json());

  it('chưa đăng nhập: 401 UNAUTHENTICATED ở mọi route quản trị', async () => {
    const routes = [
      ['GET', '/admin/places/0123456789abcdef01234567'],
      ['POST', `/admin/cities/${CITY}/places`],
      ['GET', `/admin/cities/${CITY}/zones/suggest?lng=0.2&lat=0.2`],
      ['GET', `/admin/cities/${CITY}/places`],
    ] as const;
    for (const [method, path] of routes) {
      const res = await call(path, { method, signedIn: false, body: method === 'POST' ? DRAFT : undefined });
      expect(res.status, path).toBe(401);
      expect(await res.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
    }
  });
  it('ghi dữ liệu không có Origin: 403, không tạo gì', async () => {
    const res = await call(`/admin/cities/${CITY}/places`, { method: 'POST', body: DRAFT, withOrigin: false });
    expect(res.status).toBe(403);
    expect(await t.conn.collection('places').countDocuments()).toBe(0);
  });
  it('tạo nháp, đọc, sửa, kích hoạt', async () => {
    const created = await call(`/admin/cities/${CITY}/places`, { method: 'POST', body: DRAFT });
    expect(created.status).toBe(201);
    const place = AdminPlace.parse(await created.json());
    expect(place.status).toBe('draft');
    expect((await call(`/admin/places/${place.id}`)).status).toBe(200);
    const complete = {
      ...DRAFT,
      zone: 'cum-gia-lap-a',
      location: { type: 'Point', coordinates: [0.2, 0.2] },
      openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
      verifySource: 'admin',
    };
    expect((await call(`/admin/places/${place.id}`, { method: 'PUT', body: complete })).status).toBe(200);
    const activated = await call(`/admin/places/${place.id}/activate`, { method: 'POST' });
    expect(activated.status).toBe(200);
    expect(AdminPlace.parse(await activated.json()).status).toBe('active');
  });
  it('body sai: 400 VALIDATION_FAILED có path; id sai dạng: 400', async () => {
    const res = await call(`/admin/cities/${CITY}/places`, { method: 'POST', body: { ...DRAFT, name: '' } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_FAILED', details: [{ path: 'name' }] });
    expect((await call('/admin/places/khong-phai-id')).status).toBe(400);
  });
  it('kích hoạt thiếu điều kiện: 400 kèm mã từng điều kiện', async () => {
    const place = await createDraft();
    const res = await call(`/admin/places/${place.id}/activate`, { method: 'POST' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      details: [{ code: 'location_missing' }, { code: 'hours_invalid' }, { code: 'verify_source_missing' }],
    });
  });
  it('danh sách địa điểm của thành phố, kèm điều kiện kích hoạt còn thiếu', async () => {
    await createDraft();
    const res = await call(`/admin/cities/${CITY}/places`);
    expect(res.status).toBe(200);
    const { items } = AdminPlaceListResponse.parse(await res.json());
    expect(items).toMatchObject([
      { name: 'Quán Giả Lập', status: 'draft', activationIssues: ['location_missing', 'hours_invalid', 'verify_source_missing'] },
    ]);
    expect((await call('/admin/cities/thanh-pho-khong-co/places')).status).toBe(404);
  });
  it('kiểm trùng và gợi ý cụm', async () => {
    const dup = await call(`/admin/cities/${CITY}/places/duplicate-check`, { method: 'POST', body: { name: 'Quán Giả Lập' } });
    expect(dup.status).toBe(200);
    expect(await dup.json()).toEqual({ matches: [] });
    const zones = await call(`/admin/cities/${CITY}/zones/suggest?lng=0.2&lat=0.2`);
    expect(await zones.json()).toEqual({ zones: [{ slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' }] });
    expect((await call(`/admin/cities/${CITY}/zones/suggest?lng=0.2`)).status).toBe(400);
  });
});
