import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { MediaAttachInput, MediaUploadInput, ObjectIdString, UploadId } from '@ranhduong/contracts';
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe';
import { AdminGuard, CurrentSession } from '../../shared/session/admin.guard';
import type { SessionData } from '../../shared/session/session.store';
import { MediaService } from '../media/media.service';
import { AdminMediaService } from './admin-media.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminMediaController {
  constructor(private readonly adminMedia: AdminMediaService, private readonly media: MediaService) {}
  @Post('places/:id/photos/upload-url')
  create(
    @Param('id', new ZodValidationPipe(ObjectIdString)) id: string,
    @Body(new ZodValidationPipe(MediaUploadInput)) input: MediaUploadInput,
    @CurrentSession() session: SessionData,
  ) { return this.adminMedia.create(id, input, session.email); }
  @Post('media/:uploadId/complete')
  @HttpCode(200)
  complete(@Param('uploadId', new ZodValidationPipe(UploadId)) id: string, @CurrentSession() session: SessionData) {
    return this.media.complete(id, session.email);
  }
  @Get('media/:uploadId')
  status(@Param('uploadId', new ZodValidationPipe(UploadId)) id: string, @CurrentSession() session: SessionData) {
    return this.media.status(id, session.email);
  }
  @Post('places/:id/photos')
  @HttpCode(200)
  attach(
    @Param('id', new ZodValidationPipe(ObjectIdString)) id: string,
    @Body(new ZodValidationPipe(MediaAttachInput)) input: MediaAttachInput,
    @CurrentSession() session: SessionData,
  ) { return this.adminMedia.attach(id, input.uploadId, session.email); }
}
