import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { z } from 'zod';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Danh tính lấy từ id_token đã xác minh chữ ký, issuer, audience và hạn dùng. */
export interface GoogleIdentity {
  subject: string;
  /** Đã đổi sang chữ thường. */
  email: string;
  emailVerified: boolean;
}

/** Cổng tới Google OAuth, đồng thời là token DI; test thay bằng bản giả. */
export abstract class GoogleOAuth {
  abstract authorizeUrl(params: { state: string; codeChallenge: string }): string;
  abstract exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity>;
}

export interface GoogleOAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Test truyền fetch giả và bộ khoá cục bộ; mặc định gọi Google thật. */
  fetch?: typeof fetch;
  jwks?: JWTVerifyGetKey;
}

export class GoogleOAuthError extends Error {}

const TokenResponse = z.object({ id_token: z.string().min(1) });
const IdTokenClaims = z.object({ sub: z.string().min(1), email: z.email(), email_verified: z.boolean() });

export class GoogleOAuthClient extends GoogleOAuth {
  private readonly fetchFn: typeof fetch;
  private readonly jwks: JWTVerifyGetKey;

  constructor(private readonly options: GoogleOAuthOptions) {
    super();
    this.fetchFn = options.fetch ?? ((input, init) => fetch(input, init));
    this.jwks = options.jwks ?? createRemoteJWKSet(new URL(JWKS_URL));
  }

  authorizeUrl({ state, codeChallenge }: { state: string; codeChallenge: string }): string {
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleIdentity> {
    const res = await this.fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        code_verifier: codeVerifier,
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        redirect_uri: this.options.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new GoogleOAuthError(`Google trả HTTP ${res.status} khi đổi code`);
    const token = TokenResponse.safeParse(await res.json());
    if (!token.success) throw new GoogleOAuthError('Phản hồi token của Google thiếu id_token');

    const { payload } = await jwtVerify(token.data.id_token, this.jwks, {
      issuer: ISSUERS,
      audience: this.options.clientId,
      algorithms: ['RS256'],
    });
    const claims = IdTokenClaims.safeParse(payload);
    if (!claims.success) throw new GoogleOAuthError('id_token thiếu sub, email hoặc email_verified');
    return { subject: claims.data.sub, email: claims.data.email.toLowerCase(), emailVerified: claims.data.email_verified };
  }
}
