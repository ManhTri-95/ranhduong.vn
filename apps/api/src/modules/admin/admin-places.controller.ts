import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  DuplicateCheckInput,
  ObjectIdString,
  PlaceEditInput,
  Slug,
  type AdminPlace,
  type DuplicateCheckResponse,
} from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { PlaceEditorService } from '../places/place-editor.service';

const cityParam = new ZodValidationPipe(Slug);
const idParam = new ZodValidationPipe(ObjectIdString);

/** Form địa điểm trong admin (S05): chỉ validate input rồi gọi PlaceEditorService. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminPlacesController {
  constructor(private readonly editor: PlaceEditorService) {}

  @Post('cities/:city/places')
  create(
    @Param('city', cityParam) city: string,
    @Body(new ZodValidationPipe(PlaceEditInput)) input: PlaceEditInput,
  ): Promise<AdminPlace> {
    return this.editor.create(city, input);
  }

  @Post('cities/:city/places/duplicate-check')
  @HttpCode(200)
  duplicates(
    @Param('city', cityParam) city: string,
    @Body(new ZodValidationPipe(DuplicateCheckInput)) input: DuplicateCheckInput,
  ): Promise<DuplicateCheckResponse> {
    return this.editor.checkDuplicates(city, input);
  }

  @Get('places/:id')
  get(@Param('id', idParam) id: string): Promise<AdminPlace> {
    return this.editor.get(id);
  }

  @Put('places/:id')
  update(@Param('id', idParam) id: string, @Body(new ZodValidationPipe(PlaceEditInput)) input: PlaceEditInput): Promise<AdminPlace> {
    return this.editor.update(id, input);
  }

  @Post('places/:id/activate')
  @HttpCode(200)
  activate(@Param('id', idParam) id: string): Promise<AdminPlace> {
    return this.editor.activate(id);
  }
}
