import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { CitiesModule } from '../../cities/cities.module';
import { PlacesModule } from '../../places/places.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { ItinerariesModule } from '../itineraries.module';
import { GuestItinerariesController } from './guest-itineraries.controller';
import { GuestItinerariesService } from './guest-itineraries.service';
import { GuestRateLimit } from './guest-rate-limit';

/** Application composition, like coverage: metric dependencies stay out of the template/planner module. */
@Module({
  imports: [ItinerariesModule, CitiesModule, PlacesModule, MetricsModule], controllers: [GuestItinerariesController],
  providers: [GuestItinerariesService, GuestRateLimit], exports: [GuestItinerariesService],
})
export class GuestItinerariesModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Run before guards/pipes so errors and ownership-dependent responses are never cached either.
    consumer.apply((_req: Request, res: Response, next: NextFunction) => { res.setHeader('Cache-Control', 'no-store'); next(); }).forRoutes(GuestItinerariesController);
  }
}
