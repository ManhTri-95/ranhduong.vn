import { randomUUID } from 'node:crypto';
import { TicketJob } from '@ranhduong/contracts';
import { Queue, UnrecoverableError, Worker } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { queueRedisOptions } from '../../shared/redis/queue-connection';
import { testEnv } from '../../testing/env';
import { TICKET_QUEUE, TicketQueue } from './ticket.queue';

// Dữ liệu giả, tên rõ là giả.
const job = (hash: string) => TicketJob.parse({
  itineraryId: '0123456789abcdef01234567', hash,
  data: { cityName: 'Thành phố Giả Lập', title: 'Lịch trình Giả Lập', days: 1, transport: 'motorbike', season: '', accent: '#E9B824',
    stops: [], stopTotal: 0, shortLink: 'ranhduong.vn/da-lat/lich-trinh/gia-lap', qrUrl: 'https://ranhduong.vn/da-lat/lich-trinh/gia-lap?utm_source=ticket' },
});

describe('S30 hàng đợi vé với Redis thật', () => {
  const env = testEnv({ REDIS_URL: process.env.REDIS_TEST_URL ?? 'redis://localhost:6379' });
  const prefix = `s30-test-${randomUUID()}`;
  let queue: TicketQueue;
  let inspect: Queue;
  beforeAll(() => {
    queue = new TicketQueue(env, prefix);
    inspect = new Queue(TICKET_QUEUE, { prefix, connection: queueRedisOptions(env.REDIS_URL) });
  });
  afterAll(async () => {
    await queue.onApplicationShutdown();
    await inspect.obliterate({ force: true });
    await inspect.close();
  });

  it('cùng hash gọi hai lần chỉ có một job, retry 2 lần', async () => {
    await queue.request(job('a'.repeat(32)));
    await queue.request(job('a'.repeat(32)));
    expect((await inspect.getJobs(['waiting'])).filter((j) => j.id === `ticket-${'a'.repeat(32)}`)).toHaveLength(1);
    const stored = await inspect.getJob(`ticket-${'a'.repeat(32)}`);
    expect(stored?.opts.attempts).toBe(3);
    expect(stored?.name).toBe('itinerary.ticket');
    expect(stored?.data).toEqual(job('a'.repeat(32)));
  });
  it('hai hash khác nhau thành hai job', async () => {
    await queue.request(job('b'.repeat(32)));
    expect(await inspect.getJob(`ticket-${'b'.repeat(32)}`)).toBeDefined();
    expect(await inspect.getJob(`ticket-${'a'.repeat(32)}`)).toBeDefined();
  });
  it('job đã failed được chạy lại khi có request mới', async () => {
    const id = `ticket-${'d'.repeat(32)}`;
    await inspect.drain();
    await queue.request(job('d'.repeat(32)));
    const worker = new Worker(TICKET_QUEUE, async () => { throw new UnrecoverableError('Lỗi giả lập'); },
      { prefix, connection: { ...queueRedisOptions(env.REDIS_URL), maxRetriesPerRequest: null } });
    const deadline = Date.now() + 10_000;
    while (await (await inspect.getJob(id))?.getState() !== 'failed') {
      if (Date.now() > deadline) throw new Error('Job chưa failed');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await worker.close();
    await queue.request(job('d'.repeat(32)));
    expect(await (await inspect.getJob(id))?.getState()).toBe('waiting');
  });
});
