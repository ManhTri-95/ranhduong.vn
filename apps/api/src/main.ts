import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({ origin: env.WEB_ORIGINS, credentials: true });
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
  console.log(`API chạy tại http://localhost:${env.API_PORT}/v1/health`);
}

void bootstrap();
