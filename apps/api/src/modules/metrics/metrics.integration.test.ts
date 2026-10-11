import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { REDIS } from '../../shared/redis/redis.module';
import { createAdminTestApp, type AdminTestApp } from '../../testing/admin-app';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { MetricsModule } from './metrics.module';
import { MetricsService } from './metrics.service';
import { MetricsRepository } from './metrics.repository';
import { MetricsStore } from './metrics.store';
import type { Redis } from 'ioredis';

describe('S18 metrics with real MongoDB and Redis', () => {
  let t: AdminTestApp;
  let service: MetricsService;
  let redis: Redis;
  let placeId: string;
  let cityId: string;
  let hiddenId: string;
  let inactiveId: string;
  const now = new Date('2026-10-07T08:00:00Z');
  const identity = { ip: '192.0.2.1', userAgent: 'Visitor Giả Lập' };
  beforeAll(async () => {
    t = await createAdminTestApp([MetricsModule]); service = t.app.get(MetricsService); redis = t.app.get(REDIS);
    const cities = t.app.get(CitiesService);
    cityId = (await cities.applySeed(fakeCitySeed())).cityId;
    const inactive = (await cities.applySeed(fakeCitySeed({ slug: 'thanh-pho-tat', active: false }))).cityId;
    const place = new Types.ObjectId(); const hidden = new Types.ObjectId(); const off = new Types.ObjectId();
    placeId = place.toString(); hiddenId = hidden.toString(); inactiveId = off.toString();
    await t.conn.collection('places').insertMany([fakePlaceDoc(cityId, { _id: place }), fakePlaceDoc(cityId, { _id: hidden, slug: 'an', status: 'hidden' }), fakePlaceDoc(inactive, { _id: off, slug: 'tat' })]);
  });
  afterAll(async () => { await t?.close(); });
  it('limits a sliding minute and only releases each request when its own 60 seconds elapse', async () => {
    const store = t.app.get(MetricsStore);
    const hash = 'f'.repeat(64);
    const start = Date.now();
    for (let index = 0; index < 120; index++) expect(await store.rateAllowed(hash, start + index)).toBe(true);
    expect(await store.rateAllowed(hash, start + 59999)).toBe(false);
    expect(await store.rateAllowed(hash, start + 60000)).toBe(true);
    expect(await store.rateAllowed(hash, start + 60000)).toBe(false);
    expect(await store.rateAllowed(hash, start + 60001)).toBe(true);
  });
  it('deduplicates concurrent views but counts each action atomically and retains no raw identity', async () => {
    const events = [{ type: 'place_view' as const, placeId, source: 'list' as const }, { type: 'direction_click' as const, placeId }];
    await Promise.all(Array.from({ length: 10 }, () => service.record({ events }, identity, now)));
    expect(await redis.hgetall(`pm:${placeId}:2026-10-07`)).toMatchObject({ views: '1', directionClicks: '10' });
    expect(await redis.ttl(`pm:${placeId}:2026-10-07`)).toBeGreaterThan(86400);
    const keys = await redis.keys(`${redis.options.keyPrefix ?? ''}*`);
    expect(keys.join(' ')).not.toMatch(/192\.0\.2\.1|Visitor/);
    expect(await t.conn.collection('place_metrics').countDocuments()).toBe(0);
    await service.record({ events: [{ type: 'place_view', placeId }] }, identity, new Date('2026-10-08T08:00:00Z'));
    expect(await redis.hget(`pm:${placeId}:2026-10-08`, 'views')).toBe('1');
  });
  it('ignores hidden/missing/inactive city places without leaking their identity', async () => {
    const response = await service.record({ events: [hiddenId, inactiveId, new Types.ObjectId().toString()].map((id) => ({ type: 'direction_click', placeId: id })) }, identity, now);
    expect(response.accepted).toBe(0);
    expect(await redis.exists(`pm:${hiddenId}:2026-10-07`)).toBe(0);
  });
  it('keeps the IP limit across Vietnamese midnight while rotating the view identity', async () => {
    const midnightVisitor = { ip: '192.0.2.99', userAgent: 'Midnight Giả Lập' };
    const before = new Date('2026-10-06T16:59:59.900Z');
    const after = new Date('2026-10-06T17:00:00.100Z');
    const missing = new Types.ObjectId().toString();
    for (let index = 0; index < 120; index++) await service.record({ events: [{ type: 'place_view', placeId: missing }] }, midnightVisitor, before);
    await expect(service.record({ events: [{ type: 'place_view', placeId }] }, midnightVisitor, after)).rejects.toMatchObject({ body: { code: 'RATE_LIMITED' } });
  });
  it('rollup is retryable, catches up days and stays exact under repeated/concurrent execution', async () => {
    const repo = t.app.get(MetricsRepository);
    const failed = vi.spyOn(repo, 'saveDaily').mockRejectedValueOnce(new Error('Mongo Giả Lập interrupted'));
    await expect(service.rollup(new Date('2026-10-09T01:00:00Z'))).rejects.toThrow('interrupted');
    failed.mockRestore();
    await Promise.all([service.rollup(new Date('2026-10-09T01:00:00Z')), service.rollup(new Date('2026-10-09T01:00:00Z'))]);
    await service.rollup(new Date('2026-10-09T01:00:00Z'));
    const rows = await t.conn.collection('place_metrics').find({}).sort({ dayKey: 1 }).toArray();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ cityId: new Types.ObjectId(cityId), placeId: new Types.ObjectId(placeId), dayKey: '2026-10-07', views: 1, directionClicks: 10 });
    expect(JSON.stringify(rows)).not.toMatch(/192\.0\.2\.1|Visitor|userAgent|events|visitorId/);
    await service.record({ events: [{ type: 'direction_click', placeId }] }, identity, new Date('2026-10-09T01:00:00Z'));
    await service.rollup(new Date('2026-10-09T01:00:00Z'));
    expect(await t.conn.collection('place_metrics').countDocuments()).toBe(2);
  });
  it('weekly report merges live and persisted totals once, has all seven days and is scoped to city', async () => {
    const report = await service.weeklyReport('thanh-pho-gia-lap', { week: '2026-10-07' }, new Date('2026-10-09T01:00:00Z'));
    expect(report).toMatchObject({ weekStart: '2026-10-05', weekEnd: '2026-10-11', totals: { views: 2, directionClicks: 11 } });
    expect(report.days).toHaveLength(7);
    expect(report.items.find((p) => p.placeId === placeId)?.counts.directionClicks).toBe(11);
    expect(report.items.some((p) => p.placeId === inactiveId)).toBe(false);
    expect(report.items.find((p) => p.placeId === hiddenId)?.counts.directionClicks).toBe(0);
  });
  it('HTTP validates batch/Origin, rate limits at 120/min and guards admin reports', async () => {
    const request = (events: unknown, headers: Record<string, string> = {}) => fetch(`${t.url}/events`, { method: 'POST', headers: { 'content-type': 'application/json', origin: t.origin, ...headers }, body: JSON.stringify({ events }) });
    expect((await request(Array(21).fill({ type: 'direction_click', placeId }))).status).toBe(400);
    expect((await request([{ type: 'direction_click', placeId }], { origin: 'https://attacker.example' })).status).toBe(403);
    for (let index = 0; index < 120; index++) expect((await request([{ type: 'direction_click', placeId }], { 'x-forwarded-for': `192.0.2.${index + 1}` })).status).toBe(202);
    const limited = await request([{ type: 'direction_click', placeId }]);
    expect(limited.status).toBe(429); expect(await limited.json()).toMatchObject({ code: 'RATE_LIMITED' });
    expect((await fetch(`${t.url}/admin/cities/thanh-pho-gia-lap/metrics`)).status).toBe(401);
    const report = await fetch(`${t.url}/admin/cities/thanh-pho-gia-lap/metrics`, { headers: { cookie: t.cookie } });
    expect(report.status).toBe(200); expect(report.headers.get('cache-control')).toBe('no-store');
  }, 15000);
  it('does not roll up yesterday before the 00:15 settling window', async () => {
    await service.record({ events: [{ type: 'direction_click', placeId }] }, identity, new Date('2026-10-10T16:00:00Z'));
    await service.rollup(new Date('2026-10-10T17:10:00Z'));
    expect(await t.conn.collection('place_metrics').countDocuments({ dayKey: '2026-10-10' })).toBe(0);
    await service.rollup(new Date('2026-10-10T17:15:00Z'));
    expect(await t.conn.collection('place_metrics').countDocuments({ dayKey: '2026-10-10' })).toBe(1);
  });
  it('persists already accepted counters even if the city or place is later hidden', async () => {
    const otherCity = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'sau-do-tat' }))).cityId;
    const otherPlace = new Types.ObjectId();
    await t.conn.collection('places').insertOne(fakePlaceDoc(otherCity, { _id: otherPlace }));
    await service.record({ events: [{ type: 'direction_click', placeId: otherPlace.toString() }] }, identity, now);
    await t.conn.collection('cities').updateOne({ _id: new Types.ObjectId(otherCity) }, { $set: { active: false } });
    await t.conn.collection('places').updateOne({ _id: otherPlace }, { $set: { status: 'hidden' } });
    await service.rollup(new Date('2026-10-12T01:00:00Z'));
    expect(await t.conn.collection('place_metrics').findOne({ placeId: otherPlace })).toMatchObject({ cityId: new Types.ObjectId(otherCity), directionClicks: 1 });
  });
});
