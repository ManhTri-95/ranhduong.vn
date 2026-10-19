import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Slug, TicketQuery, type ApiError } from '@ranhduong/contracts';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { TicketsService } from './tickets.service';

const PENDING: ApiError = { code: 'INTERNAL_ERROR', message: 'Vé đang được in, thử lại sau vài giây nhé.' };

/**
 * Ảnh vé của lịch trình mẫu (technical-design mục 6), URL theo slug, không có ObjectId. Tự ghi response:
 * story chưa in xong là tình huống bình thường, trả 503 + Retry-After mà không đi qua filter ghi log lỗi.
 */
@Controller('cities/:city/itineraries/templates/:slug')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('ticket.png')
  async template(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Param('slug', new ZodValidationPipe(Slug)) slug: string,
    @Query(new ZodValidationPipe(TicketQuery)) query: TicketQuery,
    @Res() res: Response,
  ): Promise<void> {
    const image = await this.tickets.templateTicket(city, slug, query.format);
    if (image.status === 'pending') {
      res.status(503).set({ 'Cache-Control': 'no-store', 'Retry-After': '3' }).json(PENDING);
      return;
    }
    res.status(200).set({
      'Content-Type': 'image/png',
      // Ảnh mặc định không được CDN giữ, để lần gọi sau nhận vé thật.
      'Cache-Control': image.status === 'ready' ? 'public, max-age=3600' : 'no-store',
    }).send(image.body);
  }
}
