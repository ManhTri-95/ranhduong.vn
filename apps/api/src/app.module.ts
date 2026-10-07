import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CitiesModule } from './modules/cities/cities.module';
import { ItinerariesModule } from './modules/itineraries/itineraries.module';
import { PlacesModule } from './modules/places/places.module';
import { RedisModule } from './shared/redis/redis.module';
import { SessionModule } from './shared/session/session.module';

const env = loadEnv();

@Module({
  imports: [
    ConfigModule.register(env),
    MongooseModule.forRoot(env.MONGODB_URI),
    RedisModule,
    SessionModule,
    CitiesModule,
    PlacesModule,
    ItinerariesModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
