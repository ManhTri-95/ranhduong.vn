import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { metricsDayKey } from '@ranhduong/contracts';
import { MetricsService } from './metrics.service';

export function nextMetricsRollup(now: Date): Date {
  const today = new Date(`${metricsDayKey(now)}T00:15:00+07:00`);
  return new Date(today.getTime() <= now.getTime() ? today.getTime() + 86400000 : today.getTime());
}

/** ADR 0012: native cron in the API container, with startup catch-up and five attempts. */
@Injectable()
export class MetricsCron implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(MetricsCron.name);
  private timer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private running = false;
  constructor(private readonly metrics: MetricsService) {}
  onModuleInit(): void { this.schedule(); void this.run(); }
  private schedule(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => { this.schedule(); void this.run(); }, nextMetricsRollup(new Date()).getTime() - Date.now());
    this.timer.unref();
  }
  private async run(attempt = 0): Promise<void> {
    if (this.stopped || this.running) return;
    this.running = true;
    try { await this.metrics.rollup(); }
    catch {
      this.logger.error('Chưa tổng hợp được số liệu địa điểm; bộ đếm vẫn được giữ để thử lại.');
      if (!this.stopped && attempt < 4) {
        this.retryTimer = setTimeout(() => void this.run(attempt + 1), 1000 * 2 ** attempt);
        this.retryTimer.unref();
      }
    } finally { this.running = false; }
  }
  onApplicationShutdown(): void { this.stopped = true; clearTimeout(this.timer); clearTimeout(this.retryTimer); }
}
