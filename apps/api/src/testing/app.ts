import { randomUUID } from 'node:crypto';
import { type INestApplication, Module, type ModuleMetadata } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { configureApp } from '../app.setup';
import { TEST_URI } from './mongo';

export interface TestApp {
  app: INestApplication;
  /** Gốc API kèm prefix, ví dụ http://127.0.0.1:53211/v1 */
  url: string;
  conn: Connection;
  close(): Promise<void>;
}

/**
 * Dựng app Nest thật (cùng configureApp với main.ts) chỉ với các module cần test, trên một database riêng,
 * nghe ở cổng ngẫu nhiên. Bật autoIndex để unique index có hiệu lực như production.
 */
export async function createTestApp(imports: NonNullable<ModuleMetadata['imports']>, webOrigins: string[] = []): Promise<TestApp> {
  const dbName = `ranhduong_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;

  @Module({
    imports: [MongooseModule.forRoot(TEST_URI, { dbName, autoIndex: true, serverSelectionTimeoutMS: 3000 }), ...imports],
  })
  class TestAppModule {}

  const app = await NestFactory.create(TestAppModule, { logger: false });
  configureApp(app, webOrigins);
  await app.listen(0, '127.0.0.1');
  const conn = app.get<Connection>(getConnectionToken());
  return {
    app,
    url: `${await app.getUrl()}/v1`,
    conn,
    close: async () => {
      await conn.dropDatabase();
      await app.close();
    },
  };
}
