import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CitiesModule } from './modules/cities/cities.module';
import { ItinerariesModule } from './modules/itineraries/itineraries.module';
import { PlacesModule } from './modules/places/places.module';
import { CuratedListsModule } from './modules/curated-lists/curated-lists.module';
import { RedisModule } from './shared/redis/redis.module';
import { SessionModule } from './shared/session/session.module';
import { SeoModule } from './modules/seo/seo.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { MetricsCron } from './modules/metrics/metrics-cron';
import { CityNowModule } from './modules/city-now/city-now.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { GuestItinerariesModule } from './modules/itineraries/guest/guest-itineraries.module';

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
    CuratedListsModule,
    AuthModule,
    AdminModule,
    SeoModule,
    MetricsModule,
    CityNowModule,
    TicketsModule,
    GuestItinerariesModule,
  ],
  controllers: [HealthController],
  providers: [MetricsCron],
})
export class AppModule {}
