import { type CanActivate, type ExecutionContext, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from './api-exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Chống CSRF cùng với SameSite=Lax (ADR 0009): request ghi dữ liệu phải có Origin nằm trong WEB_ORIGINS.
 * configureApp tự tạo guard này bằng `new`, không đăng ký qua DI.
 */
export class OriginGuard implements CanActivate {
  constructor(private readonly webOrigins: readonly string[]) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin !== undefined && this.webOrigins.includes(origin)) return true;
    throw new ApiException('FORBIDDEN', HttpStatus.FORBIDDEN, 'Nguồn gửi request không được phép.');
  }
}
