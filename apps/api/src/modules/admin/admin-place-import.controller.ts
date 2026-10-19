import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CsvImportInput, CsvPreviewInput, Slug, type CsvImportResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { PlaceCsvImportService } from '../places/place-csv-import.service';

@Controller('admin/cities/:city/places/import')
@UseGuards(AdminGuard)
export class AdminPlaceImportController {
  constructor(private readonly importer: PlaceCsvImportService) {}

  @Post('preview')
  @HttpCode(200)
  preview(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Body(new ZodValidationPipe(CsvPreviewInput)) input: CsvPreviewInput,
  ): Promise<CsvImportResponse> {
    return this.importer.preview(city, input);
  }

  @Post()
  @HttpCode(200)
  run(
    @Param('city', new ZodValidationPipe(Slug)) city: string,
    @Body(new ZodValidationPipe(CsvImportInput)) input: CsvImportInput,
  ): Promise<CsvImportResponse> {
    return this.importer.run(city, input);
  }
}
