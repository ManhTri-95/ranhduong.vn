import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ObjectIdString, Slug, TemplateEditInput, type AdminTemplate, type AdminTemplateResponse, type TemplateAnalysis, type TemplatePlaceResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { TemplateEditorService } from '../itineraries/template-editor.service';
import { AdminTemplateLock } from './admin-template-lock';
const cityPipe = new ZodValidationPipe(Slug);
const idPipe = new ZodValidationPipe(ObjectIdString);
const bodyPipe = new ZodValidationPipe(TemplateEditInput);

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminTemplatesController {
  constructor(private readonly editor: TemplateEditorService, private readonly writes: AdminTemplateLock) {}
  @Get('cities/:city/itineraries/templates')
  list(@Param('city', cityPipe) city: string): Promise<AdminTemplateResponse> { return this.editor.list(city); }
  @Get('cities/:city/template-places')
  library(@Param('city', cityPipe) city: string): Promise<TemplatePlaceResponse> { return this.editor.library(city); }
  @Post('cities/:city/itineraries/templates/preview')
  @HttpCode(200)
  preview(@Param('city', cityPipe) city: string, @Body(bodyPipe) input: TemplateEditInput): Promise<TemplateAnalysis> { return this.editor.preview(city, input); }
  @Post('cities/:city/itineraries/templates')
  create(@Param('city', cityPipe) city: string, @Body(bodyPipe) input: TemplateEditInput): Promise<AdminTemplate> { return this.writes.run((assertOwned) => this.editor.create(city, input, assertOwned)); }
  @Get('itineraries/templates/:id')
  get(@Param('id', idPipe) id: string): Promise<AdminTemplate> { return this.editor.get(id); }
  @Put('itineraries/templates/:id')
  update(@Param('id', idPipe) id: string, @Body(bodyPipe) input: TemplateEditInput): Promise<AdminTemplate> { return this.writes.run((assertOwned) => this.editor.update(id, input, assertOwned)); }
}
