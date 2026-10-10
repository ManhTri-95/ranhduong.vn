import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CuratedListEditInput, ObjectIdString, Slug, type AdminCuratedList, type AdminCuratedListResponse } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { CuratedListsService } from '../curated-lists/curated-lists.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminCuratedListsController {
  constructor(private readonly lists: CuratedListsService) {}
  @Get('cities/:city/curated-lists')
  list(@Param('city', new ZodValidationPipe(Slug)) city: string): Promise<AdminCuratedListResponse> { return this.lists.adminList(city); }
  @Post('cities/:city/curated-lists')
  create(@Param('city', new ZodValidationPipe(Slug)) city: string, @Body(new ZodValidationPipe(CuratedListEditInput)) input: CuratedListEditInput): Promise<AdminCuratedList> {
    return this.lists.create(city, input);
  }
  @Get('curated-lists/:id')
  get(@Param('id', new ZodValidationPipe(ObjectIdString)) id: string): Promise<AdminCuratedList> { return this.lists.get(id); }
  @Put('curated-lists/:id')
  update(@Param('id', new ZodValidationPipe(ObjectIdString)) id: string, @Body(new ZodValidationPipe(CuratedListEditInput)) input: CuratedListEditInput): Promise<AdminCuratedList> {
    return this.lists.update(id, input);
  }
}
