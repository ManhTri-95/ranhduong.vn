import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ENV, loadEnv } from './config/env';
import { HealthController } from './health/health.controller';

const env = loadEnv();

@Module({
  imports: [MongooseModule.forRoot(env.MONGODB_URI)],
  controllers: [HealthController],
  providers: [{ provide: ENV, useValue: env }],
})
export class AppModule {}
