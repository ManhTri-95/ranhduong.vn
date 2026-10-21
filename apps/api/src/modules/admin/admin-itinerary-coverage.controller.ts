import { Controller, Get, Header, Param, Query, UseGuards } from '@nestjs/common';
import { ItineraryCoverageQuery, Slug, type ItineraryCoverageReport } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { ItineraryCoverageService } from '../itineraries/coverage-report/coverage.service';

@Controller('admin/cities/:city/itineraries/coverage')
@UseGuards(AdminGuard)
export class AdminItineraryCoverageController {
  constructor(private readonly coverage: ItineraryCoverageService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  report(@Param('city', new ZodValidationPipe(Slug)) city: string, @Query(new ZodValidationPipe(ItineraryCoverageQuery)) query: ItineraryCoverageQuery): Promise<ItineraryCoverageReport> {
    return this.coverage.report(city, query);
  }
}
