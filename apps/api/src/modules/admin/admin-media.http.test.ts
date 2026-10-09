import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MAX_PHOTO_BYTES } from '@ranhduong/contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../../app.setup';
import { ConfigModule } from '../../config/config.module';
import { REDIS, RedisModule } from '../../shared/redis/redis.module';
import { SessionModule } from '../../shared/session/session.module';
import { SessionStore } from '../../shared/session/session.store';
import { testEnv } from '../../testing/env';
import { connectTestRedis, dropTestRedis } from '../../testing/redis';
import { MediaService } from '../media/media.service';
import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';

const ADMIN = 'http://admin.gia-lap.example';
const ID = '0123456789abcdef01234567';
const EMAIL = 'quan-tri-gia-lap@example.com';
const input = { contentType: 'image/jpeg', size: 1024, source: 'owner', credit: 'Quán Giả Lập', license: 'Được phép' };

describe('S06 HTTP guard và validation', () => {
  let app: INestApplication;
  let redis: Awaited<ReturnType<typeof connectTestRedis>>;
  let base: string;
  let cookie: string;
  const adminMedia = { create: vi.fn(), attach: vi.fn() };
  const media = { complete: vi.fn(), status: vi.fn() };
  beforeAll(async () => {
    const env = testEnv({ WEB_ORIGINS: ADMIN });
    redis = await connectTestRedis();
    const module = await Test.createTestingModule({
      imports: [ConfigModule.register(env), RedisModule, SessionModule],
      controllers: [AdminMediaController],
      providers: [{ provide: AdminMediaService, useValue: adminMedia }, { provide: MediaService, useValue: media }],
    }).overrideProvider(REDIS).useValue(redis).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app, [ADMIN]);
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/v1/admin`;
    cookie = `sid=${await app.get(SessionStore).create({ email: EMAIL, subject: 'gia-lap', createdAt: new Date().toISOString() })}`;
  });
  afterAll(async () => { await dropTestRedis(redis); await app.close(); });
  const post = (path: string, body: unknown, headers: Record<string, string> = { origin: ADMIN, cookie }) =>
    fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  it('không có phiên: 401; origin không hợp lệ: 403', async () => {
    for (const path of [`/places/${ID}/photos/upload-url`, `/places/${ID}/photos`, `/media/${randomUUID()}/complete`]) {
      expect((await post(path, input, { origin: ADMIN })).status).toBe(401);
      expect((await post(path, input, { origin: 'http://ke-la.example', cookie })).status).toBe(403);
    }
    expect((await fetch(`${base}/media/${randomUUID()}`)).status).toBe(401);
  });
  it('chặn loại ảnh, size, nguồn, ID sai trước khi gọi service', async () => {
    for (const body of [{ ...input, size: MAX_PHOTO_BYTES }, { ...input, contentType: 'image/gif' }, { ...input, source: undefined }, { ...input, credit: '' }]) {
      const response = await post(`/places/${ID}/photos/upload-url`, body);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    }
    expect((await post('/places/khong-hop-le/photos/upload-url', input)).status).toBe(400);
    expect((await post(`/places/${ID}/photos`, { uploadId: '../../gia-lap' })).status).toBe(400);
    expect(adminMedia.create).not.toHaveBeenCalled();
  });
  it('phiên hợp lệ truyền đúng email vào service', async () => {
    adminMedia.create.mockResolvedValue({ uploadId: randomUUID() });
    expect((await post(`/places/${ID}/photos/upload-url`, input)).status).toBe(201);
    expect(adminMedia.create).toHaveBeenCalledWith(ID, input, EMAIL);
  });
});
