import { Module } from '@nestjs/common';
import { CitiesModule } from '../cities/cities.module';
import { PlacesModule } from '../places/places.module';
import { CuratedListsModule } from '../curated-lists/curated-lists.module';
import { ItinerariesModule } from '../itineraries/itineraries.module';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({ imports: [CitiesModule, PlacesModule, CuratedListsModule, ItinerariesModule], controllers: [SeoController], providers: [SeoService] })
export class SeoModule {}
