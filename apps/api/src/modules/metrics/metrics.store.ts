import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EVENT_METRIC_FIELD, METRIC_FIELDS, MetricDaily, emptyMetricCounts, type MetricCounts, type PlaceEvent } from '@ranhduong/contracts';
import { Redis } from 'ioredis';
import { REDIS } from '../../shared/redis/redis.module';
import { slidingWindowAllowed } from '../../shared/http/sliding-window';

const RETENTION = 8 * 86400;
const COUNT = `
if ARGV[1] == 'views' and not redis.call('SET', KEYS[2], '1', 'NX', 'EX', 86400) then return 0 end
redis.call('HINCRBY', KEYS[1], ARGV[1], 1)
redis.call('HSET', KEYS[1], 'cityId', ARGV[5])
redis.call('EXPIRE', KEYS[1], ${RETENTION})
redis.call('SADD', KEYS[3], ARGV[2])
redis.call('EXPIRE', KEYS[3], ${RETENTION})
redis.call('ZADD', KEYS[4], ARGV[3], ARGV[4])
return 1`;

@Injectable()
export class MetricsStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async identity(day: string, ip: string, userAgent: string): Promise<{ visitor: string; ip: string }> {
    const key = `pm:salt:${day}`;
    await this.redis.set(key, randomBytes(32).toString('hex'), 'EX', 2 * 86400, 'NX');
    // Rate keys last one minute. Keep their salt through midnight and expire it after two idle minutes.
    await this.redis.set('pm:rate-salt', randomBytes(32).toString('hex'), 'EX', 120, 'NX');
    await this.redis.expire('pm:rate-salt', 120);
    const [salt, rateSalt] = await this.redis.mget(key, 'pm:rate-salt');
    if (!salt || !rateSalt) throw new Error('Metrics salt unavailable');
    const hash = (parts: string[]) => createHash('sha256').update(JSON.stringify([salt, ...parts])).digest('hex');
    return { visitor: hash([ip, userAgent]), ip: createHash('sha256').update(JSON.stringify([rateSalt, ip])).digest('hex') };
  }
  async rateAllowed(ipHash: string, now = Date.now()): Promise<boolean> {
    return slidingWindowAllowed(this.redis, [{ key: `pm:rate:${ipHash}`, limit: 120 }], 60000, now);
  }
  async count(event: PlaceEvent, day: string, visitor: string, cityId: string): Promise<number> {
    return Number(await this.redis.eval(COUNT, 4, `pm:${event.placeId}:${day}`, `seen:${visitor}:${event.placeId}:${day}`, `pm:index:${day}`, 'pm:days', EVENT_METRIC_FIELD[event.type], event.placeId, Date.parse(`${day}T00:00:00Z`), day, cityId));
  }
  async pendingDays(cutoff: string): Promise<string[]> { return this.redis.zrangebyscore('pm:days', '-inf', Date.parse(`${cutoff}T00:00:00Z`)); }
  async placeIds(day: string): Promise<string[]> { return this.redis.smembers(`pm:index:${day}`); }
  async acknowledge(day: string): Promise<void> { await this.redis.zrem('pm:days', day); }
  async counts(placeId: string, day: string): Promise<MetricCounts> {
    const row = await this.redis.hgetall(`pm:${placeId}:${day}`);
    const counts = emptyMetricCounts();
    for (const field of METRIC_FIELDS) counts[field] = Number(row[field] ?? 0);
    return counts;
  }
  async daily(placeId: string, day: string): Promise<MetricDaily | null> {
    const row = await this.redis.hgetall(`pm:${placeId}:${day}`);
    if (!row.cityId) return null;
    const counts = emptyMetricCounts();
    for (const field of METRIC_FIELDS) counts[field] = Number(row[field] ?? 0);
    return MetricDaily.parse({ placeId, cityId: row.cityId, dayKey: day, counts });
  }
}
