import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { ApiException } from '../../shared/http/api-exception';
import { REDIS } from '../../shared/redis/redis.module';

export const TEMPLATE_WRITE_LOCK_KEY = 'lock:admin-template-write';
const LEASE_MS = 120_000;
const RENEW = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) else return 0 end";
const RELEASE = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
const busy = () => new ApiException('CONFLICT', HttpStatus.CONFLICT, 'Đang có thao tác lưu lịch trình hoặc xoá nháp khác. Thử lưu lại nhé.');

/** Serializes admin template saves and draft deletion across API instances; no DB transaction needed. */
@Injectable()
export class AdminTemplateLock {
  private readonly logger = new Logger(AdminTemplateLock.name);
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async run<T>(action: (assertOwned: () => Promise<void>) => Promise<T>): Promise<T> {
    const owner = randomUUID();
    let acquired = false;
    try {
      for (let attempt = 0; attempt < 40; attempt++) {
        if (await this.redis.set(TEMPLATE_WRITE_LOCK_KEY, owner, 'PX', LEASE_MS, 'NX') === 'OK') { acquired = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch { throw busy(); }
    if (!acquired) throw busy();
    let lost = false;
    const assertOwned = async (): Promise<void> => {
      if (lost) throw busy();
      try { if (await this.redis.eval(RENEW, 1, TEMPLATE_WRITE_LOCK_KEY, owner, LEASE_MS) !== 1) lost = true; }
      catch { lost = true; }
      if (lost) throw busy();
    };
    const timer = setInterval(() => { void assertOwned().catch(() => { lost = true; }); }, 20_000);
    timer.unref();
    try { return await action(assertOwned); }
    finally {
      clearInterval(timer);
      try { await this.redis.eval(RELEASE, 1, TEMPLATE_WRITE_LOCK_KEY, owner); }
      catch { this.logger.warn('Could not release template write lease; it will expire automatically.'); }
    }
  }
}
