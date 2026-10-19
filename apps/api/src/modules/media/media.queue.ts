import { Inject, Injectable, Logger, Optional, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENV, type Env } from '../../config/env';
import { queueRedisOptions } from '../../shared/redis/queue-connection';

export const MEDIA_QUEUE = 'media-scan';
export const MEDIA_QUEUE_PREFIX = Symbol('MEDIA_QUEUE_PREFIX');

@Injectable()
export class MediaQueue implements OnApplicationShutdown {
  private readonly logger = new Logger(MediaQueue.name);
  private readonly queue: Queue;
  constructor(@Inject(ENV) env: Env, @Optional() @Inject(MEDIA_QUEUE_PREFIX) prefix = 'bull') {
    this.queue = new Queue(MEDIA_QUEUE, { prefix, connection: { ...queueRedisOptions(env.REDIS_URL), maxRetriesPerRequest: 3 } });
    this.queue.on('error', () => this.logger.error('Hàng đợi ảnh chưa kết nối được Redis.'));
  }
  async enqueue(uploadId: string): Promise<void> {
    await this.queue.add('media.scan', { uploadId }, {
      jobId: uploadId, attempts: 3, backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 }, removeOnFail: { age: 7 * 86400 },
    });
  }
  async hasFailed(id: string): Promise<boolean> {
    const job = await this.queue.getJob(id);
    return job !== undefined && await job.getState() === 'failed';
  }
  async enqueueRemoval(uploadId: string): Promise<void> {
    const jobId = `delete-${uploadId}`;
    const old = await this.queue.getJob(jobId);
    if (old && await old.getState() === 'failed') { await old.retry(); return; }
    await this.queue.add('media.delete', { uploadId }, {
      jobId, attempts: 3, backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true, removeOnFail: { age: 7 * 86400 },
    });
  }
  async onApplicationShutdown(): Promise<void> { await this.queue.close(); }
}
