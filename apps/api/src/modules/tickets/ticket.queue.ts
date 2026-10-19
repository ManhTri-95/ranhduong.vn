import { Inject, Injectable, Logger, Optional, type OnApplicationShutdown } from '@nestjs/common';
import type { TicketJob } from '@ranhduong/contracts';
import { Queue } from 'bullmq';
import { ENV, type Env } from '../../config/env';
import { queueRedisOptions } from '../../shared/redis/queue-connection';

export const TICKET_QUEUE = 'itinerary-ticket';
export const TICKET_QUEUE_PREFIX = Symbol('TICKET_QUEUE_PREFIX');

/** Job `itinerary.ticket` (technical-design mục 10): mỗi nội dung vé một job, theo hash. */
@Injectable()
export class TicketQueue implements OnApplicationShutdown {
  private readonly logger = new Logger(TicketQueue.name);
  private readonly queue: Queue;
  constructor(@Inject(ENV) env: Env, @Optional() @Inject(TICKET_QUEUE_PREFIX) prefix = 'bull') {
    this.queue = new Queue(TICKET_QUEUE, { prefix, connection: { ...queueRedisOptions(env.REDIS_URL), maxRetriesPerRequest: 3 } });
    this.queue.on('error', () => this.logger.error('Hàng đợi vé chưa kết nối được Redis.'));
  }

  /**
   * Xếp job dựng vé; nhiều request cùng nội dung chỉ thành một job. Job xong bị xoá ngay, nên nội dung quay về bản cũ
   * (ảnh đã bị xoá) vẫn xếp lại được; job đã failed thì chạy lại.
   */
  async request(job: TicketJob): Promise<void> {
    const jobId = `ticket-${job.hash}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      if (await existing.getState() === 'failed') await existing.retry();
      return;
    }
    await this.queue.add('itinerary.ticket', job, {
      jobId, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: { age: 7 * 86400 },
    });
  }

  async onApplicationShutdown(): Promise<void> { await this.queue.close(); }
}
