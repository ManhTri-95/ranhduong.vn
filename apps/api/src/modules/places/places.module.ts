import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesModule } from '../cities/cities.module';
import { PlaceEditorService } from './place-editor.service';
import { PlacesController } from './places.controller';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';
import { PLACE_MODEL, PlaceSchema } from './schemas/place.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PLACE_MODEL, schema: PlaceSchema }]), CitiesModule],
  controllers: [PlacesController],
  providers: [PlacesRepository, PlacesService, PlaceEditorService],
  exports: [PlacesService, PlaceEditorService],
})
export class PlacesModule {}
