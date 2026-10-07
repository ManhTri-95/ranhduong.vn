import { createLocalJWKSet, exportJWK, generateKeyPair, type JWTPayload, SignJWT } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GoogleOAuthClient, GoogleOAuthError } from './google-oauth.client';

const CLIENT_ID = 'client-id-gia-lap.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:3101/v1/auth/google/callback';
type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

let googleKey: KeyPair;
let otherKey: KeyPair;
let jwks: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  googleKey = await generateKeyPair('RS256');
  otherKey = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(googleKey.publicKey)), kid: 'khoa-gia-lap', alg: 'RS256' }] });
});

interface TokenOptions {
  claims?: JWTPayload;
  issuer?: string;
  audience?: string;
  /** Giây so với hiện tại; âm là đã hết hạn. */
  expiresInS?: number;
  key?: KeyPair;
}

/** id_token giả, cấu trúc giống id_token Google. */
async function idToken(o: TokenOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: 'Quan-Tri-Gia-Lap@Example.com', email_verified: true, ...o.claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'khoa-gia-lap' })
    .setSubject('google-sub-gia-lap-1')
    .setIssuer(o.issuer ?? 'https://accounts.google.com')
    .setAudience(o.audience ?? CLIENT_ID)
    .setIssuedAt(now - 60)
    .setExpirationTime(now + (o.expiresInS ?? 300))
    .sign((o.key ?? googleKey).privateKey);
}

function tokenEndpoint(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function client(fetchImpl: typeof fetch) {
  return new GoogleOAuthClient({ clientId: CLIENT_ID, clientSecret: 'client-secret-gia-lap', redirectUri: REDIRECT_URI, fetch: fetchImpl, jwks });
}

describe('GoogleOAuthClient.authorizeUrl', () => {
  it('tạo URL Authorization Code + PKCE S256, chỉ xin openid email, luôn cho chọn tài khoản', () => {
    const url = new URL(client(tokenEndpoint({})).authorizeUrl({ state: 'state-gia-lap', codeChallenge: 'challenge-gia-lap' }));
    expect(`${url.origin}${url.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email',
      state: 'state-gia-lap',
      code_challenge: 'challenge-gia-lap',
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
  });
});

describe('GoogleOAuthClient.exchangeCode', () => {
  it('gửi code, code_verifier, client secret tới token endpoint và trả danh tính đã xác minh', async () => {
    const fetchMock = tokenEndpoint({ id_token: await idToken(), access_token: 'ya29.gia-lap', token_type: 'Bearer', expires_in: 3599 });
    const identity = await client(fetchMock).exchangeCode('code-gia-lap', 'verifier-gia-lap');
    expect(identity).toEqual({ subject: 'google-sub-gia-lap-1', email: 'quan-tri-gia-lap@example.com', emailVerified: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init?.method).toBe('POST');
    expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
      code: 'code-gia-lap',
      code_verifier: 'verifier-gia-lap',
      client_id: CLIENT_ID,
      client_secret: 'client-secret-gia-lap',
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });
  });

  it('email chưa xác minh thì trả emailVerified false để service từ chối', async () => {
    const identity = await client(tokenEndpoint({ id_token: await idToken({ claims: { email_verified: false } }) })).exchangeCode('c', 'v');
    expect(identity.emailVerified).toBe(false);
  });

  // Tuỳ chọn tạo bằng hàm vì otherKey chỉ có giá trị sau beforeAll.
  it.each<[string, () => TokenOptions]>([
    ['ký bằng khoá không phải của Google', () => ({ key: otherKey })],
    ['audience của app khác', () => ({ audience: 'client-khac.apps.googleusercontent.com' })],
    ['issuer lạ', () => ({ issuer: 'https://gia-lap.example' })],
    ['đã hết hạn', () => ({ expiresInS: -60 })],
  ])('từ chối id_token %s', async (_label, options) => {
    const token = await idToken(options());
    await expect(client(tokenEndpoint({ id_token: token })).exchangeCode('c', 'v')).rejects.toThrow();
  });

  it('token endpoint trả lỗi, thiếu id_token hoặc id_token thiếu email thì ném GoogleOAuthError', async () => {
    await expect(client(tokenEndpoint({ error: 'invalid_grant' }, 400)).exchangeCode('c', 'v')).rejects.toBeInstanceOf(GoogleOAuthError);
    await expect(client(tokenEndpoint({ access_token: 'x' })).exchangeCode('c', 'v')).rejects.toBeInstanceOf(GoogleOAuthError);
    const noEmail = await idToken({ claims: { email: undefined } });
    await expect(client(tokenEndpoint({ id_token: noEmail })).exchangeCode('c', 'v')).rejects.toBeInstanceOf(GoogleOAuthError);
  });
});
