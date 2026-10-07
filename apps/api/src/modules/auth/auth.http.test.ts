import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { configureApp } from '../../app.setup';
import { ConfigModule } from '../../config/config.module';
import { REDIS, RedisModule } from '../../shared/redis/redis.module';
import { SessionModule } from '../../shared/session/session.module';
import { SESSION_TTL_S, SessionStore } from '../../shared/session/session.store';
import { testEnv } from '../../testing/env';
import { connectTestRedis, dropTestRedis, testKeys } from '../../testing/redis';
import { AuthModule } from './auth.module';
import { GoogleOAuth, type GoogleIdentity } from './google-oauth.client';

const ADMIN = 'http://admin.gia-lap.example';
const STRANGER_ORIGIN = 'http://ke-la.gia-lap.example';
const env = testEnv({ ADMIN_URL: ADMIN, WEB_ORIGINS: `http://web.gia-lap.example,${ADMIN}` });

const IDENTITIES: Record<string, GoogleIdentity> = {
  'code-quan-tri': { subject: 'google-sub-quan-tri', email: 'quan-tri-gia-lap@example.com', emailVerified: true },
  'code-nguoi-la': { subject: 'google-sub-nguoi-la', email: 'nguoi-la-gia-lap@example.com', emailVerified: true },
};

/** Google giả: URL đăng nhập giả, đổi code theo bảng IDENTITIES. */
class FakeGoogle extends GoogleOAuth {
  authorizeUrl({ state, codeChallenge }: { state: string; codeChallenge: string }): string {
    return `https://google.gia-lap.example/auth?state=${state}&code_challenge=${codeChallenge}`;
  }

  async exchangeCode(code: string): Promise<GoogleIdentity> {
    const identity = IDENTITIES[code];
    if (!identity) throw new Error('code giả không hợp lệ');
    return identity;
  }
}

interface CallOptions {
  method?: string;
  cookie?: string;
  headers?: Record<string, string>;
}

