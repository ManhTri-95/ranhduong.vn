import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitiesModule } from '../cities/cities.module';
import { PlacesModule } from '../places/places.module';
import { MetricsController } from './metrics.controller';
import { MetricsRepository } from './metrics.repository';
import { MetricsService } from './metrics.service';
import { MetricsStore } from './metrics.store';
import { PLACE_METRIC_MODEL, PlaceMetricSchema } from './schemas/place-metric.schema';

@Module({ imports: [MongooseModule.forFeature([{ name: PLACE_METRIC_MODEL, schema: PlaceMetricSchema }]), CitiesModule, PlacesModule], controllers: [MetricsController], providers: [MetricsStore, MetricsRepository, MetricsService], exports: [MetricsService] })
export class MetricsModule {}
