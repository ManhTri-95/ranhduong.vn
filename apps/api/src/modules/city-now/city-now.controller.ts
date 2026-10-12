import { Controller, Get, Param, Res } from '@nestjs/common';
import { Slug, type CityNow } from '@ranhduong/contracts';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { CityNowService } from './city-now.service';

@Controller('cities')
export class CityNowController {
  constructor(private readonly now: CityNowService) {}
  @Get(':city/now')
  async current(@Param('city', new ZodValidationPipe(Slug)) city: string, @Res({ passthrough: true }) response: Response): Promise<CityNow> {
    response.setHeader('Cache-Control', 'no-store');
    const result = await this.now.current(city);
    const seconds = Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000));
    response.setHeader('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}`);
    return result;
  }
}
