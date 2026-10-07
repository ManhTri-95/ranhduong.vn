import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesController } from './cities.controller';
import { CitiesRepository } from './cities.repository';
import { CitiesService } from './cities.service';
import { CITY_MODEL, CitySchema } from './schemas/city.schema';
import { ZONE_MODEL, ZoneSchema } from './schemas/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CITY_MODEL, schema: CitySchema },
      { name: ZONE_MODEL, schema: ZoneSchema },
    ]),
  ],
  controllers: [CitiesController],
  providers: [CitiesRepository, CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
