import type { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from '../../shared/session/session.store';
import { testEnv } from '../../testing/env';
import { connectTestRedis, dropTestRedis, testKeys } from '../../testing/redis';
import { AuthService } from './auth.service';
import { GoogleOAuth, type GoogleIdentity } from './google-oauth.client';
import { OAuthStateStore } from './oauth-state.store';
import { codeChallengeS256 } from './pkce';

const ADMIN = 'http://admin.gia-lap.example';

/** Google giả: ghi lại các lần đổi code, trả danh tính đặt sẵn hoặc ném lỗi. */
class FakeGoogle extends GoogleOAuth {
  identity: GoogleIdentity = { subject: 'google-sub-gia-lap-1', email: 'quan-tri-gia-lap@example.com', emailVerified: true };
  failWith: Error | null = null;
  readonly exchanged: { code: string; codeVerifier: string }[] = [];

  authorizeUrl({ state, codeChallenge }: { state: string; codeChallenge: string }): string {
    return `https://google.gia-lap.example/auth?state=${state}&code_challenge=${codeChallenge}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity> {
    this.exchanged.push({ code, codeVerifier });
    if (this.failWith) throw this.failWith;
    return this.identity;
  }
}

describe('AuthService', () => {
  let redis: Redis;
  let states: OAuthStateStore;
  let sessions: SessionStore;
  let google: FakeGoogle;
  const service = (env = testEnv()) => new AuthService(env, google, states, sessions);

  beforeAll(async () => {
    redis = await connectTestRedis();
    states = new OAuthStateStore(redis);
    sessions = new SessionStore(redis);
  });
  afterAll(async () => {
    await dropTestRedis(redis);
  });
  beforeEach(async () => {
    google = new FakeGoogle();
    const keys = await testKeys(redis);
    if (keys.length > 0) await redis.del(...keys);
  });

  describe('start', () => {
    it('lưu code_verifier và returnTo theo state, chuyển sang Google với challenge S256 của đúng verifier đó', async () => {
      const { state, redirectUrl } = await service().start('/dia-diem/abc');
      const url = new URL(redirectUrl);
      expect(url.searchParams.get('state')).toBe(state);
      const pending = await states.take(state);
      expect(pending?.returnTo).toBe('/dia-diem/abc');
      expect(url.searchParams.get('code_challenge')).toBe(codeChallengeS256(pending?.codeVerifier ?? ''));
    });

    it.each([['//gia-lap.example'], ['/\t/gia-lap.example'], ['https://gia-lap.example'], [undefined], [['/a', '/b']]])(
      'returnTo không an toàn (%s) thì lưu "/"',
      async (raw) => {
        const { state } = await service().start(raw);
        expect((await states.take(state))?.returnTo).toBe('/');
      },
    );
  });

  describe('finish', () => {
    it('email trong danh sách: tạo phiên và quay về đúng trang admin đang mở', async () => {
      const svc = service();
      const { state } = await svc.start('/dia-diem/abc');
      const result = await svc.finish({ state, code: 'code-gia-lap' }, state);
      expect(result).toMatchObject({ ok: true, redirectTo: `${ADMIN}/dia-diem/abc` });
      if (!result.ok) throw new Error('phải đăng nhập được');
      expect(await sessions.get(result.sid)).toMatchObject({ email: 'quan-tri-gia-lap@example.com', subject: 'google-sub-gia-lap-1' });
      expect(google.exchanged).toEqual([{ code: 'code-gia-lap', codeVerifier: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) }]);
    });

    it('so email không phân biệt hoa thường, phiên lưu email chữ thường', async () => {
      google.identity = { ...google.identity, email: 'Quan-Tri-Gia-Lap@Example.com' };
      const svc = service();
      const { state } = await svc.start('/');
      const result = await svc.finish({ state, code: 'c' }, state);
      if (!result.ok) throw new Error('phải đăng nhập được');
      expect((await sessions.get(result.sid))?.email).toBe('quan-tri-gia-lap@example.com');
    });

    it('email không có trong danh sách: not_allowed, không tạo phiên nào', async () => {
      google.identity = { ...google.identity, email: 'nguoi-la-gia-lap@example.com' };
      const svc = service();
      const { state } = await svc.start('/dia-diem');
      expect(await svc.finish({ state, code: 'c' }, state)).toEqual({
        ok: false,
        error: 'not_allowed',
        redirectTo: `${ADMIN}/dang-nhap?error=not_allowed`,
      });
      expect(await testKeys(redis, 'sess:*')).toEqual([]);
    });

    it('email chưa xác minh với Google: not_allowed dù có trong danh sách', async () => {
      google.identity = { ...google.identity, emailVerified: false };
      const svc = service();
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'not_allowed' });
      expect(await testKeys(redis, 'sess:*')).toEqual([]);
    });

    it('ADMIN_EMAILS trống: không ai vào được', async () => {
      const svc = service(testEnv({ ADMIN_EMAILS: '' }));
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'not_allowed' });
    });

    it('state lạ hoặc đã quá 10 phút: expired', async () => {
      expect(await service().finish({ state: 'khong-ton-tai', code: 'c' }, 'khong-ton-tai')).toMatchObject({ ok: false, error: 'expired' });
      expect(google.exchanged).toEqual([]);
    });

    it('state chỉ dùng được một lần', async () => {
      const svc = service();
      const { state } = await svc.start('/');
      await svc.finish({ state, code: 'c' }, state);
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'expired' });
      expect(google.exchanged).toHaveLength(1);
    });

    it('cookie state thiếu hoặc không khớp (login CSRF): failed, không đổi code', async () => {
      const svc = service();
      for (const cookie of [undefined, 'state-khac']) {
        const { state } = await svc.start('/');
        expect(await svc.finish({ state, code: 'c' }, cookie)).toMatchObject({ ok: false, error: 'failed' });
      }
      expect(google.exchanged).toEqual([]);
    });

    it('người dùng bấm Huỷ ở Google: failed', async () => {
      const svc = service();
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, error: 'access_denied' }, state)).toMatchObject({ ok: false, error: 'failed' });
      expect(google.exchanged).toEqual([]);
    });

    it('Google lỗi khi đổi code hoặc id_token sai: failed, không tạo phiên', async () => {
      google.failWith = new Error('invalid_grant');
      const svc = service();
      const { state } = await svc.start('/');
      expect(await svc.finish({ state, code: 'c' }, state)).toMatchObject({ ok: false, error: 'failed' });
      expect(await testKeys(redis, 'sess:*')).toEqual([]);
    });

    it('query sai dạng (thiếu state, tham số lặp): failed', async () => {
      expect(await service().finish({ code: 'c' }, undefined)).toMatchObject({ ok: false, error: 'failed' });
      expect(await service().finish({ state: ['a', 'b'], code: 'c' }, 'a')).toMatchObject({ ok: false, error: 'failed' });
    });
  });

  describe('logout', () => {
    it('xoá phiên; không có cookie thì không làm gì', async () => {
      const sid = await sessions.create({ email: 'quan-tri-gia-lap@example.com', subject: 's', createdAt: new Date().toISOString() });
      await service().logout(sid);
      expect(await sessions.get(sid)).toBeNull();
      await expect(service().logout(undefined)).resolves.toBeUndefined();
    });
  });
});
