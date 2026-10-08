import { randomUUID } from 'node:crypto';
import type { ModuleMetadata } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import { configureApp } from '../app.setup';
import { ConfigModule } from '../config/config.module';
import { REDIS, RedisModule } from '../shared/redis/redis.module';
import { SessionModule } from '../shared/session/session.module';
import { SessionStore } from '../shared/session/session.store';
import type { TestApp } from './app';
import { testEnv } from './env';
import { TEST_URI } from './mongo';
import { connectTestRedis, dropTestRedis } from './redis';

/** Nguồn admin giả, nằm trong WEB_ORIGINS của app test. */
const ADMIN_ORIGIN = 'http://admin.gia-lap.example';

export interface AdminTestApp extends TestApp {
  /** Header Cookie có phiên admin hợp lệ (email nằm trong ADMIN_EMAILS của testEnv). */
  cookie: string;
  /** Origin gửi kèm request ghi dữ liệu. */
  origin: string;
}

/**
 * Dựng app Nest thật cho route quản trị: database riêng, Redis thật với tiền tố riêng, ConfigModule, SessionModule
 * và configureApp như main.ts; tạo sẵn một phiên admin. Chỉ dùng trong test.
 */
export async function createAdminTestApp(imports: NonNullable<ModuleMetadata['imports']>): Promise<AdminTestApp> {
  const env = testEnv({ WEB_ORIGINS: ADMIN_ORIGIN, ADMIN_URL: ADMIN_ORIGIN });
  const redis = await connectTestRedis();
  const dbName = `ranhduong_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const moduleRef = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(TEST_URI, { dbName, autoIndex: true, serverSelectionTimeoutMS: 3000 }),
      ConfigModule.register(env),
      RedisModule,
      SessionModule,
      ...imports,
    ],
  })
    .overrideProvider(REDIS)
    .useValue(redis)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, env.WEB_ORIGINS);
  await app.listen(0, '127.0.0.1');
  const sid = await app.get(SessionStore).create({
    email: 'quan-tri-gia-lap@example.com',
    subject: 'google-sub-quan-tri',
    createdAt: new Date().toISOString(),
  });
  const conn = app.get<Connection>(getConnectionToken());
  return {
    app,
    url: `${await app.getUrl()}/v1`,
    conn,
    cookie: `${env.SESSION_COOKIE_NAME}=${sid}`,
    origin: ADMIN_ORIGIN,
    close: async () => {
      await conn.dropDatabase();
      // Đóng Redis trước; RedisModule thấy kết nối đã đóng thì bỏ qua (như auth.http.test.ts).
      await dropTestRedis(redis);
      await app.close();
    },
  };
}
