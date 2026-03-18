import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EnrollmentModule } from './enrollment.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('EnrollmentController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let testTutorId: string;
  let testStudentId: string;
  let classAId: string; // Mon/Wed 14:00-15:30
  let classBId: string; // Mon 15:00-16:30 (conflicts with A)
  let classCId: string; // Tue/Thu 14:00-15:30 (no conflict with A)
  let createdEnrollmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        EnrollmentModule,
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
      'enroll-ctrl-admin@test.com',
      'enroll-ctrl-tutor@test.com',
    ];
    await prisma.enrollment.deleteMany({
      where: { institution: { slug: 'enroll-ctrl-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'enroll-ctrl-inst' } },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'enroll-ctrl-inst' } },
    });
    await prisma.tutorSubject.deleteMany({
      where: { tutor: { institution: { slug: 'enroll-ctrl-inst' } } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'enroll-ctrl-inst' } },
    });
    await prisma.subject.deleteMany({
      where: { institution: { slug: 'enroll-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'enroll-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Enroll Ctrl Inst', slug: 'enroll-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    // Create admin
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'enroll-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Enroll Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Create tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'enroll-ctrl-tutor@test.com',
        password_hash: passwordHash,
        name: 'Enroll Tutor',
        role: 'TUTOR',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUser.id,
        institution_id: testInstitutionId,
      },
    });
    testTutorId = tutor.id;

    // Create subjects and tutor-subject links
    const subjectMath = await prisma.subject.create({
      data: { name: 'Math', institution_id: testInstitutionId },
    });
    const subjectPhysics = await prisma.subject.create({
      data: { name: 'Physics', institution_id: testInstitutionId },
    });
    const subjectChemistry = await prisma.subject.create({
      data: { name: 'Chemistry', institution_id: testInstitutionId },
    });
    await prisma.tutorSubject.createMany({
      data: [
        { tutor_id: testTutorId, subject_id: subjectMath.id },
        { tutor_id: testTutorId, subject_id: subjectPhysics.id },
        { tutor_id: testTutorId, subject_id: subjectChemistry.id },
      ],
    });

    // Create student
    const student = await prisma.student.create({
      data: {
        institution_id: testInstitutionId,
        name: 'Test Student',
        grade: '10',
      },
    });
    testStudentId = student.id;

    // Create 3 classes
    const classA = await prisma.class.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: testTutorId,
        name: 'Class A',
        subject_id: subjectMath.id,
        capacity: 30,
        fee: 500000,
        schedules: {
          create: [
            { day: 'Monday', start_time: '14:00', end_time: '15:30' },
            { day: 'Wednesday', start_time: '14:00', end_time: '15:30' },
          ],
        },
      },
    });
    classAId = classA.id;

    const classB = await prisma.class.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: testTutorId,
        name: 'Class B',
        subject_id: subjectPhysics.id,
        capacity: 25,
        fee: 400000,
        schedules: {
          create: [
            { day: 'Monday', start_time: '15:00', end_time: '16:30' },
          ],
        },
      },
    });
    classBId = classB.id;

    const classC = await prisma.class.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: testTutorId,
        name: 'Class C',
        subject_id: subjectChemistry.id,
        capacity: 20,
        fee: 350000,
        schedules: {
          create: [
            { day: 'Tuesday', start_time: '14:00', end_time: '15:30' },
            { day: 'Thursday', start_time: '14:00', end_time: '15:30' },
          ],
        },
      },
    });
    classCId = classC.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'enroll-ctrl-admin@test.com',
        password: 'password123',
      });
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
      await prisma.student.deleteMany({
        where: { institution_id: testInstitutionId },
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
              in: [
                'enroll-ctrl-admin@test.com',
                'enroll-ctrl-tutor@test.com',
              ],
            },
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'enroll-ctrl-admin@test.com',
              'enroll-ctrl-tutor@test.com',
            ],
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

  describe('POST /admin/enrollments', () => {
    it('should create an enrollment', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: testStudentId,
          class_id: classAId,
        })
        .expect(201);

      expect(response.body.student_id).toBe(testStudentId);
      expect(response.body.class_id).toBe(classAId);
      expect(response.body.institution_id).toBe(testInstitutionId);
      expect(response.body.student).toBeDefined();
      expect(response.body.class).toBeDefined();
      createdEnrollmentId = response.body.id;
    });

    it('should reject duplicate enrollment', async () => {
      await request(app.getHttpServer())
        .post('/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: testStudentId,
          class_id: classAId,
        })
        .expect(409);
    });

    it('should reject enrollment with schedule conflict', async () => {
      // Class B (Mon 15:00-16:30) conflicts with Class A (Mon/Wed 14:00-15:30)
      const response = await request(app.getHttpServer())
        .post('/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: testStudentId,
          class_id: classBId,
        })
        .expect(409);

      expect(response.body.message).toContain('Schedule conflict');
    });

    it('should allow enrollment with no schedule conflict', async () => {
      // Class C (Tue/Thu 14:00-15:30) does not conflict with Class A (Mon/Wed 14:00-15:30)
      const response = await request(app.getHttpServer())
        .post('/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: testStudentId,
          class_id: classCId,
        })
        .expect(201);

      expect(response.body.class_id).toBe(classCId);
    });
  });

  describe('POST /admin/enrollments/check-conflict', () => {
    it('should detect conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/enrollments/check-conflict')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: testStudentId,
          class_id: classBId,
        })
        .expect(201);

      expect(response.body.has_conflict).toBe(true);
      expect(response.body.conflicting_classes.length).toBeGreaterThan(0);
    });

    it('should return no conflict for compatible schedule', async () => {
      // Create a new student with no enrollments
      const newStudent = await prisma.student.create({
        data: {
          institution_id: testInstitutionId,
          name: 'Fresh Student',
          grade: '11',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/admin/enrollments/check-conflict')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: newStudent.id,
          class_id: classAId,
        })
        .expect(201);

      expect(response.body.has_conflict).toBe(false);
      expect(response.body.conflicting_classes).toHaveLength(0);
    });
  });

  describe('GET /admin/enrollments', () => {
    it('should list enrollments with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter enrollments by student_id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/enrollments?student_id=${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const e of response.body.data) {
        expect(e.student_id).toBe(testStudentId);
      }
    });
  });

  describe('GET /admin/enrollments/:id', () => {
    it('should get a single enrollment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/enrollments/${createdEnrollmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdEnrollmentId);
      expect(response.body.student).toBeDefined();
      expect(response.body.class).toBeDefined();
    });

    it('should return 404 for non-existent enrollment', async () => {
      await request(app.getHttpServer())
        .get('/admin/enrollments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/enrollments/:id', () => {
    it('should update an enrollment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/enrollments/${createdEnrollmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DROPPED', payment_status: 'PAID' })
        .expect(200);

      expect(response.body.status).toBe('DROPPED');
      expect(response.body.payment_status).toBe('PAID');
    });
  });

  describe('DELETE /admin/enrollments/:id', () => {
    it('should delete an enrollment', async () => {
      // Create a temporary enrollment to delete
      const tempEnrollment = await prisma.enrollment.create({
        data: {
          institution_id: testInstitutionId,
          student_id: testStudentId,
          class_id: classBId,
          status: 'WAITLISTED',
        },
      });

      await request(app.getHttpServer())
        .delete(`/admin/enrollments/${tempEnrollment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
