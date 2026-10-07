import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { CitiesModule } from './modules/cities/cities.module';
import { ItinerariesModule } from './modules/itineraries/itineraries.module';
import { PlacesModule } from './modules/places/places.module';
import { RedisModule } from './shared/redis/redis.module';

const env = loadEnv();

@Module({
  imports: [
    ConfigModule.register(env),
    MongooseModule.forRoot(env.MONGODB_URI),
    RedisModule,
    CitiesModule,
    PlacesModule,
    ItinerariesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
