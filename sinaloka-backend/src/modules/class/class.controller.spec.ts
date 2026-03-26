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
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('ClassController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let testTutorId: string;
  let createdClassId: string;
  let testSubjectIds: {
    math: string;
    physics: string;
    chemistry: string;
    temp: string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
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
    const testEmails = [
      'class-ctrl-admin@test.com',
      'class-ctrl-tutor@test.com',
    ];
    await prisma.enrollment.deleteMany({
      where: { institution: { slug: 'class-ctrl-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'class-ctrl-inst' } },
    });
    await prisma.tutorSubject.deleteMany({
      where: { tutor: { institution: { slug: 'class-ctrl-inst' } } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'class-ctrl-inst' } },
    });
    await prisma.subject.deleteMany({
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
        is_verified: true,
      },
    });
    testTutorId = tutor.id;

    // Create subjects and tutor-subject links
    const subjectMath = await prisma.subject.create({
      data: { name: 'Mathematics', institution_id: testInstitutionId },
    });
    const subjectPhysics = await prisma.subject.create({
      data: { name: 'Physics', institution_id: testInstitutionId },
    });
    const subjectChemistry = await prisma.subject.create({
      data: { name: 'Chemistry', institution_id: testInstitutionId },
    });
    const subjectTemp = await prisma.subject.create({
      data: { name: 'Temp', institution_id: testInstitutionId },
    });
    await prisma.tutorSubject.createMany({
      data: [
        { tutor_id: testTutorId, subject_id: subjectMath.id },
        { tutor_id: testTutorId, subject_id: subjectPhysics.id },
        { tutor_id: testTutorId, subject_id: subjectChemistry.id },
        { tutor_id: testTutorId, subject_id: subjectTemp.id },
      ],
    });

    testSubjectIds = {
      math: subjectMath.id,
      physics: subjectPhysics.id,
      chemistry: subjectChemistry.id,
      temp: subjectTemp.id,
    };

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
      await prisma.tutorSubject.deleteMany({
        where: { tutor: { institution_id: testInstitutionId } },
      });
      await prisma.tutor.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.subject.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.refreshToken.deleteMany({
        where: {
          user: {
            email: {
              in: ['class-ctrl-admin@test.com', 'class-ctrl-tutor@test.com'],
            },
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['class-ctrl-admin@test.com', 'class-ctrl-tutor@test.com'],
          },
        },
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
          subject_id: testSubjectIds.math,
          capacity: 30,
          fee: 500000,
          tutor_fee: 200000,
          schedules: [
            { day: 'Monday', start_time: '14:00', end_time: '15:30' },
            { day: 'Wednesday', start_time: '14:00', end_time: '15:30' },
          ],
          room: 'Room A',
        })
        .expect(201);

      expect(response.body.name).toBe('Math 101');
      expect(response.body.institution_id).toBe(testInstitutionId);
      createdClassId = response.body.id;
    });

    it('should reject creation without auth', async () => {
      await request(app.getHttpServer())
        .post('/admin/classes')
        .send({
          tutor_id: testTutorId,
          name: 'Fail Class',
          subject_id: testSubjectIds.math,
          capacity: 10,
          fee: 100,
          tutor_fee: 50,
          schedules: [
            { day: 'Monday', start_time: '09:00', end_time: '10:00' },
          ],
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
          subject_id: testSubjectIds.math,
          capacity: 10,
          fee: 100,
          tutor_fee: 50,
          schedules: [
            { day: 'Monday', start_time: '15:00', end_time: '14:00' },
          ],
        })
        .expect(400);
    });
  });

  describe('GET /admin/classes', () => {
    beforeAll(async () => {
      await prisma.class.create({
        data: {
          institution_id: testInstitutionId,
          tutor_id: testTutorId,
          name: 'Physics 101',
          subject_id: testSubjectIds.physics,
          capacity: 25,
          fee: 400000,
          schedules: {
            create: [
              { day: 'Tuesday', start_time: '10:00', end_time: '11:30' },
              { day: 'Thursday', start_time: '10:00', end_time: '11:30' },
            ],
          },
          status: 'ACTIVE',
        },
      });
      await prisma.class.create({
        data: {
          institution_id: testInstitutionId,
          tutor_id: testTutorId,
          name: 'Old Chemistry',
          subject_id: testSubjectIds.chemistry,
          capacity: 20,
          fee: 350000,
          schedules: {
            create: [{ day: 'Friday', start_time: '09:00', end_time: '10:30' }],
          },
          status: 'ARCHIVED',
        },
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
          subject_id: testSubjectIds.temp,
          capacity: 10,
          fee: 100,
          schedules: {
            create: [{ day: 'Monday', start_time: '08:00', end_time: '09:00' }],
          },
        },
      });

      await request(app.getHttpServer())
        .delete(`/admin/classes/${toDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
