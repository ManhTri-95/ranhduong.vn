import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { loadEnv } from './config/env';
import { MediaModule } from './modules/media/media.module';
import { MediaProcessor } from './modules/media/media.processor';

const env = loadEnv();
@Module({
  imports: [ConfigModule.register(env), MongooseModule.forRoot(env.MONGODB_URI), MediaModule],
  providers: [MediaProcessor],
})
class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
}
void bootstrap();
