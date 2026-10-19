import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { CityPublic, TicketData, TicketFormat, TicketJob } from '@ranhduong/contracts';
import { ENV, type Env } from '../../config/env';
import { CitiesService } from '../cities/cities.service';
import { ItinerariesService } from '../itineraries/itineraries.service';
import { templateTicketData, ticketHash, ticketObjectKey, ticketPrefix } from './ticket-data';
import { TicketRenderer } from './ticket-renderer';
import { TicketQueue } from './ticket.queue';
import { TicketStorage } from './ticket.storage';

export type TicketImage = { status: 'ready'; body: Buffer } | { status: 'fallback'; body: Buffer } | { status: 'pending' };

/** Thời gian API chờ worker dựng vé: OG ngắn để crawler không bỏ cuộc, story là khách đang nhìn màn chờ. */
export const TICKET_WAIT = Symbol('TICKET_WAIT');
export interface TicketWait { og: number; story: number; pollMs: number }
const DEFAULT_WAIT: TicketWait = { og: 4000, story: 8000, pollMs: 250 };

export class InvalidTicketJob extends Error {}

const FORMATS: TicketFormat[] = ['story', 'og'];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Vé lịch trình (Spec UI mục 9): API đọc ảnh theo hash nội dung, thiếu thì xếp job và chờ một lúc;
 * worker dựng cả story lẫn OG, đổi ticketKey và xoá ảnh cũ.
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(CitiesService) private readonly cities: { getPublic(slug: string): Promise<Pick<CityPublic, 'name' | 'accent'>> },
    @Inject(ItinerariesService) private readonly itineraries: Pick<ItinerariesService, 'templateTicketSource' | 'swapTicketKey'>,
    @Inject(TicketStorage) private readonly storage: Pick<TicketStorage, 'read' | 'write' | 'remove'>,
    @Inject(TicketQueue) private readonly queue: Pick<TicketQueue, 'request'>,
    @Inject(TicketRenderer) private readonly renderer: Pick<TicketRenderer, 'render' | 'defaultOg'>,
    @Optional() @Inject(TICKET_WAIT) private readonly wait: TicketWait = DEFAULT_WAIT,
  ) {}

  /** Lịch trình mẫu: QR tới trang mẫu. Lỗi 404 của thành phố hoặc mẫu đi thẳng ra ngoài. */
  async templateTicket(citySlug: string, slug: string, format: TicketFormat): Promise<TicketImage> {
    const [city, source] = await Promise.all([this.cities.getPublic(citySlug), this.itineraries.templateTicketSource(citySlug, slug)]);
    const data = templateTicketData(source.detail, { cityName: city.name, citySlug, accent: city.accent, siteUrl: this.env.SITE_URL });
    return this.ensure(source.id, data, format);
  }

  /** Dùng chung cho lịch trình mẫu và (S39) lịch trình của khách. Hạ tầng lỗi không làm hỏng ảnh xem trước. */
  async ensure(itineraryId: string, data: TicketData, format: TicketFormat): Promise<TicketImage> {
    const hash = ticketHash(data);
    const key = ticketObjectKey(hash, format);
    try {
      let body = await this.storage.read(key);
      if (!body) {
        await this.queue.request({ itineraryId, hash, data });
        const deadline = Date.now() + this.wait[format];
        while (!body && Date.now() < deadline) {
          await delay(this.wait.pollMs);
          body = await this.storage.read(key);
        }
      }
      if (body) return { status: 'ready', body };
    } catch (error) {
      this.logger.warn(`Chưa lấy được vé ${hash}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return format === 'og' ? { status: 'fallback', body: this.renderer.defaultOg() } : { status: 'pending' };
  }

  /** Job `itinerary.ticket`: idempotent, chạy lại an toàn. */
  async generate(job: TicketJob): Promise<void> {
    if (ticketHash(job.data) !== job.hash) throw new InvalidTicketJob('Hash không khớp nội dung vé');
    const existing = await Promise.all(FORMATS.map((format) => this.storage.read(ticketObjectKey(job.hash, format))));
    if (existing.some((body) => !body)) {
      for (const format of FORMATS) await this.storage.write(ticketObjectKey(job.hash, format), await this.renderer.render(job.data, format));
    }
    const next = ticketPrefix(job.hash);
    const previous = await this.itineraries.swapTicketKey(job.itineraryId, next);
    if (previous && previous !== next) await this.storage.remove(FORMATS.map((format) => `${previous}/${format}.png`));
  }
}
