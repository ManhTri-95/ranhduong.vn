import type { INestApplication } from '@nestjs/common';
import { ApiExceptionFilter } from './shared/http/api-exception.filter';
import { OriginGuard } from './shared/http/origin.guard';
import type { Express } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

/**
 * Cấu hình dùng chung cho main.ts và test: prefix /v1, CORS có credentials cho WEB_ORIGINS, định dạng lỗi chung,
 * và request ghi dữ liệu phải có Origin thuộc WEB_ORIGINS (ADR 0009).
 */
export function configureApp(app: INestApplication, webOrigins: string[], trustedProxyCidrs: string[] = []): void {
  const instance: Express = app.getHttpAdapter().getInstance();
  // CSV tối đa 256 KiB; JSON có thể dài hơn sau escape. Dùng parser của adapter Nest đang cài.
  const adapter = app.getHttpAdapter();
  if (adapter instanceof ExpressAdapter) adapter.useBodyParser('json', false, { limit: '1mb' });
  instance.set('trust proxy', trustedProxyCidrs.length ? trustedProxyCidrs : false);
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: webOrigins, credentials: true });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalGuards(new OriginGuard(webOrigins));
}
