import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlaceListQuery, Slug, type PlaceListResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { PlacesService } from './places.service';

@Controller('cities/:city/places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Query(new ZodValidationPipe(PlaceListQuery)) query: PlaceListQuery,
  ): Promise<PlaceListResponse> {
    return this.places.list(city, query);
  }
}
