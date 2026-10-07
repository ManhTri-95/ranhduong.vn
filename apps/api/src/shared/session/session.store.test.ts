import type { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestRedis, dropTestRedis } from '../../testing/redis';
import { SESSION_TTL_S, type SessionData, SessionStore } from './session.store';

const DATA: SessionData = {
  email: 'quan-tri-gia-lap@example.com',
  subject: 'google-sub-gia-lap-1',
  createdAt: '2026-10-07T03:00:00.000Z',
};

describe('SessionStore', () => {
  let redis: Redis;
  let store: SessionStore;
  beforeAll(async () => {
    redis = await connectTestRedis();
    store = new SessionStore(redis);
  });
  afterAll(async () => {
    await dropTestRedis(redis);
  });

  it('tạo phiên với sid ngẫu nhiên 43 ký tự, TTL 30 ngày, đọc lại đúng dữ liệu', async () => {
    const sid = await store.create(DATA);
    expect(sid).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await store.get(sid)).toEqual(DATA);
    expect(await redis.ttl(`sess:${sid}`)).toBeGreaterThan(SESSION_TTL_S - 5);
  });

  it('mỗi lần tạo là một sid khác', async () => {
    expect(await store.create(DATA)).not.toBe(await store.create(DATA));
  });

  it('đọc phiên thì gia hạn lại đủ 30 ngày', async () => {
    const sid = await store.create(DATA);
    await redis.expire(`sess:${sid}`, 60);
    await store.get(sid);
    expect(await redis.ttl(`sess:${sid}`)).toBeGreaterThan(SESSION_TTL_S - 5);
  });

  it('xoá phiên thì không đọc được nữa', async () => {
    const sid = await store.create(DATA);
    await store.destroy(sid);
    expect(await store.get(sid)).toBeNull();
  });

  it('sid thiếu, sai định dạng hoặc không tồn tại thì trả null', async () => {
    expect(await store.get(undefined)).toBeNull();
    expect(await store.get('*')).toBeNull();
    expect(await store.get('a'.repeat(43))).toBeNull();
    await expect(store.destroy('*')).resolves.toBeUndefined();
  });

  it('dữ liệu trong Redis bị hỏng thì coi như không có phiên', async () => {
    const sid = 'b'.repeat(43);
    await redis.set(`sess:${sid}`, '{hỏng');
    expect(await store.get(sid)).toBeNull();
    await redis.set(`sess:${sid}`, JSON.stringify({ email: 'khong-phai-email' }));
    expect(await store.get(sid)).toBeNull();
  });
});
