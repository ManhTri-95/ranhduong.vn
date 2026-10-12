import { Module } from '@nestjs/common';
import { CitiesModule } from '../cities/cities.module';
import { ItinerariesModule } from '../itineraries/itineraries.module';
import { CityNowController } from './city-now.controller';
import { CityNowService } from './city-now.service';
@Module({ imports: [CitiesModule, ItinerariesModule], controllers: [CityNowController], providers: [CityNowService], exports: [CityNowService] })
export class CityNowModule {}
