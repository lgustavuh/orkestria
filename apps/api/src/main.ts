import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-var-requires
let cookieParser: any;
try { cookieParser = require('cookie-parser'); } catch { cookieParser = null; }
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { swaggerConfig, swaggerOptions } from './config/swagger.config';

// Fix: BigInt serialization for JSON responses (Prisma returns BigInt for large integers)
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Security
  // Default body limit: 1MB (safe for most requests)
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));

  // Avatar routes get higher limit (10MB for base64 images)
  const express = require('express');
  app.use('/api/files/upload-direct', express.json({ limit: '50mb' }));
  app.use('/api/users/me', express.json({ limit: '10mb' }));
  app.use('/api/clients', express.json({ limit: '10mb' }));
  app.use('/api/portal/profile', express.json({ limit: '10mb' }));

  if (cookieParser) app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'blob:', 'data:', process.env.S3_ENDPOINT || 'http://localhost:9000'],
        connectSrc: ["'self'", process.env.S3_ENDPOINT || 'http://localhost:9000'],
      },
    } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    ieNoOpen: true,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }));
  // CORS - strict origin validation
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3000'];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS: Origin not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger - only when explicitly enabled
  if (process.env.ENABLE_SWAGGER === 'true') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, swaggerOptions);
    console.log('📖 Swagger available at /api/docs');
  }

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Orkestria API running on port ${port}`);
}

bootstrap();
