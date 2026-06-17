import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Allow the frontend to call the API from any origin during local dev
  app.enableCors({ origin: true });
  // Larger limit so base64 image uploads from the publish form fit
  const express = require('express');
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ limit: '12mb', extended: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`onenight running →  http://localhost:${port}`);
}
bootstrap();
