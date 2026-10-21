import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';

const SLIDING_WINDOW = `
for i, key in ipairs(KEYS) do
  redis.call('ZREMRANGEBYSCORE', key, '-inf', ARGV[1] - ARGV[2])
  if redis.call('ZCARD', key) >= tonumber(ARGV[3 + i]) then return 0 end
end
for _, key in ipairs(KEYS) do
  redis.call('ZADD', key, ARGV[1], ARGV[3])
  redis.call('PEXPIRE', key, ARGV[2])
end
return 1`;

/** S18/S37: check and charge every dimension atomically; a rejected request charges none. */
export async function slidingWindowAllowed(redis: Redis, limits: readonly { key: string; limit: number }[], windowMs: number, now = Date.now()): Promise<boolean> {
  return Number(await redis.eval(SLIDING_WINDOW, limits.length, ...limits.map(({ key }) => key), now, windowMs, randomUUID(), ...limits.map(({ limit }) => limit))) === 1;
}
