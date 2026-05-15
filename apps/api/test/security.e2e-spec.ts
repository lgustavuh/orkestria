import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Rate Limiting & Security (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@orkestria.com', password: 'Admin@2025!' });
    token = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Input validation', () => {
    it('should reject non-whitelisted fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', hackedField: 'malicious', __proto__: {} })
        .expect(201); // whitelist strips extra fields silently

      expect(res.body).not.toHaveProperty('hackedField');
    });

    it('should validate email format on login', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '12345678' })
        .expect(400);
    });

    it('should validate minimum password length on register', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', password: '123', firstName: 'A', lastName: 'B' })
        .expect(400);
    });

    it('should sanitize SQL-like input in search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects?search=' + encodeURIComponent("'; DROP TABLE projects; --"))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should not crash, Prisma parameterizes queries
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Authorization boundaries', () => {
    let copyToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'copy@demo.com', password: 'Demo@2025!' });
      copyToken = res.body.accessToken;
    });

    it('should deny copywriter from managing users', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${copyToken}`)
        .expect(403);
    });

    it('should deny copywriter from creating automations', async () => {
      await request(app.getHttpServer())
        .post('/api/automations')
        .set('Authorization', `Bearer ${copyToken}`)
        .send({ name: 'Test', trigger: 'TASK_COMPLETED', actions: [] })
        .expect(403);
    });

    it('should deny copywriter from viewing audit logs', async () => {
      await request(app.getHttpServer())
        .get('/api/audit')
        .set('Authorization', `Bearer ${copyToken}`)
        .expect(403);
    });

    it('should deny copywriter from exporting reports', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/productivity')
        .set('Authorization', `Bearer ${copyToken}`)
        .expect(403);
    });

    it('should allow copywriter to access own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${copyToken}`)
        .expect(200);

      expect(res.body.roles).toContain('COPYWRITER');
    });
  });

  describe('Health endpoints', () => {
    it('should return health status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('checks');
      expect(res.body).toHaveProperty('memory');
      expect(res.body.checks.database).toBe('ok');
    });

    it('should return readiness probe', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200);

      expect(res.body.ready).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return structured error for 404 routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nonexistent-route')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
    });

    it('should return structured error for invalid project ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects/invalid-id-that-does-not-exist')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body).toHaveProperty('statusCode');
      expect(res.body).toHaveProperty('message');
    });
  });
});
