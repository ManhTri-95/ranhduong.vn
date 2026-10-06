import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';
import { PLACE_MODEL, PlaceSchema } from './schemas/place.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PLACE_MODEL, schema: PlaceSchema }])],
  providers: [PlacesRepository, PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
