import { randomUUID } from 'node:crypto';
import { TicketJob } from '@ranhduong/contracts';
import { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { queueRedisOptions } from '../../shared/redis/queue-connection';
import { testEnv } from '../../testing/env';
import { TicketProcessor } from './ticket.processor';
import { TICKET_QUEUE } from './ticket.queue';
import type { TicketsService } from './tickets.service';

// Dữ liệu giả, tên rõ là giả.
const job = (hash: string) => TicketJob.parse({
  itineraryId: '0123456789abcdef01234567', hash,
  data: { cityName: 'Thành phố Giả Lập', title: 'Lịch trình Giả Lập', days: 1, transport: 'motorbike', season: '', accent: '#E9B824',
    stops: [], stopTotal: 0, shortLink: 'ranhduong.vn/da-lat/lich-trinh/gia-lap', qrUrl: 'https://ranhduong.vn/da-lat/lich-trinh/gia-lap?utm_source=ticket' },
});

describe('S30 worker vé với Redis thật, service giả', () => {
  const env = testEnv({ REDIS_URL: process.env.REDIS_TEST_URL ?? 'redis://localhost:6379' });
  const prefix = `s30-worker-${randomUUID()}`;
  const generate = vi.fn<TicketsService['generate']>(async () => undefined);
  let queue: Queue;
  let processor: TicketProcessor;
  beforeAll(() => {
    queue = new Queue(TICKET_QUEUE, { prefix, connection: queueRedisOptions(env.REDIS_URL) });
    processor = new TicketProcessor(env, { generate }, prefix);
    processor.onModuleInit();
  });
  afterAll(async () => {
    await processor.onApplicationShutdown();
    await queue.obliterate({ force: true });
    await queue.close();
  });
  async function settle(id: string, expected: 'completed' | 'failed') {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const state = await (await queue.getJob(id))?.getState();
      if (state === expected || (expected === 'completed' && state === undefined)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Job ${id} chưa ${expected}`);
  }
  const add = (id: string, data: unknown, attempts = 3) => queue.add('itinerary.ticket', data, { jobId: id, attempts, backoff: { type: 'fixed', delay: 50 } });

  it('job hợp lệ gọi generate một lần với job đã parse', async () => {
    generate.mockReset().mockResolvedValue(undefined);
    await add('hop-le', job('a'.repeat(32)));
    await settle('hop-le', 'completed');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(job('a'.repeat(32)));
  });
  it('payload sai thành failed sau 1 lần thử, không gọi generate', async () => {
    generate.mockReset();
    await add('sai', { ...job('b'.repeat(32)), hash: 'x' });
    await settle('sai', 'failed');
    expect((await queue.getJob('sai'))?.attemptsMade).toBe(1);
    expect(generate).not.toHaveBeenCalled();
  });
  it('lỗi tạm thời hai lần thì thành công ở lần thứ ba', async () => {
    generate.mockReset().mockRejectedValueOnce(new Error('R2 giả lập')).mockRejectedValueOnce(new Error('R2 giả lập')).mockResolvedValue(undefined);
    await add('tam-thoi', job('c'.repeat(32)));
    await settle('tam-thoi', 'completed');
    expect(generate).toHaveBeenCalledTimes(3);
  });
});
