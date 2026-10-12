import { Body, Controller, Get, Header, Param, Put, Query, UseGuards } from '@nestjs/common';
import { CitySeasonEditInput, Slug, ZoneSuggestQuery, type CitySeasonSettings, type SeasonItineraryOptions, type ZoneSuggestResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { CitiesService } from '../cities/cities.service';
import { AdminCitySeasonsService } from './admin-city-seasons.service';

/** Gợi ý cụm khi ghim trong form địa điểm. */
@Controller('admin/cities')
@UseGuards(AdminGuard)
export class AdminCitiesController {
  constructor(private readonly cities: CitiesService, private readonly seasons: AdminCitySeasonsService) {}

  @Get(':city/seasons')
  @Header('Cache-Control', 'no-store')
  seasonSettings(@Param('city', new ZodValidationPipe(Slug)) city: string): Promise<CitySeasonSettings> {
    return this.cities.seasonSettings(city);
  }

  @Get(':city/seasons/itineraries')
  @Header('Cache-Control', 'no-store')
  seasonOptions(@Param('city', new ZodValidationPipe(Slug)) city: string): Promise<SeasonItineraryOptions> {
    return this.seasons.options(city);
  }

  @Put(':city/seasons')
  @Header('Cache-Control', 'no-store')
  saveSeasons(@Param('city', new ZodValidationPipe(Slug)) city: string, @Body(new ZodValidationPipe(CitySeasonEditInput)) input: CitySeasonEditInput): Promise<CitySeasonSettings> {
    return this.seasons.save(city, input);
  }

  @Get(':city/zones/suggest')
  suggest(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Query(new ZodValidationPipe(ZoneSuggestQuery)) query: ZoneSuggestQuery,
  ): Promise<ZoneSuggestResponse> {
    return this.cities.zoneSuggestions(city, [query.lng, query.lat]);
  }
}
