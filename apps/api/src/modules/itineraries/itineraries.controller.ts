import { Controller, Get, Param, Query } from '@nestjs/common';
import { ItineraryTemplateQuery, Slug, type ItineraryCardList } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { ItinerariesService } from './itineraries.service';

@Controller('cities/:city/itineraries')
export class ItinerariesController {
  constructor(private readonly itineraries: ItinerariesService) {}

  @Get('templates')
  templates(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Query(new ZodValidationPipe(ItineraryTemplateQuery)) query: ItineraryTemplateQuery,
  ): Promise<ItineraryCardList> {
    return this.itineraries.listTemplates(city, query);
  }
}
