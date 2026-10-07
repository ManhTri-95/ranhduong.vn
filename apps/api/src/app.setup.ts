import type { INestApplication } from '@nestjs/common';
import { ApiExceptionFilter } from './shared/http/api-exception.filter';
import { OriginGuard } from './shared/http/origin.guard';

/**
 * Cấu hình dùng chung cho main.ts và test: prefix /v1, CORS có credentials cho WEB_ORIGINS, định dạng lỗi chung,
 * và request ghi dữ liệu phải có Origin thuộc WEB_ORIGINS (ADR 0009).
 */
export function configureApp(app: INestApplication, webOrigins: string[]): void {
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: webOrigins, credentials: true });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalGuards(new OriginGuard(webOrigins));
}
