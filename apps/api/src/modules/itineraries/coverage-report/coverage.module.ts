import { Module } from '@nestjs/common';
import { CitiesModule } from '../../cities/cities.module';
import { PlacesModule } from '../../places/places.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { ItinerariesModule } from '../itineraries.module';
import { ItineraryCoverageService } from './coverage.service';

/** Reporting dependencies stay out of the public/template itinerary module. */
@Module({
  imports: [ItinerariesModule, CitiesModule, PlacesModule, MetricsModule],
  providers: [ItineraryCoverageService], exports: [ItineraryCoverageService],
})
export class ItineraryCoverageModule {}
