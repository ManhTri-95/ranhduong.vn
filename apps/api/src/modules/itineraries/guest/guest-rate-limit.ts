import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ApiException } from '../../../shared/http/api-exception';
import { slidingWindowAllowed } from '../../../shared/http/sliding-window';
import { REDIS } from '../../../shared/redis/redis.module';

@Injectable()
export class GuestRateLimit {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async check(gid: string, ip: string, now = Date.now()): Promise<void> {
    // Outlive every one-hour rate key; extend on use so crossing midnight cannot reset the limit.
    await this.redis.set('itin:rate-salt', randomBytes(32).toString('hex'), 'EX', 7200, 'NX');
    await this.redis.expire('itin:rate-salt', 7200);
    const salt = await this.redis.get('itin:rate-salt');
    if (!salt) throw new Error('Itinerary rate salt unavailable');
    const hash = (value: string) => createHash('sha256').update(JSON.stringify([salt, value])).digest('hex');
    const allowed = await slidingWindowAllowed(this.redis, [
      { key: `itin:rate:guest:${hash(gid)}`, limit: 10 },
      { key: `itin:rate:ip:${hash(ip)}`, limit: 60 },
    ], 3600000, now);
    if (!allowed) throw new ApiException('RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS, 'Bạn đã tạo nhiều lịch trình. Thử lại sau một giờ nhé.');
  }
}
