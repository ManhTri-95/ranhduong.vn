import { Inject, Injectable, Logger } from '@nestjs/common';
import { type LoginError, OAuthCallbackQuery, parseReturnTo } from '@ranhduong/contracts';
import { ENV, type Env } from '../../config/env';
import { randomToken } from '../../shared/crypto/random-token';
import { isAllowedAdmin } from '../../shared/session/admin-emails';
import { SessionStore } from '../../shared/session/session.store';
import { GoogleOAuth, type GoogleIdentity } from './google-oauth.client';
import { OAuthStateStore } from './oauth-state.store';
import { createPkcePair } from './pkce';

export interface LoginStart {
  state: string;
  redirectUrl: string;
}

export type LoginFinish = { ok: true; sid: string; redirectTo: string } | { ok: false; error: LoginError; redirectTo: string };

/** Đăng nhập admin bằng Google: Authorization Code + PKCE phía server; chỉ email trong ADMIN_EMAILS mới có phiên. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly google: GoogleOAuth,
    private readonly states: OAuthStateStore,
    private readonly sessions: SessionStore,
  ) {}

  async start(rawReturnTo: unknown): Promise<LoginStart> {
    const state = randomToken();
    const { verifier, challenge } = createPkcePair();
    await this.states.save(state, { codeVerifier: verifier, returnTo: parseReturnTo(rawReturnTo) });
    return { state, redirectUrl: this.google.authorizeUrl({ state, codeChallenge: challenge }) };
  }

  /**
   * Xử lý callback theo thứ tự: lấy và xoá state (chỉ dùng một lần) → so với cookie của trình duyệt (chặn login CSRF)
   * → đổi code → kiểm email đã xác minh và nằm trong danh sách. Chỉ bước cuối mới tạo phiên.
   */
  async finish(rawQuery: unknown, stateCookie: string | undefined): Promise<LoginFinish> {
    const query = OAuthCallbackQuery.safeParse(rawQuery);
    if (!query.success) return this.fail('failed');
    const { state, code, error } = query.data;

    const pending = await this.states.take(state);
    if (!pending) return this.fail('expired');
    if (stateCookie !== state) return this.fail('failed');
    if (error || !code) return this.fail('failed');

    let identity: GoogleIdentity;
    try {
      identity = await this.google.exchangeCode(code, pending.codeVerifier);
    } catch (err) {
      this.logger.warn(`Đổi code Google thất bại: ${err instanceof Error ? err.message : String(err)}`);
      return this.fail('failed');
    }

    const email = identity.email.trim().toLowerCase();
    if (!identity.emailVerified || !isAllowedAdmin(email, this.env.ADMIN_EMAILS)) {
      this.logger.warn(`Từ chối đăng nhập admin: ${email}${identity.emailVerified ? '' : ' (email chưa xác minh)'}`);
      return this.fail('not_allowed');
    }

    const sid = await this.sessions.create({ email, subject: identity.subject, createdAt: new Date().toISOString() });
    this.logger.log(`Admin đăng nhập: ${email}`);
    return { ok: true, sid, redirectTo: this.adminUrl(pending.returnTo) };
  }

  async logout(sid: string | undefined): Promise<void> {
    await this.sessions.destroy(sid);
  }

  private fail(error: LoginError): LoginFinish {
    return { ok: false, error, redirectTo: this.adminUrl(`/dang-nhap?error=${error}`) };
  }

  /** Ghép đường dẫn với ADMIN_URL. Lớp chặn cuối: nếu kết quả lệch origin thì về trang chủ admin. */
  private adminUrl(path: string): string {
    const base = new URL(this.env.ADMIN_URL);
    const url = new URL(path, base);
    return url.origin === base.origin ? url.toString() : base.toString();
  }
}
