import { describe, expect, it } from 'vitest';
import { clearSessionCookieOptions, sessionCookieOptions } from './session-cookie';
import { SESSION_TTL_S } from './session.store';

const LOCAL = { API_PUBLIC_URL: 'http://localhost:3101', SESSION_COOKIE_DOMAIN: undefined };
const PROD = { API_PUBLIC_URL: 'https://api.ranhduong.vn', SESSION_COOKIE_DOMAIN: '.ranhduong.vn' };

describe('cookie phiên', () => {
  it('local http: HttpOnly, SameSite=Lax, không Secure, không Domain, sống 30 ngày', () => {
    expect(sessionCookieOptions(LOCAL)).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: SESSION_TTL_S * 1000 });
  });
  it('production https: Secure và Domain=.ranhduong.vn', () => {
    expect(sessionCookieOptions(PROD)).toMatchObject({ secure: true, domain: '.ranhduong.vn' });
  });
  it('xoá cookie dùng cùng path và domain như lúc đặt', () => {
    expect(clearSessionCookieOptions(PROD)).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', domain: '.ranhduong.vn' });
  });
});
