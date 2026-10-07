import { Inject, Injectable } from '@nestjs/common';
import { AdminSession } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { RANDOM_TOKEN_PATTERN, randomToken } from '../crypto/random-token';
import { parseStored } from '../redis/parse-stored';
import { REDIS } from '../redis/redis.module';

/** Phiên sống 30 ngày, gia hạn mỗi lần dùng (ADR 0009). */
export const SESSION_TTL_S = 30 * 24 * 60 * 60;

/** Dữ liệu phiên trong Redis: phần trả ra ngoài (AdminSession), cộng `sub` Google và thời điểm tạo. */
export const SessionData = AdminSession.extend({ subject: z.string().min(1), createdAt: z.iso.datetime() });
export type SessionData = z.infer<typeof SessionData>;

const key = (sid: string) => `sess:${sid}`;
const isSid = (sid: string | undefined): sid is string => sid !== undefined && RANDOM_TOKEN_PATTERN.test(sid);

/** Phiên phía server trong Redis, khoá `sess:{sid}`. Xoá khoá là thu hồi phiên. */
@Injectable()
export class SessionStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create(data: SessionData): Promise<string> {
    const sid = randomToken();
    await this.redis.set(key(sid), JSON.stringify(SessionData.parse(data)), 'EX', SESSION_TTL_S);
    return sid;
  }

  /** Đọc phiên và gia hạn TTL trong cùng một lệnh (GETEX). */
  async get(sid: string | undefined): Promise<SessionData | null> {
    if (!isSid(sid)) return null;
    return parseStored(SessionData, await this.redis.getex(key(sid), 'EX', SESSION_TTL_S));
  }

  async destroy(sid: string | undefined): Promise<void> {
    if (isSid(sid)) await this.redis.del(key(sid));
  }
}
