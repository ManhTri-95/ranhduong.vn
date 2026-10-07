import { randomBytes } from 'node:crypto';

/** Chuỗi ngẫu nhiên 32 byte dạng base64url (43 ký tự): sid, state OAuth, code_verifier PKCE. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export const RANDOM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
