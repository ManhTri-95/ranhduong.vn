import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testEnv } from '../../testing/env';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { MediaProcessor } from './media.processor';
import { MEDIA_QUEUE, MediaQueue, mediaRedisOptions } from './media.queue';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';
import { MEDIA_UPLOAD_MODEL, MediaUploadSchema } from './schemas/media-upload.schema';

describe('S06 worker với Mongo/Redis thật, storage giả', () => {
  const env = testEnv({ REDIS_URL: process.env.REDIS_TEST_URL ?? 'redis://localhost:6379' });
  const prefix = `s06-test-${randomUUID()}`;
  let db: Awaited<ReturnType<typeof connectTestDb>>;
  let queue: MediaQueue;
  let inspect: Queue;
  let processor: MediaProcessor;
  let service: MediaService;
  let bytes: Buffer;
  let reads = 0;
  let transientFailures = 0;
  beforeAll(async () => {
    db = await connectTestDb();
    bytes = await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#123456' } }).png().toBuffer();
    queue = new MediaQueue(env, prefix);
    inspect = new Queue(MEDIA_QUEUE, { prefix, connection: mediaRedisOptions(env.REDIS_URL) });
    service = new MediaService(new MediaRepository(db.model(MEDIA_UPLOAD_MODEL, MediaUploadSchema)), {
      presign: async () => 'http://r2.gia-lap.example/upload',
      read: async () => { reads++; if (transientFailures-- > 0) throw new Error('R2 gián đoạn giả lập'); return bytes; },
      writeVariant: async () => undefined,
      deleteOriginal: async () => undefined,
      deleteVariants: async () => undefined,
    }, queue);
    processor = new MediaProcessor(env, service, prefix);
    processor.onModuleInit();
  });
  afterAll(async () => {
    await processor.onApplicationShutdown();
    await queue.onApplicationShutdown();
    await inspect.obliterate({ force: true });
    await inspect.close();
    await dropTestDb(db);
  });
  async function upload() {
    const result = await service.create({ placeId: '0123456789abcdef01234567', cityId: '1123456789abcdef01234567', email: 'admin-gia-lap@example.com' }, {
      contentType: 'image/png', size: bytes.length, source: 'owner', credit: 'Quán Giả Lập', license: 'Được phép',
    });
    await service.complete(result.uploadId, 'admin-gia-lap@example.com');
    return result.uploadId;
  }
  async function finished(id: string, expected: 'ready' | 'failed') {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if ((await service.status(id, 'admin-gia-lap@example.com')).status === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Worker chưa đạt ${expected}`);
  }
  it('consumer xử lý job và retry lỗi storage tạm thời đúng hai lần', async () => {
    reads = 0;
    transientFailures = 2;
    const id = await upload();
    await finished(id, 'ready');
    expect(reads).toBe(3);
    expect((await inspect.getJob(id))?.opts.attempts).toBe(3);
  });
  it('hết retries thì failed; không để UI chờ queued mãi', async () => {
    reads = 0;
    transientFailures = 9;
    const id = await upload();
    await finished(id, 'failed');
    expect(reads).toBe(3);
  });
});
