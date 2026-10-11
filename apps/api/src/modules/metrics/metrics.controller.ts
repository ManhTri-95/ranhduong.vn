import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EventBatch, Slug, WeeklyMetricsQuery } from '@ranhduong/contracts';
import type { Request } from 'express';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}
  @Post('events')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  record(@Body(new ZodValidationPipe(EventBatch)) input: EventBatch, @Req() request: Request) { return this.metrics.record(input, { ip: request.ip || request.socket.remoteAddress || 'unknown', userAgent: request.get('user-agent') ?? '' }); }
  @Get('admin/cities/:city/metrics')
  @UseGuards(AdminGuard)
  @Header('Cache-Control', 'no-store')
  report(@Param('city', new ZodValidationPipe(Slug)) city: string, @Query(new ZodValidationPipe(WeeklyMetricsQuery)) query: WeeklyMetricsQuery) { return this.metrics.weeklyReport(city, query); }
}
