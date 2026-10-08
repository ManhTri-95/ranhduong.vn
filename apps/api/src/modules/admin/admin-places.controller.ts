import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  DuplicateCheckInput,
  ObjectIdString,
  PlaceEditInput,
  PlaceStatusInput,
  PlaceVerifyInput,
  Slug,
  type AdminPlace,
  type AdminPlaceListResponse,
  type DuplicateCheckResponse,
} from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard } from '../../shared/session/admin.guard';
import { PlaceEditorService } from '../places/place-editor.service';
import { PlaceStatusService } from '../places/place-status.service';

const cityParam = new ZodValidationPipe(Slug);
const idParam = new ZodValidationPipe(ObjectIdString);

/** Địa điểm trong admin: form (S05), danh sách, xác minh, đổi trạng thái, xoá nháp (S07). Chỉ validate input rồi gọi service. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminPlacesController {
  constructor(
    private readonly editor: PlaceEditorService,
    private readonly status: PlaceStatusService,
  ) {}

  @Get('cities/:city/places')
  list(@Param('city', cityParam) city: string): Promise<AdminPlaceListResponse> {
    return this.editor.list(city);
  }

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

  @Post('places/:id/verify')
  @HttpCode(200)
  verify(@Param('id', idParam) id: string, @Body(new ZodValidationPipe(PlaceVerifyInput)) input: PlaceVerifyInput): Promise<AdminPlace> {
    return this.status.verify(id, input.verifySource);
  }

  @Post('places/:id/status')
  @HttpCode(200)
  changeStatus(
    @Param('id', idParam) id: string,
    @Body(new ZodValidationPipe(PlaceStatusInput)) input: PlaceStatusInput,
  ): Promise<AdminPlace> {
    return this.status.changeStatus(id, input.action);
  }

  @Delete('places/:id')
  @HttpCode(204)
  remove(@Param('id', idParam) id: string): Promise<void> {
    return this.status.deleteDraft(id);
  }
}
