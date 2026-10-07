import { Controller, Get, HttpCode, Inject, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminSession } from '@ranhduong/contracts';
import type { CookieOptions, Request, Response } from 'express';
import { ENV, type Env } from '../../config/env';
import { readCookie } from '../../shared/http/cookies';
import { AdminGuard, CurrentSession } from '../../shared/session/admin.guard';
import { clearSessionCookieOptions, cookieSecure, sessionCookieOptions } from '../../shared/session/session-cookie';
import type { SessionData } from '../../shared/session/session.store';
import { AuthService } from './auth.service';
import { OAUTH_STATE_TTL_S } from './oauth-state.store';

/** Cookie gắn state với trình duyệt đã bắt đầu đăng nhập: host-only, sống 10 phút như state trong Redis. */
const OAUTH_STATE_COOKIE = 'rd_oauth_state';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Admin mở URL này bằng điều hướng toàn trang (thẻ <a>), không gọi bằng fetch. */
  @Get('google/start')
  async start(@Query('returnTo') returnTo: unknown, @Res() res: Response): Promise<void> {
    const { state, redirectUrl } = await this.auth.start(returnTo);
    res.cookie(OAUTH_STATE_COOKIE, state, { ...this.stateCookie(), maxAge: OAUTH_STATE_TTL_S * 1000 });
    res.redirect(302, redirectUrl);
  }

  @Get('google/callback')
  async callback(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const result = await this.auth.finish(query, readCookie(req.headers.cookie, OAUTH_STATE_COOKIE));
    res.clearCookie(OAUTH_STATE_COOKIE, this.stateCookie());
    if (result.ok) res.cookie(this.env.SESSION_COOKIE_NAME, result.sid, sessionCookieOptions(this.env));
    res.redirect(302, result.redirectTo);
  }

  @Get('session')
  @UseGuards(AdminGuard)
  session(@CurrentSession() session: SessionData): AdminSession {
    return AdminSession.parse(session);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readCookie(req.headers.cookie, this.env.SESSION_COOKIE_NAME));
    res.clearCookie(this.env.SESSION_COOKIE_NAME, clearSessionCookieOptions(this.env));
  }

  private stateCookie(): CookieOptions {
    return { httpOnly: true, secure: cookieSecure(this.env), sameSite: 'lax', path: '/' };
  }
}
