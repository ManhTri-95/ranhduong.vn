import { Inject, Injectable } from '@nestjs/common';
import { ReturnToPath } from '@ranhduong/contracts';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { parseStored } from '../../shared/redis/parse-stored';
import { REDIS } from '../../shared/redis/redis.module';

/** state và code_verifier sống 10 phút (ADR 0009). */
export const OAUTH_STATE_TTL_S = 10 * 60;

const PendingLogin = z.object({ codeVerifier: z.string().min(43), returnTo: ReturnToPath });
export type PendingLogin = z.infer<typeof PendingLogin>;

const key = (state: string) => `oauth:${state}`;

/** Lần đăng nhập đang chờ Google trả về, khoá `oauth:{state}` trong Redis. */
@Injectable()
export class OAuthStateStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async save(state: string, pending: PendingLogin): Promise<void> {
    await this.redis.set(key(state), JSON.stringify(pending), 'EX', OAUTH_STATE_TTL_S);
  }

  /** Lấy và xoá trong một lệnh (GETDEL): mỗi state chỉ dùng được một lần, kể cả khi hai callback tới cùng lúc. */
  async take(state: string): Promise<PendingLogin | null> {
    return parseStored(PendingLogin, await this.redis.getdel(key(state)));
  }
}
