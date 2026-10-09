import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { PlaceListQuery, Slug, type PlaceListResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { PlacesService } from './places.service';
import type { Response } from 'express';

@Controller('cities/:city/places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get(':slug')
  async detail(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Param('slug', new ZodValidationPipe(Slug)) slug: string,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.places.detail(city, slug);
    if (result.place.slug !== slug) {
      response.redirect(301, `/v1/cities/${city}/places/${result.place.slug}`);
      return;
    }
    response.json(result);
  }

  @Get()
  list(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Query(new ZodValidationPipe(PlaceListQuery)) query: PlaceListQuery,
  ): Promise<PlaceListResponse> {
    return this.places.list(city, query);
  }
}
