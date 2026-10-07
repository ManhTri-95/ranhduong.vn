import { Controller, Get, Param } from '@nestjs/common';
import { Slug, type CityPublic } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { CitiesService } from './cities.service';

@Controller('cities')
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Get(':city')
  get(@Param('city', new ZodValidationPipe(Slug)) city: string): Promise<CityPublic> {
    return this.cities.getPublic(city);
  }
}