describe('Đăng nhập admin qua HTTP', () => {
  let app: INestApplication;
  let redis: Redis;
  let base: string;

  beforeAll(async () => {
    redis = await connectTestRedis();
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.register(env), RedisModule, SessionModule, AuthModule],
    })
      .overrideProvider(REDIS)
      .useValue(redis)
      .overrideProvider(GoogleOAuth)
      .useValue(new FakeGoogle())
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, env.WEB_ORIGINS);
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/v1`;
  });
  afterAll(async () => {
    // Đóng Redis trước; RedisModule thấy kết nối đã đóng thì bỏ qua.
    await dropTestRedis(redis);
    await app.close();
  });
  beforeEach(async () => {
    const keys = await testKeys(redis);
    if (keys.length > 0) await redis.del(...keys);
  });

  /** Gọi API, không tự theo redirect để đọc được Location và Set-Cookie. */
  const call = (path: string, { method = 'GET', cookie, headers = {} }: CallOptions = {}) =>
    fetch(`${base}${path}`, { method, redirect: 'manual', headers: cookie ? { ...headers, cookie } : headers });
  /** Dòng Set-Cookie của một cookie, kèm thuộc tính. */
  const setCookie = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  /** Phần `name=value` để gửi lại trong header Cookie. */
  const pair = (line: string | undefined) => line?.split(';')[0] ?? '';

  async function startLogin(returnTo = '/dia-diem/abc') {
    const res = await call(`/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`);
    const state = new URL(res.headers.get('location') ?? '').searchParams.get('state') ?? '';
    return { res, state, stateCookie: pair(setCookie(res, 'rd_oauth_state')) };
  }

  async function login(code: string) {
    const { state, stateCookie } = await startLogin();
    return call(`/auth/google/callback?state=${state}&code=${code}`, { cookie: stateCookie });
  }

  async function adminCookie(): Promise<string> {
    return pair(setCookie(await login('code-quan-tri'), env.SESSION_COOKIE_NAME));
  }

  it('start: chuyển sang Google, gắn state vào cookie host-only 10 phút', async () => {
    const { res, state } = await startLogin();
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^https:\/\/google\.gia-lap\.example\/auth\?state=/);
    const cookie = setCookie(res, 'rd_oauth_state') ?? '';
    expect(cookie.startsWith(`rd_oauth_state=${state};`)).toBe(true);
    expect(cookie).toMatch(/Max-Age=600/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).not.toMatch(/Domain=/);
  });

  it('email trong danh sách: cookie phiên 30 ngày, về đúng trang admin, xem được phiên', async () => {
    const res = await login('code-quan-tri');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${ADMIN}/dia-diem/abc`);
    const sid = setCookie(res, env.SESSION_COOKIE_NAME) ?? '';
    expect(sid).toMatch(new RegExp(`Max-Age=${SESSION_TTL_S}`));
    expect(sid).toMatch(/Path=\//);
    expect(sid).toMatch(/HttpOnly/);
    expect(sid).toMatch(/SameSite=Lax/);
    expect(setCookie(res, 'rd_oauth_state')).toMatch(/Expires=Thu, 01 Jan 1970/);

    const session = await call('/auth/session', { cookie: pair(sid) });
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({ email: 'quan-tri-gia-lap@example.com' });
  });

  it('email ngoài danh sách: về /dang-nhap?error=not_allowed, không cookie phiên, không phiên trong Redis', async () => {
    const res = await login('code-nguoi-la');
    expect(res.headers.get('location')).toBe(`${ADMIN}/dang-nhap?error=not_allowed`);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toBeUndefined();
    expect(await testKeys(redis, 'sess:*')).toEqual([]);
  });

  it('mở link callback mà trình duyệt không có cookie state (login CSRF): failed', async () => {
    const { state } = await startLogin();
    const res = await call(`/auth/google/callback?state=${state}&code=code-quan-tri`);
    expect(res.headers.get('location')).toBe(`${ADMIN}/dang-nhap?error=failed`);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it('dùng lại callback lần hai: expired', async () => {
    const { state, stateCookie } = await startLogin();
    await call(`/auth/google/callback?state=${state}&code=code-quan-tri`, { cookie: stateCookie });
    const again = await call(`/auth/google/callback?state=${state}&code=code-quan-tri`, { cookie: stateCookie });
    expect(again.headers.get('location')).toBe(`${ADMIN}/dang-nhap?error=expired`);
  });

  it('GET /auth/session không có cookie hoặc cookie lạ: 401 UNAUTHENTICATED', async () => {
    const name = env.SESSION_COOKIE_NAME;
    for (const cookie of [undefined, `${name}=${'a'.repeat(43)}`, `${name}=*`]) {
      const res = await call('/auth/session', { cookie });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ code: 'UNAUTHENTICATED', message: expect.any(String) });
    }
  });

  it('phiên của email đã bị bỏ khỏi ADMIN_EMAILS: 403 FORBIDDEN', async () => {
    const sid = await app.get(SessionStore).create({
      email: 'da-bi-go-gia-lap@example.com',
      subject: 'google-sub-da-bi-go',
      createdAt: new Date().toISOString(),
    });
    const res = await call('/auth/session', { cookie: `${env.SESSION_COOKIE_NAME}=${sid}` });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: 'FORBIDDEN', message: expect.any(String) });
  });

  it('qua AdminGuard thì cookie phiên được đặt lại đủ 30 ngày (phiên trượt)', async () => {
    const cookie = await adminCookie();
    const res = await call('/auth/session', { cookie });
    expect(pair(setCookie(res, env.SESSION_COOKIE_NAME))).toBe(cookie);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toMatch(new RegExp(`Max-Age=${SESSION_TTL_S}`));
  });

  it('đăng xuất từ admin: 204, xoá phiên trong Redis và xoá cookie', async () => {
    const cookie = await adminCookie();
    const res = await call('/auth/logout', { method: 'POST', cookie, headers: { origin: ADMIN } });
    expect(res.status).toBe(204);
    expect(setCookie(res, env.SESSION_COOKIE_NAME)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(await testKeys(redis, 'sess:*')).toEqual([]);
    expect((await call('/auth/session', { cookie })).status).toBe(401);
  });

  it('POST từ nguồn lạ hoặc không có Origin: 403, phiên còn nguyên', async () => {
    const cookie = await adminCookie();
    const variants: Record<string, string>[] = [{ origin: STRANGER_ORIGIN }, {}];
    for (const headers of variants) {
      const res = await call('/auth/logout', { method: 'POST', cookie, headers });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ code: 'FORBIDDEN', message: expect.any(String) });
    }
    expect((await call('/auth/session', { cookie })).status).toBe(200);
  });

  it('CORS: admin được gửi cookie, nguồn lạ thì không', async () => {
    const preflight = (origin: string) =>
      call('/auth/logout', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } });
    const allowed = await preflight(ADMIN);
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ADMIN);
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    expect((await preflight(STRANGER_ORIGIN)).headers.get('access-control-allow-origin')).toBeNull();
  });
});
