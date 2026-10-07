import type { INestApplication } from '@nestjs/common';
import { ApiExceptionFilter } from './shared/http/api-exception.filter';

/** Cấu hình dùng chung cho main.ts và test: prefix /v1, CORS có credentials cho WEB_ORIGINS, định dạng lỗi chung. */
export function configureApp(app: INestApplication, webOrigins: string[]): void {
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: webOrigins, credentials: true });
  app.useGlobalFilters(new ApiExceptionFilter());
}
