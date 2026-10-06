import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ENV, loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { PlacesModule } from './modules/places/places.module';

const env = loadEnv();

@Module({
  imports: [MongooseModule.forRoot(env.MONGODB_URI), PlacesModule],
  controllers: [HealthController],
  providers: [{ provide: ENV, useValue: env }],
})
export class AppModule {}
