import { Module } from '@nestjs/common';
import { CitiesModule } from '../cities/cities.module';
import { ItinerariesModule } from '../itineraries/itineraries.module';
import { CityNowController } from './city-now.controller';
import { CityNowService } from './city-now.service';
import { WeatherService } from './weather.service';
@Module({ imports: [CitiesModule, ItinerariesModule], controllers: [CityNowController], providers: [CityNowService, WeatherService], exports: [CityNowService] })
export class CityNowModule {}
