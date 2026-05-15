import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * E2E test suite for authentication flows.
 *
 * Requirements:
 * - PostgreSQL running on DATABASE_URL
 * - Redis running on REDIS_HOST:REDIS_PORT
 * - Run: DATABASE_URL=... JWT_SECRET=test npx jest --config test/jest-e2e.json
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'wrong' })
        .expect(401);
    });

    it('should reject missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@test.com' })
        .expect(400);
    });

    it('should login with valid admin credentials', async () => {
      // Requires seed to be run first
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@orkestria.com', password: 'Admin@2025!' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('email', 'admin@orkestria.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user.roles).toContain('ADMIN');

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      // Old refresh token should be revoked (can't reuse)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return same response for any email', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'admin@orkestria.com' })
        .expect(200);

      expect(res1.body.message).toBe(res2.body.message);
    });
  });

  describe('Protected routes', () => {
    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .expect(401);
    });

    it('should allow authenticated requests', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Refresh token should no longer work
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
