import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Slug, ZoneSuggestQuery, type ZoneSuggestResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { CitiesService } from '../cities/cities.service';

/** Gợi ý cụm khi ghim trong form địa điểm. */
@Controller('admin/cities')
@UseGuards(AdminGuard)
export class AdminCitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Get(':city/zones/suggest')
  suggest(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Query(new ZodValidationPipe(ZoneSuggestQuery)) query: ZoneSuggestQuery,
  ): Promise<ZoneSuggestResponse> {
    return this.cities.zoneSuggestions(city, [query.lng, query.lat]);
  }
}
