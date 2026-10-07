import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesModule } from '../cities/cities.module';
import { PlacesModule } from '../places/places.module';
import { ItinerariesController } from './itineraries.controller';
import { ItinerariesRepository } from './itineraries.repository';
import { ItinerariesService } from './itineraries.service';
import { ITINERARY_MODEL, ItinerarySchema } from './schemas/itinerary.schema';

/** Tầng nghiệp vụ (architecture mục 4): được gọi service của cities và places. */
@Module({
  imports: [MongooseModule.forFeature([{ name: ITINERARY_MODEL, schema: ItinerarySchema }]), CitiesModule, PlacesModule],
  controllers: [ItinerariesController],
  providers: [ItinerariesRepository, ItinerariesService],
  exports: [ItinerariesService],
})
export class ItinerariesModule {}
