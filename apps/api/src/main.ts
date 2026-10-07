import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app, env.WEB_ORIGINS);
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
  console.log(`API chạy tại http://localhost:${env.API_PORT}/v1/health`);
}

void bootstrap();
