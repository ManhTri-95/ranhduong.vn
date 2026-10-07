import { type CanActivate, createParamDecorator, type ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ENV, type Env } from '../../config/env';
import { ApiException } from '../http/api-exception';
import { readCookie } from '../http/cookies';
import { isAllowedAdmin } from './admin-emails';
import { sessionCookieOptions } from './session-cookie';
import { type SessionData, SessionStore } from './session.store';

const SESSION = Symbol('adminSession');
type RequestWithSession = Request & { [SESSION]?: SessionData };

/**
 * Chặn route quản trị: cần cookie phiên hợp lệ (401), và email vẫn nằm trong ADMIN_EMAILS (403).
 * Danh sách được kiểm lại ở mỗi request: bỏ một email khỏi ADMIN_EMAILS rồi khởi động lại API là thu hồi quyền ngay.
 * Qua guard thì cookie được đặt lại, để cookie trượt 30 ngày cùng TTL trong Redis.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly sessions: SessionStore,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<RequestWithSession>();
    const sid = readCookie(req.headers.cookie, this.env.SESSION_COOKIE_NAME);
    const session = await this.sessions.get(sid);
    if (!sid || !session) {
      throw new ApiException('UNAUTHENTICATED', HttpStatus.UNAUTHORIZED, 'Bạn cần đăng nhập để dùng trang quản trị.');
    }
    if (!isAllowedAdmin(session.email, this.env.ADMIN_EMAILS)) {
      throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, 'Email này không có quyền quản trị.');
    }
    http.getResponse<Response>().cookie(this.env.SESSION_COOKIE_NAME, sid, sessionCookieOptions(this.env));
    req[SESSION] = session;
    return true;
  }
}

/** Phiên admin của request; chỉ dùng trên route có AdminGuard. */
export const CurrentSession = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionData => {
  const session = ctx.switchToHttp().getRequest<RequestWithSession>()[SESSION];
  if (!session) throw new Error('CurrentSession chỉ dùng sau AdminGuard');
  return session;
});
