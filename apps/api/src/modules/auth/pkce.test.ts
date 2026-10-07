import { describe, expect, it } from 'vitest';
import { codeChallengeS256, createPkcePair } from './pkce';

describe('PKCE', () => {
  it('challenge S256 khớp ví dụ trong RFC 7636 phụ lục B', () => {
    expect(codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('verifier 43 ký tự hợp lệ, mỗi lần một cặp mới', () => {
    const a = createPkcePair();
    const b = createPkcePair();
    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.challenge).toBe(codeChallengeS256(a.verifier));
    expect(a.verifier).not.toBe(b.verifier);
  });
});
