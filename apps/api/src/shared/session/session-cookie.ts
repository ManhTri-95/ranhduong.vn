import type { CookieOptions } from 'express';
import type { Env } from '../../config/env';
import { SESSION_TTL_S } from './session.store';

type CookieEnv = Pick<Env, 'API_PUBLIC_URL' | 'SESSION_COOKIE_DOMAIN'>;

/** Cookie chỉ gửi qua https khi API chạy https; local http thì tắt để trình duyệt vẫn lưu. */
export function cookieSecure(env: Pick<Env, 'API_PUBLIC_URL'>): boolean {
  return env.API_PUBLIC_URL.startsWith('https://');
}

/** Thuộc tính dùng cả khi đặt lẫn khi xoá, để trình duyệt xoá đúng cookie (ADR 0009). */
export function clearSessionCookieOptions(env: CookieEnv): CookieOptions {
  return {
    httpOnly: true,
    secure: cookieSecure(env),
    sameSite: 'lax',
    path: '/',
    ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
  };
}

/** Cookie phiên sống bằng TTL phiên trong Redis. */
export function sessionCookieOptions(env: CookieEnv): CookieOptions {
  return { ...clearSessionCookieOptions(env), maxAge: SESSION_TTL_S * 1000 };
}
