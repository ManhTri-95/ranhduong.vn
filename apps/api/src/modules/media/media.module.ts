import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaQueue } from './media.queue';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';
import { MediaStorage } from './media.storage';
import { MEDIA_UPLOAD_MODEL, MediaUploadSchema } from './schemas/media-upload.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: MEDIA_UPLOAD_MODEL, schema: MediaUploadSchema }])],
  providers: [MediaRepository, MediaService, MediaQueue, MediaStorage], exports: [MediaService],
})
export class MediaModule {}
