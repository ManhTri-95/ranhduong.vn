import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaceEditInput, type ItineraryUserDetail } from '@ranhduong/contracts';
import { createAdminTestApp, type AdminTestApp } from '../../../testing/admin-app';
import { FAKE_PHOTO, fakeCitySeed, fakePlaceDoc } from '../../../testing/fixtures';
import { CitiesService } from '../../cities/cities.service';
import { PlacesService } from '../../places/places.service';
import { PlaceEditorService } from '../../places/place-editor.service';
import { PlaceStatusService } from '../../places/place-status.service';
import { PlanningSnapshot } from '../../places/planning-snapshot';
import { GuestItinerariesModule } from './guest-itineraries.module';
import { ItinerariesRepository } from '../itineraries.repository';

const CITY = 'thanh-pho-gia-lap';
const request = () => ({ days: 1, startDate: '2099-01-01', transport: 'motorbike', with: 'friends', tags: [], pace: 'relaxed', stayLocation: { type: 'Point', coordinates: [0.212345, 0.223456] } });
const assertPrivate = (value: unknown) => expect(JSON.stringify(value)).not.toMatch(/stayLocation|guestId|ownerId|ticketKey|ticketCleanupKeys|0\.212345|0\.223456/);

describe('S37 guest itinerary HTTP', () => {
  let t: AdminTestApp;
  let cityId: string;
  let zoneId: Types.ObjectId;
  let cookie: string;
  const post = (body: unknown = request(), headers: Record<string, string> = {}, city = CITY) => fetch(`${t.url}/cities/${city}/itineraries`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: t.origin, Cookie: cookie, ...headers }, body: JSON.stringify(body) });
  const read = (shareId: string, identity = cookie) => fetch(`${t.url}/itineraries/${shareId}`, { headers: identity ? { Cookie: identity } : {} });
  beforeAll(async () => {
    t = await createAdminTestApp([GuestItinerariesModule]);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
    zoneId = new Types.ObjectId((await t.app.get(CitiesService).zones(cityId))[0]!.id);
  });
  afterAll(async () => { await t?.close(); });
  beforeEach(async () => {
    cookie = `gid=${randomUUID()}`;
    await t.conn.collection('itineraries').deleteMany({});
    await t.conn.collection('places').deleteMany({});
    t.app.get(PlanningSnapshot).invalidate();
    await t.conn.collection('places').insertMany(Array.from({ length: 12 }, (_, index) => fakePlaceDoc(cityId, {
      slug: `diem-gia-lap-${index}`, name: `Điểm Giả Lập ${index}`, zoneId,
      category: index < 8 ? 'cafe' : 'food', location: { type: 'Point', coordinates: [0.21 + index * 0.0001, 0.22] },
      lastVerifiedAt: new Date(), visitDurationMin: 90,
      openingHours: Array.from({ length: 7 }, (_, day) => ({ day, open: '00:00', close: '24:00' })),
      photos: [{ key: `gia-lap-${index}`, ...FAKE_PHOTO }], verifySource: 'admin',
    })));
  });

  it('creates a private user itinerary with stable keys and rounded storage, then reads ownership', async () => {
    const created = await post();
    expect(created.status).toBe(201);
    expect(created.headers.get('cache-control')).toBe('no-store');
    expect(created.headers.get('set-cookie')).toBeNull();
    const body = await created.json() as ItineraryUserDetail;
    expect(body).toMatchObject({ canEdit: true, version: 1, city: { slug: CITY }, params: { days: 1, startDate: '2099-01-01' } });
    expect(body.shareId).toMatch(/^[a-zA-Z0-9]{20}$/);
    const stored = await t.conn.collection('itineraries').findOne({ shareId: body.shareId });
    expect(stored).toMatchObject({ kind: 'user', guestId: cookie.slice(4), visibility: 'unlisted', version: 1, params: { stayLocation: { type: 'Point', coordinates: [0.21, 0.225] } } });
    expect(stored).not.toHaveProperty('paramsHash');
    const stops = body.days.flatMap((day) => day.stops);
    expect(stops.length).toBeGreaterThanOrEqual(3);
    expect(new Set(stops.map((stop) => stop.key)).size).toBe(stops.length);
    for (const stop of stops) expect(stop).toMatchObject({ key: expect.stringMatching(/^[\da-f-]{36}$/), locked: false, isVip: false, note: '' });
    expect(body.days[0]!.detours.length).toBeGreaterThan(0);
    for (const detour of body.days[0]!.detours) expect(stops.map((stop) => stop.key)).toContain(detour.afterKey);
    assertPrivate(body);
    const owner = await read(body.shareId);
    expect(owner.headers.get('cache-control')).toBe('no-store');
    expect(await owner.json()).toEqual(body);
    expect(await (await read(body.shareId, '')).json()).toMatchObject({ canEdit: false });
    expect(await (await read(body.shareId, `gid=${randomUUID()}`)).json()).toMatchObject({ canEdit: false });
  });

  it('issues gid only on creation and preserves it on subsequent requests', async () => {
    const response = await post(request(), { Cookie: 'gid=forged' });
    expect(response.status).toBe(201);
    const setCookie = response.headers.get('set-cookie')!;
    expect(setCookie).toMatch(/^gid=[\da-f-]{36};/);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    const body = await response.json() as ItineraryUserDetail;
    expect(await (await read(body.shareId, setCookie.split(';')[0]!)).json()).toMatchObject({ canEdit: true });
    expect((await read(body.shareId, '')).headers.get('set-cookie')).toBeNull();
  });

  it('validates the date, interests and city bounds; enforces Origin on every write', async () => {
    for (const input of [{ ...request(), startDate: '2020-01-01' }, { ...request(), days: 6 }, { ...request(), tags: ['unknown'] }, { ...request(), stayLocation: { type: 'Point', coordinates: [2, 2] } }]) {
      const response = await post(input);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    }
    for (const origin of ['', 'https://evil.example']) expect((await post(request(), { Origin: origin })).status).toBe(403);
    expect((await post(request(), {}, 'khong-co')).status).toBe(404);
    expect(await t.conn.collection('itineraries').countDocuments()).toBe(0);
  });

  it('returns planner shortages without persisting an itinerary or leaking accommodation', async () => {
    await t.conn.collection('places').deleteMany({});
    const response = await post();
    expect(response.status).toBe(422);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ code: 'NOT_ENOUGH_PLACES', details: { shortages: expect.any(Array) } });
    assertPrivate(body);
    expect(await t.conn.collection('itineraries').countDocuments()).toBe(0);
  });

  it('masks unavailable and other-city references, including notes and detours, using current facts', async () => {
    const body = await (await post()).json() as ItineraryUserDetail;
    const row = await t.conn.collection('itineraries').findOne({ shareId: body.shareId });
    const first = row!.days[0].stops[0];
    const otherCity = new Types.ObjectId();
    await t.conn.collection('places').updateOne({ _id: first.placeId }, { $set: { status: 'hidden', practicalNotes: 'Không công khai Giả Lập' } });
    await t.conn.collection('itineraries').updateOne({ shareId: body.shareId }, { $set: { 'days.0.stops.0.note': 'Ghi chú riêng Giả Lập', ticketKey: 'private', ownerId: otherCity } });
    const publicBody = await (await read(body.shareId)).json() as ItineraryUserDetail;
    expect(publicBody.days[0]!.stops[0]).toMatchObject({ key: first.key, place: null, note: '' });
    expect(JSON.stringify(publicBody)).not.toContain('riêng');
    assertPrivate(publicBody);
    const active = row!.days[0].stops[1];
    await t.conn.collection('places').updateOne({ _id: active.placeId }, { $set: { cityId: otherCity } });
    expect((await (await read(body.shareId)).json() as ItineraryUserDetail).days[0]!.stops[1]!.place).toBeNull();
    const detourId = row!.days[0].detours[0].placeId;
    await t.conn.collection('places').updateOne({ _id: detourId }, { $set: { status: 'closed' } });
    expect((await (await read(body.shareId)).json() as ItineraryUserDetail).days[0]!.detours[0]!.place).toBeNull();
  });

  it('rejects ObjectId lookups, templates and inactive cities with no-store 404s', async () => {
    const body = await (await post()).json() as ItineraryUserDetail;
    const row = await t.conn.collection('itineraries').findOne({ shareId: body.shareId });
    for (const id of [row!._id.toString(), 'a'.repeat(20)]) {
      const response = await read(id);
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    await t.conn.collection('itineraries').updateOne({ shareId: body.shareId }, { $set: { kind: 'template' } });
    expect((await read(body.shareId)).status).toBe(404);
    await t.conn.collection('itineraries').updateOne({ shareId: body.shareId }, { $set: { kind: 'user' } });
    await t.conn.collection('cities').updateOne({ _id: new Types.ObjectId(cityId) }, { $set: { active: false } });
    expect((await read(body.shareId)).status).toBe(404);
    await t.conn.collection('cities').updateOne({ _id: new Types.ObjectId(cityId) }, { $set: { active: true } });
  });

  it('enforces the per-guest limit over HTTP', async () => {
    for (let index = 0; index < 10; index++) expect((await post()).status).toBe(201);
    const response = await post();
    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('refreshes a warmed snapshot immediately after admin edits and status changes', async () => {
    const places = t.app.get(PlacesService);
    const before = await places.planningSnapshot(cityId);
    const place = before[0]!;
    const editor = t.app.get(PlaceEditorService);
    const input = await editor.get(place.id);
    await editor.update(place.id, PlaceEditInput.parse({ ...input, name: 'Đã Sửa Giả Lập', visitDurationMin: 45 }));
    expect((await places.planningSnapshot(cityId)).find((item) => item.id === place.id)).toMatchObject({ name: 'Đã Sửa Giả Lập', visitDurationMin: 45 });
    await t.app.get(PlaceStatusService).changeStatus(place.id, 'hide');
    expect((await places.planningSnapshot(cityId)).find((item) => item.id === place.id)).toBeUndefined();
  });

  it('retries a shareId collision and does not reuse results for identical requests', async () => {
    const insert = vi.spyOn(t.app.get(ItinerariesRepository), 'insertUser').mockRejectedValueOnce(Object.assign(new Error('Duplicate Giả Lập'), { code: 11000 }));
    try {
      const first = await (await post()).json() as ItineraryUserDetail;
      expect(first.shareId).toMatch(/^[a-zA-Z0-9]{20}$/);
      expect(insert).toHaveBeenCalledTimes(2);
      expect(insert.mock.calls[0]![1]).not.toBe(insert.mock.calls[1]![1]);
      const second = await (await post()).json() as ItineraryUserDetail;
      expect(second.shareId).not.toBe(first.shareId);
      expect(second.days[0]!.stops[0]!.key).not.toBe(first.days[0]!.stops[0]!.key);
      expect(await t.conn.collection('itineraries').countDocuments()).toBe(2);
    } finally { insert.mockRestore(); }
  });
});
