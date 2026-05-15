import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let strategistToken: string;
  let copywriterToken: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    // Login as admin
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@orkestria.com', password: 'Admin@2025!' });
    adminToken = adminRes.body.accessToken;

    // Login as strategist
    const stratRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'estrategista@demo.com', password: 'Demo@2025!' });
    strategistToken = stratRes.body.accessToken;

    // Login as copywriter
    const copyRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'copy@demo.com', password: 'Demo@2025!' });
    copywriterToken = copyRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/projects', () => {
    it('should allow strategist to create project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({
          name: 'E2E Test Project',
          description: 'Created by e2e test',
          channels: ['instagram', 'google_ads'],
          priority: 'HIGH',
          budget: 15000,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E Test Project');
      expect(res.body.stages).toHaveLength(6); // Default stages
      expect(res.body.stages[0].isActive).toBe(true); // Backlog active
      projectId = res.body.id;
    });

    it('should reject creation by copywriter', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${copywriterToken}`)
        .send({ name: 'Unauthorized' })
        .expect(403);
    });

    it('should reject unauthenticated creation', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send({ name: 'No auth' })
        .expect(401);
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects for strategist', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${strategistToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should support search filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects?search=E2E')
        .set('Authorization', `Bearer ${strategistToken}`)
        .expect(200);

      expect(res.body.data.some((p: any) => p.name.includes('E2E'))).toBe(true);
    });

    it('should support status filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects?status=DRAFT')
        .set('Authorization', `Bearer ${strategistToken}`)
        .expect(200);

      res.body.data.forEach((p: any) => expect(p.status).toBe('DRAFT'));
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .expect(200);

      expect(res.body.id).toBe(projectId);
      expect(res.body).toHaveProperty('stages');
      expect(res.body).toHaveProperty('members');
      expect(res.body).toHaveProperty('tasks');
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update project', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ status: 'ACTIVE', description: 'Updated by e2e' })
        .expect(200);

      expect(res.body.status).toBe('ACTIVE');
    });

    it('should reject update by copywriter', async () => {
      await request(app.getHttpServer())
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${copywriterToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('POST /api/projects/:id/members', () => {
    it('should add member', async () => {
      // Get copywriter user id
      const usersRes = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const copywriter = usersRes.body.data.find((u: any) => u.roles.includes('COPYWRITER'));
      if (!copywriter) return;

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ userId: copywriter.id, roleInProject: 'copywriter' })
        .expect(201);

      expect(res.body).toHaveProperty('user');
    });
  });

  describe('Tasks within project', () => {
    let taskId: string;

    it('should create task in project', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({
          title: 'E2E Test Task',
          description: 'Task for testing',
          priority: 'HIGH',
          checklist: ['Step 1', 'Step 2', 'Step 3'],
        })
        .expect(201);

      expect(res.body.title).toBe('E2E Test Task');
      taskId = res.body.id;
    });

    it('should list tasks in project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should get task detail with checklist', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .expect(200);

      expect(res.body.title).toBe('E2E Test Task');
      expect(res.body.checklists).toBeDefined();
      expect(res.body.checklists[0].items).toHaveLength(3);
    });

    it('should update task status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('should add comment to task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .send({ content: 'E2E test comment', visibility: 'INTERNAL' })
        .expect(201);

      expect(res.body.content).toBe('E2E test comment');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should reject deletion by strategist', async () => {
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${strategistToken}`)
        .expect(403);
    });

    it('should soft delete by admin', async () => {
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify it's no longer visible
      await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
