import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesModule } from '../cities/cities.module';
import { PlacesModule } from '../places/places.module';
import { CuratedListsController } from './curated-lists.controller';
import { CuratedListsRepository } from './curated-lists.repository';
import { CuratedListsService } from './curated-lists.service';
import { CURATED_LIST_MODEL, CuratedListSchema } from './schemas/curated-list.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: CURATED_LIST_MODEL, schema: CuratedListSchema }]), CitiesModule, PlacesModule],
  controllers: [CuratedListsController], providers: [CuratedListsRepository, CuratedListsService], exports: [CuratedListsService],
})
export class CuratedListsModule {}
