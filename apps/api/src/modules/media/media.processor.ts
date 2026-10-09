import { Inject, Injectable, Logger, Optional, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { UploadId } from '@ranhduong/contracts';
import { UnrecoverableError, Worker } from 'bullmq';
import { ENV, type Env } from '../../config/env';
import { InvalidPhoto } from './media-image';
import { MEDIA_QUEUE, MEDIA_QUEUE_PREFIX, mediaRedisOptions } from './media.queue';
import { MediaService } from './media.service';

@Injectable()
export class MediaProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(MediaProcessor.name);
  private worker?: Worker;
  private removalTimer?: ReturnType<typeof setInterval>;
  constructor(@Inject(ENV) private readonly env: Env, private readonly media: MediaService,
    @Optional() @Inject(MEDIA_QUEUE_PREFIX) private readonly prefix = 'bull') {}
  onModuleInit(): void {
    this.worker = new Worker<{ uploadId: string }>(MEDIA_QUEUE, async (job) => {
      const id = UploadId.parse(job.data.uploadId);
      if (job.name === 'media.delete') { await this.media.removeUpload(id); return; }
      try { await this.media.scan(id); }
      catch (err) {
        if (err instanceof InvalidPhoto) throw new UnrecoverableError(err.message);
        throw err;
      }
    }, { prefix: this.prefix, connection: { ...mediaRedisOptions(this.env.REDIS_URL), maxRetriesPerRequest: null }, concurrency: 1 });
    this.worker.on('error', () => this.logger.error('Worker ảnh chưa kết nối được Redis.'));
    this.worker.on('failed', (job, err) => {
      if (job?.name === 'media.delete') return;
      if (!job || (err.name !== 'UnrecoverableError' && job.attemptsMade < (job.opts.attempts ?? 1))) return;
      void this.media.fail(job.data.uploadId).catch(() => this.logger.error('Chưa lưu được trạng thái ảnh lỗi.'));
    });
    const reconcile = () => { void this.media.enqueueRemovals().catch(() => this.logger.error('Chưa xếp được job dọn ảnh; sẽ thử lại.')); };
    reconcile();
    this.removalTimer = setInterval(reconcile, 60_000);
    this.removalTimer.unref();
  }
  async onApplicationShutdown(): Promise<void> { clearInterval(this.removalTimer); await this.worker?.close(); }
}
