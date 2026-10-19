import { Inject, Injectable, Logger, Optional, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { TicketJob } from '@ranhduong/contracts';
import { UnrecoverableError, Worker } from 'bullmq';
import { ZodError } from 'zod';
import { ENV, type Env } from '../../config/env';
import { queueRedisOptions } from '../../shared/redis/queue-connection';
import { TICKET_QUEUE, TICKET_QUEUE_PREFIX } from './ticket.queue';
import { InvalidTicketJob, TicketsService } from './tickets.service';

/** Worker dựng vé (chỉ chạy trong entrypoint worker); dựng vé tốn CPU nên mỗi lần một job. */
@Injectable()
export class TicketProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TicketProcessor.name);
  private worker?: Worker;
  constructor(@Inject(ENV) private readonly env: Env, @Inject(TicketsService) private readonly tickets: Pick<TicketsService, 'generate'>,
    @Optional() @Inject(TICKET_QUEUE_PREFIX) private readonly prefix = 'bull') {}
  onModuleInit(): void {
    this.worker = new Worker(TICKET_QUEUE, async (job) => {
      try { await this.tickets.generate(TicketJob.parse(job.data)); }
      catch (err) {
        if (err instanceof ZodError || err instanceof InvalidTicketJob) throw new UnrecoverableError('Job vé không hợp lệ');
        throw err;
      }
    }, { prefix: this.prefix, connection: { ...queueRedisOptions(this.env.REDIS_URL), maxRetriesPerRequest: null }, concurrency: 1 });
    this.worker.on('error', () => this.logger.error('Worker vé chưa kết nối được Redis.'));
    this.worker.on('failed', (job, err) => this.logger.warn(`Chưa dựng được vé ${job?.id ?? ''}: ${err.message}`));
  }
  async onApplicationShutdown(): Promise<void> { await this.worker?.close(); }
}
