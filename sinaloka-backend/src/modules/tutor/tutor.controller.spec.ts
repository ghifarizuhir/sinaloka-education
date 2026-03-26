import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TutorModule } from './tutor.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('TutorController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let createdTutorId: string;

  const testEmails = [
    'tutor-ctrl-admin@test.com',
    'tutor-new@test.com',
    'tutor-dup@test.com',
    'tutor-to-delete@test.com',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PrismaModule,
        AuthModule,
        TutorModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up test data
    await prisma.tutor.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'tutor-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Tutor Ctrl Inst', slug: 'tutor-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    // Create admin
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'tutor-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Tutor Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'tutor-ctrl-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.tutor.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.refreshToken.deleteMany({
        where: { user: { email: { in: testEmails } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: testEmails } },
      });
      await prisma.institution.deleteMany({
        where: { id: testInstitutionId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /admin/tutors', () => {
    it('should create a tutor with associated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Tutor',
          email: 'tutor-new@test.com',
          password: 'password123',
          subjects: ['Math', 'Physics'],
          experience_years: 5,
        })
        .expect(201);

      expect(response.body.subjects).toEqual(['Math', 'Physics']);
      expect(response.body.user.name).toBe('New Tutor');
      expect(response.body.user.email).toBe('tutor-new@test.com');
      expect(response.body.user.role).toBe('TUTOR');
      expect(response.body.institution_id).toBe(testInstitutionId);
      createdTutorId = response.body.id;
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dup Tutor',
          email: 'tutor-new@test.com',
          password: 'password123',
          subjects: ['English'],
        })
        .expect(409);
    });
  });

  describe('GET /admin/tutors', () => {
    it('should list tutors with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by subject', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/tutors?subject=Math')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const t of response.body.data) {
        expect(t.subjects).toContain('Math');
      }
    });

    it('should sort by rating', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/tutors?sort_by=rating&sort_order=desc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /admin/tutors/:id', () => {
    it('should get a single tutor', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/tutors/${createdTutorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdTutorId);
      expect(response.body.user).toBeDefined();
    });

    it('should return 404 for non-existent tutor', async () => {
      await request(app.getHttpServer())
        .get('/admin/tutors/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/tutors/:id', () => {
    it('should update a tutor', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/tutors/${createdTutorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subjects: ['Math', 'Physics', 'Chemistry'], is_verified: true })
        .expect(200);

      expect(response.body.subjects).toContain('Chemistry');
      expect(response.body.is_verified).toBe(true);
    });
  });

  describe('DELETE /admin/tutors/:id', () => {
    it('should delete a tutor and associated user', async () => {
      // Create a tutor to delete
      const createRes = await request(app.getHttpServer())
        .post('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'To Delete',
          email: 'tutor-to-delete@test.com',
          password: 'password123',
          subjects: ['Art'],
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/admin/tutors/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify user is also deleted
      const user = await prisma.user.findUnique({
        where: { email: 'tutor-to-delete@test.com' },
      });
      expect(user).toBeNull();
    });
  });
});
