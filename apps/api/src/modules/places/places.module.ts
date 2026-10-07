import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesModule } from '../cities/cities.module';
import { PlacesController } from './places.controller';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';
import { PLACE_MODEL, PlaceSchema } from './schemas/place.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PLACE_MODEL, schema: PlaceSchema }]), CitiesModule],
  controllers: [PlacesController],
  providers: [PlacesRepository, PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
