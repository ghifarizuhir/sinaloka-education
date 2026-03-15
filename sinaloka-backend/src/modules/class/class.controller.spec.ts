import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClassModule } from './class.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('ClassController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let testTutorId: string;
  let createdClassId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        ClassModule,
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
    const testEmails = ['class-ctrl-admin@test.com', 'class-ctrl-tutor@test.com'];
    await prisma.enrollment.deleteMany({
      where: { institution: { slug: 'class-ctrl-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'class-ctrl-inst' } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'class-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'class-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Class Ctrl Inst', slug: 'class-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    // Create admin
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'class-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Class Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Create tutor user + tutor record
    const tutorUser = await prisma.user.create({
      data: {
        email: 'class-ctrl-tutor@test.com',
        password_hash: passwordHash,
        name: 'Test Tutor',
        role: 'TUTOR',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUser.id,
        institution_id: testInstitutionId,
        subjects: ['Mathematics'],
      },
    });
    testTutorId = tutor.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'class-ctrl-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.enrollment.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.class.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.tutor.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.refreshToken.deleteMany({
        where: { user: { email: { in: ['class-ctrl-admin@test.com', 'class-ctrl-tutor@test.com'] } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: ['class-ctrl-admin@test.com', 'class-ctrl-tutor@test.com'] } },
      });
      await prisma.institution.deleteMany({
        where: { id: testInstitutionId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /admin/classes', () => {
    it('should create a class', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tutor_id: testTutorId,
          name: 'Math 101',
          subject: 'Mathematics',
          capacity: 30,
          fee: 500000,
          schedule_days: ['Monday', 'Wednesday'],
          schedule_start_time: '14:00',
          schedule_end_time: '15:30',
          room: 'Room A',
        })
        .expect(201);

      expect(response.body.name).toBe('Math 101');
      expect(response.body.subject).toBe('Mathematics');
      expect(response.body.institution_id).toBe(testInstitutionId);
      createdClassId = response.body.id;
    });

    it('should reject creation without auth', async () => {
      await request(app.getHttpServer())
        .post('/admin/classes')
        .send({
          tutor_id: testTutorId,
          name: 'Fail Class',
          subject: 'Math',
          capacity: 10,
          fee: 100,
          schedule_days: ['Monday'],
          schedule_start_time: '09:00',
          schedule_end_time: '10:00',
        })
        .expect(401);
    });

    it('should reject invalid schedule times', async () => {
      await request(app.getHttpServer())
        .post('/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tutor_id: testTutorId,
          name: 'Bad Time Class',
          subject: 'Math',
          capacity: 10,
          fee: 100,
          schedule_days: ['Monday'],
          schedule_start_time: '15:00',
          schedule_end_time: '14:00',
        })
        .expect(400);
    });
  });

  describe('GET /admin/classes', () => {
    beforeAll(async () => {
      await prisma.class.createMany({
        data: [
          {
            institution_id: testInstitutionId,
            tutor_id: testTutorId,
            name: 'Physics 101',
            subject: 'Physics',
            capacity: 25,
            fee: 400000,
            schedule_days: ['Tuesday', 'Thursday'],
            schedule_start_time: '10:00',
            schedule_end_time: '11:30',
            status: 'ACTIVE',
          },
          {
            institution_id: testInstitutionId,
            tutor_id: testTutorId,
            name: 'Old Chemistry',
            subject: 'Chemistry',
            capacity: 20,
            fee: 350000,
            schedule_days: ['Friday'],
            schedule_start_time: '09:00',
            schedule_end_time: '10:30',
            status: 'ARCHIVED',
          },
        ],
      });
    });

    it('should list classes with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter classes by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/classes?status=ARCHIVED')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const c of response.body.data) {
        expect(c.status).toBe('ARCHIVED');
      }
    });
  });

  describe('GET /admin/classes/:id', () => {
    it('should get a single class with enrolled_count', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdClassId);
      expect(response.body.name).toBe('Math 101');
      expect(response.body.enrolled_count).toBeDefined();
    });

    it('should return 404 for non-existent class', async () => {
      await request(app.getHttpServer())
        .get('/admin/classes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/classes/:id', () => {
    it('should update a class', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/classes/${createdClassId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Advanced Math 101' })
        .expect(200);

      expect(response.body.name).toBe('Advanced Math 101');
    });
  });

  describe('DELETE /admin/classes/:id', () => {
    it('should delete a class', async () => {
      const toDelete = await prisma.class.create({
        data: {
          institution_id: testInstitutionId,
          tutor_id: testTutorId,
          name: 'To Delete',
          subject: 'Temp',
          capacity: 10,
          fee: 100,
          schedule_days: ['Monday'],
          schedule_start_time: '08:00',
          schedule_end_time: '09:00',
        },
      });

      await request(app.getHttpServer())
        .delete(`/admin/classes/${toDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
