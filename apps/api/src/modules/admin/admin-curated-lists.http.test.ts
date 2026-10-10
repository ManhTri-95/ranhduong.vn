import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdminTestApp, type AdminTestApp } from '../../testing/admin-app';
import { fakeCitySeed } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { AdminModule } from './admin.module';

const CITY = 'thanh-pho-gia-lap';
const first = new Types.ObjectId();
const second = new Types.ObjectId();
const missing = new Types.ObjectId().toString();
const input = { title: 'Cà phê Giả Lập', description: 'Danh sách kiểm thử, không phải dữ liệu thật.', placeIds: [second.toString(), first.toString()], status: 'published' };
interface List { id: string; slug: string; title: string; placeIds: string[]; status: string }

describe('S14 curated lists HTTP', () => {
  let t: AdminTestApp;
  let cityId: Types.ObjectId;
  beforeAll(async () => {
    t = await createAdminTestApp([AdminModule]);
    const seed = await t.app.get(CitiesService).applySeed(fakeCitySeed());
    cityId = new Types.ObjectId(seed.cityId);
  });
  afterAll(async () => { await t.close(); });
  beforeEach(async () => {
    await t.conn.collection('curated_lists').deleteMany({});
    await t.conn.collection('places').deleteMany({});
    await t.conn.collection('places').insertMany([
      { _id: first, cityId, slug: 'gia-lap-1', name: 'Quán Giả Lập 1', category: 'cafe', status: 'active', openingHours: [] },
      { _id: second, cityId, slug: 'gia-lap-2', name: 'Quán Giả Lập 2', category: 'food', status: 'active', openingHours: [] },
    ]);
  });
  function call(path: string, method = 'GET', body?: unknown, signedIn = true, origin = true) {
    return fetch(`${t.url}${path}`, { method, headers: {
      ...(signedIn ? { cookie: t.cookie } : {}), ...(origin ? { origin: t.origin } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    }, body: body ? JSON.stringify(body) : undefined });
  }
  async function create(body = input): Promise<List> {
    const res = await call(`/admin/cities/${CITY}/curated-lists`, 'POST', body);
    expect(res.status).toBe(201);
    return await res.json() as List;
  }
  it('requires a session on all admin routes and Origin on writes', async () => {
    for (const [path, method] of [[`/admin/cities/${CITY}/curated-lists`, 'GET'], [`/admin/cities/${CITY}/curated-lists`, 'POST'], [`/admin/curated-lists/${missing}`, 'GET'], [`/admin/curated-lists/${missing}`, 'PUT']]) {
      expect((await call(path!, method, method === 'GET' ? undefined : input, false)).status).toBe(401);
    }
    expect((await call(`/admin/cities/${CITY}/curated-lists`, 'POST', input, true, false)).status).toBe(403);
    expect(await t.conn.collection('curated_lists').countDocuments()).toBe(0);
  });
  it('creates, reads and updates title, description and order with a stable slug', async () => {
    const list = await create();
    expect(list.slug).toBe('ca-phe-gia-lap');
    expect(await (await call(`/admin/curated-lists/${list.id}`)).json()).toMatchObject(input);
    const publicRes = await call(`/cities/${CITY}/curated-lists/${list.slug}`);
    expect(publicRes.status).toBe(200);
    expect(await publicRes.json()).toMatchObject({ title: input.title, description: input.description, places: [{ slug: 'gia-lap-2' }, { slug: 'gia-lap-1' }] });
    const changed = { ...input, title: 'Đổi tên Giả Lập', description: 'Mô tả mới', placeIds: [...input.placeIds].reverse() };
    const update = await call(`/admin/curated-lists/${list.id}`, 'PUT', changed);
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({ ...changed, slug: list.slug });
    const detail = await (await call(`/cities/${CITY}/curated-lists/${list.slug}`)).json();
    expect(detail).toMatchObject({ places: [{ slug: 'gia-lap-1' }, { slug: 'gia-lap-2' }] });
    expect(detail).not.toHaveProperty('placeIds');
  });
  it('keeps empty drafts private and publishes/unpublishes explicitly', async () => {
    const list = await create({ ...input, status: 'draft', placeIds: [] });
    expect((await call(`/cities/${CITY}/curated-lists/${list.slug}`)).status).toBe(404);
    expect(await (await call(`/cities/${CITY}/curated-lists`)).json()).toEqual({ items: [] });
    expect(await (await call(`/admin/cities/${CITY}/curated-lists`)).json()).toMatchObject({ items: [{ id: list.id, status: 'draft' }] });
    await call(`/admin/curated-lists/${list.id}`, 'PUT', input);
    expect((await call(`/cities/${CITY}/curated-lists/${list.slug}`)).status).toBe(200);
    await call(`/admin/curated-lists/${list.id}`, 'PUT', { ...input, status: 'draft' });
    expect((await call(`/cities/${CITY}/curated-lists/${list.slug}`)).status).toBe(404);
  });
  it('filters a newly hidden/closed place and preserves order and correct summary counts', async () => {
    const list = await create();
    await t.conn.collection('places').updateOne({ _id: second }, { $set: { status: 'hidden' } });
    const detail = await (await call(`/cities/${CITY}/curated-lists/${list.slug}`)).json() as { places: { slug: string }[] };
    expect(detail.places.map((place) => place.slug)).toEqual(['gia-lap-1']);
    expect(await (await call(`/cities/${CITY}/curated-lists`)).json()).toMatchObject({ items: [{ slug: list.slug, placeCount: 1 }] });
    await t.conn.collection('places').updateOne({ _id: first }, { $set: { status: 'closed' } });
    expect(await (await call(`/cities/${CITY}/curated-lists/${list.slug}`)).json()).toMatchObject({ places: [] });
  });
  it('rejects missing, cross-city and merged references, and non-active publication', async () => {
    const foreign = new Types.ObjectId();
    await t.conn.collection('places').insertOne({ _id: foreign, cityId: new Types.ObjectId(), status: 'active' });
    for (const id of [missing, foreign.toString()]) {
      expect((await call(`/admin/cities/${CITY}/curated-lists`, 'POST', { ...input, placeIds: [id] })).status).toBe(400);
    }
    await t.conn.collection('places').updateOne({ _id: first }, { $set: { status: 'merged' } });
    expect((await call(`/admin/cities/${CITY}/curated-lists`, 'POST', input)).status).toBe(400);
    await t.conn.collection('places').updateOne({ _id: first }, { $set: { status: 'draft' } });
    expect((await call(`/admin/cities/${CITY}/curated-lists`, 'POST', input)).status).toBe(400);
    await create({ ...input, status: 'draft' });
  });
  it('generates distinct slugs for equal titles including concurrent creation', async () => {
    const lists = await Promise.all([create(), create(), create()]);
    expect(new Set(lists.map((list) => list.slug)).size).toBe(3);
    expect(await t.conn.collection('curated_lists').countDocuments()).toBe(3);
  });
  it('returns validation errors and 404 for missing lists/cities', async () => {
    for (const body of [{ ...input, placeIds: [missing, missing] }, { ...input, title: '!!!' }, { ...input, status: 'published', placeIds: [] }]) {
      expect((await call(`/admin/cities/${CITY}/curated-lists`, 'POST', body)).status).toBe(400);
    }
    expect((await call('/admin/curated-lists/bad-id')).status).toBe(400);
    expect((await call(`/admin/curated-lists/${missing}`)).status).toBe(404);
    expect((await call(`/admin/curated-lists/${missing}`, 'PUT', input)).status).toBe(404);
    expect((await call(`/cities/${CITY}/curated-lists/no-list`)).status).toBe(404);
    expect((await call('/cities/no-city/curated-lists')).status).toBe(404);
    expect((await call('/admin/cities/no-city/curated-lists', 'POST', input)).status).toBe(404);
  });
});
