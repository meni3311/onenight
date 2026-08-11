import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Allow the frontend to call the API from any origin during local dev.
  app.enableCors({ origin: true });

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
