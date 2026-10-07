import type { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestRedis, dropTestRedis } from '../../testing/redis';
import { OAUTH_STATE_TTL_S, OAuthStateStore } from './oauth-state.store';

const PENDING = { codeVerifier: 'v'.repeat(43), returnTo: '/dia-diem' };

describe('OAuthStateStore', () => {
  let redis: Redis;
  let store: OAuthStateStore;
  beforeAll(async () => {
    redis = await connectTestRedis();
    store = new OAuthStateStore(redis);
  });
  afterAll(async () => {
    await dropTestRedis(redis);
  });

  it('lưu 10 phút và lấy lại đúng dữ liệu', async () => {
    await store.save('state-1', PENDING);
    const ttl = await redis.ttl('oauth:state-1');
    expect(ttl).toBeGreaterThan(OAUTH_STATE_TTL_S - 5);
    expect(ttl).toBeLessThanOrEqual(OAUTH_STATE_TTL_S);
    expect(await store.take('state-1')).toEqual(PENDING);
  });

  it('mỗi state chỉ lấy được một lần', async () => {
    await store.save('state-2', PENDING);
    await store.take('state-2');
    expect(await store.take('state-2')).toBeNull();
  });

  it('hai callback cùng state tới cùng lúc thì chỉ một bên lấy được', async () => {
    await store.save('state-3', PENDING);
    const results = await Promise.all([store.take('state-3'), store.take('state-3'), store.take('state-3')]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it('state lạ hoặc dữ liệu hỏng thì trả null', async () => {
    expect(await store.take('khong-ton-tai')).toBeNull();
    await redis.set('oauth:state-4', JSON.stringify({ codeVerifier: 'ngan', returnTo: '//gia-lap.example' }));
    expect(await store.take('state-4')).toBeNull();
  });
});
