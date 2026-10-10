import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureHttpApp, HTTP_APP_OPTIONS } from './app.setup';

import type { Env } from './config/env.validation';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Filtro, interceptor y guards globales se registran por DI en AppModule; helmet, cookies, parser
// JSON y `trust proxy`, en configureHttpApp (también lo usa el e2e). Las rutas llevan su prefijo en
// cada controller (`@Controller('api/…')`): no hay `setGlobalPrefix`.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, HTTP_APP_OPTIONS);
  configureHttpApp(app);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API escuchando en http://localhost:${String(port)}`, 'Bootstrap');
}

void bootstrap();
