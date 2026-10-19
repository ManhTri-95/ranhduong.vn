import { Types } from 'mongoose';
import { type AdminTemplate, TemplateEditInput } from '@ranhduong/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminTestApp, type AdminTestApp } from '../../testing/admin-app';
import { fakeCitySeed, fakePlaceDoc, FAKE_PHOTO } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { AdminModule } from './admin.module';
import { ItinerariesRepository } from '../itineraries/itineraries.repository';

const CITY = 'thanh-pho-gia-lap';
const id = new Types.ObjectId();
const second = new Types.ObjectId();
const stop = { key: '11111111-1111-4111-8111-111111111111', placeId: id.toString(), kind: 'visit', note: 'Ghi chú Giả Lập' };
const input = { title: 'Lịch trình Giả Lập', description: 'Mô tả Giả Lập', season: 'quanh-nam', style: 'cap-doi', transport: 'motorbike', pace: 'relaxed', startWeekday: 6, seoTitle: 'Tiêu đề Giả Lập', seoDescription: 'Xem trước Giả Lập', status: 'draft', days: [{ startTime: '07:00', stops: [stop] }] };
interface Template { id: string; slug: string; analysis: { canPublish: boolean; issues: { code: string; level: string }[] }; days: { stops: typeof stop[] }[] }
describe('S15 template editor HTTP', () => {
  let t: AdminTestApp;
  let cityId: string;
  beforeAll(async () => { t = await createAdminTestApp([AdminModule]); cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId; });
  afterAll(async () => { await t.close(); });
  beforeEach(async () => {
    await t.conn.collection('itineraries').deleteMany({});
    await t.conn.collection('places').deleteMany({});
    await t.conn.collection('places').insertMany([id, second].map((placeId, i) => fakePlaceDoc(cityId, {
      _id: placeId, slug: `quan-gia-lap-${i}`, visitDurationMin: 60, lastVerifiedAt: new Date(), photos: [{ key: 'anh-gia-lap', ...FAKE_PHOTO }],
      openingHours: Array.from({ length: 7 }, (_, day) => ({ day, open: '00:00', close: '24:00' })),
    })));
  });
  function call(path: string, method = 'GET', body?: unknown, session = true, origin = true) {
    return fetch(`${t.url}${path}`, { method, headers: { ...(session ? { cookie: t.cookie } : {}), ...(origin ? { origin: t.origin } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  }
  const collection = `/admin/cities/${CITY}/itineraries/templates`;
  async function create(body: unknown = input): Promise<Template> {
    const response = await call(collection, 'POST', body); expect(response.status).toBe(201); return await response.json() as Template;
  }
  it('S32 round-trips interests and audience independently of style, including clearing both', async () => {
    const styledInput = { ...input, style: 'couple' };
    const preferences = { tags: ['chill_cafe', 'photo_spots', 'clouds_hills'], with: 'family' };
    const created = await create({ ...styledInput, ...preferences });
    expect(created).toMatchObject(preferences);
    const path = `/admin/itineraries/templates/${created.id}`;
    expect(await (await call(path)).json()).toMatchObject(preferences);
    expect(await (await call(collection)).json()).toMatchObject({ items: [expect.objectContaining(preferences)] });
    expect(await t.conn.collection('itineraries').findOne({ _id: new Types.ObjectId(created.id) })).toMatchObject({ style: styledInput.style, params: preferences });
    const updated = await call(path, 'PUT', { ...styledInput, tags: ['nature_adventure'], with: 'solo' });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ tags: ['nature_adventure'], with: 'solo' });
    const cleared = await call(path, 'PUT', { ...styledInput, tags: [] });
    expect(cleared.status).toBe(200);
    const saved = await t.conn.collection('itineraries').findOne({ _id: new Types.ObjectId(created.id) });
    expect(saved?.params).toMatchObject({ tags: [] });
    expect(saved?.params.with).toBeNull();
    expect((await (await call(path)).json() as AdminTemplate).with).toBeUndefined();
    expect(saved?.style).toBe(styledInput.style);
  });
  it('S32 opens and saves legacy preferences, falling back only to a matching style enum', async () => {
    for (const [style, oldWith, expected] of [
      ['couple', undefined, 'couple'], ['friends', 'cap-doi', 'friends'],
      ['family', 'solo', 'solo'], ['cap-doi', 'cap-doi', undefined], ['', undefined, undefined],
    ] as const) {
      const legacyId = new Types.ObjectId();
      await t.conn.collection('itineraries').insertOne({ _id: legacyId, cityId: new Types.ObjectId(cityId), kind: 'template', title: 'Mẫu cũ Giả Lập', style, params: { days: 1, transport: 'car', pace: 'relaxed', ...(oldWith ? { with: oldWith } : {}) }, days: [], status: 'draft' });
      const path = `/admin/itineraries/templates/${legacyId}`;
      const response = await call(path);
      expect(response.status).toBe(200);
      const opened = await response.json() as AdminTemplate;
      expect(opened.tags).toEqual([]);
      expect(opened.with).toBe(expected);
      const storedBefore = await t.conn.collection('itineraries').findOne({ _id: legacyId });
      expect(storedBefore?.params.tags).toBeUndefined();
      const saved = await call(path, 'PUT', TemplateEditInput.parse(opened));
      expect(saved.status).toBe(200);
      const stored = await t.conn.collection('itineraries').findOne({ _id: legacyId });
      expect(stored?.params.tags).toEqual([]);
      expect(stored?.params.with).toBe(expected ?? null);
      expect(stored?.style).toBe(style);
    }
  });
  it('S32 rejects invalid preferences before creating or changing a template', async () => {
    const created = await create();
    for (const patch of [{ tags: ['chill_cafe', 'clouds_hills', 'photo_spots', 'nature_adventure'] }, { tags: ['chill_cafe', 'chill_cafe'] }, { tags: ['chill'] }, { with: 'cap-doi' }]) {
      expect((await call(collection, 'POST', { ...input, ...patch })).status).toBe(400);
      expect((await call(`/admin/itineraries/templates/${created.id}`, 'PUT', { ...input, ...patch })).status).toBe(400);
    }
    expect(await t.conn.collection('itineraries').countDocuments()).toBe(1);
  });
  it('protects every admin route and requires Origin on writes', async () => {
    for (const [path, method] of [[collection, 'GET'], [collection, 'POST'], [`${collection}/preview`, 'POST'], [`/admin/cities/${CITY}/template-places`, 'GET'], [`/admin/itineraries/templates/${id}`, 'GET'], [`/admin/itineraries/templates/${id}`, 'PUT']]) {
      expect((await call(path!, method, method === 'GET' ? undefined : input, false)).status).toBe(401);
    }
    expect((await call(collection, 'POST', input, true, false)).status).toBe(403);
  });
  it('creates and edits days, notes and metadata, calculates times server-side and retains slug', async () => {
    const created = await create();
    expect(created.slug).toBe('lich-trinh-gia-lap');
    expect(created.analysis.canPublish).toBe(true);
    const response = await call(`/admin/itineraries/templates/${created.id}`, 'PUT', { ...input, title: 'Đổi tên Giả Lập', days: [{ startTime: '08:00', stops: [{ ...stop, manualStart: '09:00', manualEnd: '10:00', travelMinFromPrev: 999 }] }, { startTime: '07:00', stops: [{ ...stop, key: '22222222-2222-4222-8222-222222222222', placeId: second.toString() }] }] });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ title: 'Đổi tên Giả Lập', slug: created.slug, description: input.description, seoTitle: input.seoTitle, days: [{ stops: [{ manualStart: '09:00', note: stop.note }] }, { stops: [{ placeId: second.toString() }] }] });
    const stored = await t.conn.collection('itineraries').findOne({ _id: new Types.ObjectId(created.id) });
    expect(stored).toMatchObject({ params: { days: 2 }, days: [{ day: 1, stops: [{ start: '09:00', end: '10:00', travelMinFromPrev: 0 }] }, { day: 2 }] });
  });
  it('returns live preview without persisting, and exposes scheduling facts only to admin', async () => {
    const response = await call(`${collection}/preview`, 'POST', input);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ canPublish: true, days: [{ stops: [{ start: '07:00', end: '08:00' }] }] });
    expect(await t.conn.collection('itineraries').countDocuments()).toBe(0);
    expect(await (await call(`/admin/cities/${CITY}/template-places`)).json()).toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ id: id.toString(), validPhoto: true, visitDurationMin: 60, status: 'active' })]) });
  });
  it('saves drafts with errors but blocks publication and validates again after place changes', async () => {
    const created = await create({ ...input, days: [{ startTime: '07:00', stops: [] }] });
    expect(created.analysis.canPublish).toBe(false);
    const published = await call(`/admin/itineraries/templates/${created.id}`, 'PUT', { ...input, status: 'published' });
    expect(published.status).toBe(200);
    await t.conn.collection('places').updateOne({ _id: id }, { $set: { status: 'hidden' } });
    const blocked = await call(`/admin/itineraries/templates/${created.id}`, 'PUT', { ...input, status: 'published' });
    expect(blocked.status).toBe(400);
    expect(await blocked.json()).toMatchObject({ code: 'VALIDATION_FAILED', details: expect.arrayContaining([expect.objectContaining({ code: 'unavailable' })]) });
  });
  it('warnings alone allow publication, home reads only published templates, and unpublishing removes the card', async () => {
    await t.conn.collection('places').updateOne({ _id: id }, { $set: { status: 'draft', photos: [], lastVerifiedAt: new Date('2020-01-01') } });
    const created = await create({ ...input, status: 'published' });
    expect(created.analysis.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'draft_place', level: 'warning' })]));
    expect(await (await call(`/cities/${CITY}/itineraries/templates`)).json()).toMatchObject({ items: [{ slug: created.slug, days: 1 }] });
    expect((await call(`/admin/itineraries/templates/${created.id}`, 'PUT', input)).status).toBe(200);
    expect(await (await call(`/cities/${CITY}/itineraries/templates`)).json()).toEqual({ items: [] });
  });
  it('rejects foreign/missing IDs, malformed keys and user itineraries', async () => {
    const foreign = new Types.ObjectId();
    await t.conn.collection('places').insertOne(fakePlaceDoc(new Types.ObjectId().toString(), { _id: foreign }));
    for (const placeId of [foreign.toString(), new Types.ObjectId().toString()]) expect((await call(collection, 'POST', { ...input, days: [{ startTime: '07:00', stops: [{ ...stop, placeId }] }] })).status).toBe(400);
    expect((await call(collection, 'POST', { ...input, days: [{ startTime: '07:00', stops: [stop, stop] }] })).status).toBe(400);
    expect((await call('/admin/itineraries/templates/not-id')).status).toBe(400);
    await t.conn.collection('itineraries').insertOne({ _id: id, cityId: new Types.ObjectId(cityId), kind: 'user' });
    expect((await call(`/admin/itineraries/templates/${id}`)).status).toBe(404);
    expect((await call(`/admin/itineraries/templates/${id}`, 'PUT', input)).status).toBe(404);
    expect((await call('/admin/cities/no-city/itineraries/templates')).status).toBe(404);
  });
  it('reserves unique slugs under simultaneous creation', async () => {
    const templates = await Promise.all([create(), create(), create()]);
    expect(new Set(templates.map((template) => template.slug)).size).toBe(3);
  });
  it('opens card-only legacy templates, fills missing days and preserves the fallback URL on first edit', async () => {
    const legacyId = new Types.ObjectId();
    await t.conn.collection('itineraries').insertOne({ _id: legacyId, cityId: new Types.ObjectId(cityId), kind: 'template', title: 'Lịch cũ Giả Lập', params: { days: 2, transport: 'car', pace: 'relaxed' }, days: [], status: 'draft' });
    await create();
    const response = await call(collection); expect(response.status).toBe(200);
    const list = await response.json() as { items: Template[] };
    const legacy = list.items.find((record) => record.id === legacyId.toString())!;
    expect(legacy.days).toHaveLength(2); expect(legacy.analysis.canPublish).toBe(false);
    expect(legacy.slug).toBe(`lich-trinh-${legacyId}`);
    const edited = await call(`/admin/itineraries/templates/${legacyId}`, 'PUT', input); expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ slug: legacy.slug });
    expect(await t.conn.collection('itineraries').findOne({ _id: legacyId })).toMatchObject({ slug: legacy.slug });
  });
  it('protects drafts referenced by a template, and permits deletion after removing the stop', async () => {
    await t.conn.collection('places').updateOne({ _id: id }, { $set: { status: 'draft' } });
    const template = await create();
    expect((await call(`/admin/places/${id}`, 'DELETE')).status).toBe(409);
    await call(`/admin/itineraries/templates/${template.id}`, 'PUT', { ...input, days: [{ startTime: '07:00', stops: [] }] });
    expect((await call(`/admin/places/${id}`, 'DELETE')).status).toBe(204);
  });
  it('serializes saving a reference and deleting its draft place across concurrent requests', async () => {
    await t.conn.collection('places').updateOne({ _id: id }, { $set: { status: 'draft' } });
    const repo = t.app.get(ItinerariesRepository);
    const original = repo.insertTemplate.bind(repo);
    let enter!: () => void; let release!: () => void;
    const entered = new Promise<void>((resolve) => { enter = resolve; });
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const spy = vi.spyOn(repo, 'insertTemplate').mockImplementation(async (...args) => { enter(); await blocked; return original(...args); });
    try {
      const saving = call(collection, 'POST', input);
      await entered;
      const deleting = call(`/admin/places/${id}`, 'DELETE');
      await new Promise((resolve) => setTimeout(resolve, 100)); release();
      expect((await saving).status).toBe(201); expect((await deleting).status).toBe(409);
      expect(await t.conn.collection('places').countDocuments({ _id: id })).toBe(1);
    } finally { release(); spy.mockRestore(); }
  });
});
