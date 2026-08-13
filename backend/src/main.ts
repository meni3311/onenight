import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Every controller used to carry its own literal 'api/' segment in its
  // @Controller() decorator (there was no global prefix at all). Now there
  // is one, and those per-controller prefixes were removed to match — see
  // each controller's @Controller() decorator — so every route still
  // resolves to the exact same path as before (e.g. /api/dresses,
  // /api/health), just assembled by Nest once instead of hand-repeated in
  // seven files. Nothing needs excluding: ServeStaticModule (which serves
  // the frontend build) defaults `useGlobalPrefix` to false, so it keeps
  // serving unprefixed at "/" regardless — see app.module.ts.
  app.setGlobalPrefix('api');

  // CORS: locked to the deployed frontend's origin in production via
  // FRONTEND_URL (set on Render), never hardcoded here. Falls back to
  // reflecting any origin when FRONTEND_URL isn't set, which keeps local
  // dev and this repo's "one command, one URL" self-hosted mode (see
  // README) working without a .env entry — Vite's dev proxy makes API
  // calls same-origin anyway, so this fallback mostly only matters for
  // hitting the API directly (curl, Swagger at /docs).
  app.enableCors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Validate + strip unknown fields on every DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Listing photos are uploaded as multipart to POST /dresses/images (handled
  // by multer) and stored in Supabase Storage, so JSON bodies now only ever
  // carry the resulting URLs — no need for the old 12mb base64 allowance.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // Swagger / OpenAPI docs at /docs
  const config = new DocumentBuilder()
    .setTitle('onenight API')
    .setDescription('Dress rental marketplace API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`onenight running →  http://localhost:${port}`);
}

void bootstrap();
