import { Controller, Get, Param } from '@nestjs/common';
import { Slug, type CuratedListDetail, type CuratedListResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { CuratedListsService } from './curated-lists.service';

@Controller('cities/:city/curated-lists')
export class CuratedListsController {
  constructor(private readonly lists: CuratedListsService) {}
  @Get()
  list(@Param('city', new ZodValidationPipe(Slug)) city: string): Promise<CuratedListResponse> {
    return this.lists.publicList(city);
  }
  @Get(':slug')
  detail(@Param('city', new ZodValidationPipe(Slug)) city: string, @Param('slug', new ZodValidationPipe(Slug)) slug: string): Promise<CuratedListDetail> {
    return this.lists.detail(city, slug);
  }
}
