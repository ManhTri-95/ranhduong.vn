import { createHash } from 'node:crypto';
import { randomToken } from '../../shared/crypto/random-token';

/** PKCE S256 (RFC 7636): challenge = base64url(SHA-256(verifier)). */
export function codeChallengeS256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Verifier 43 ký tự base64url, đúng giới hạn 43–128 ký tự của RFC 7636. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken();
  return { verifier, challenge: codeChallengeS256(verifier) };
}
