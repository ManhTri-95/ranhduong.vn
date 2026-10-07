import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { loadEnv } from '../config/env';
import { CitiesModule } from '../modules/cities/cities.module';
import { ItinerariesModule } from '../modules/itineraries/itineraries.module';
import { PlacesModule } from '../modules/places/places.module';

const env = loadEnv();

/** Module riêng cho lệnh seed: kết nối DB và các module có dữ liệu hoặc index cần tạo, không mở HTTP. */
@Module({
  imports: [MongooseModule.forRoot(env.MONGODB_URI), CitiesModule, PlacesModule, ItinerariesModule],
})
export class SeedModule {}
