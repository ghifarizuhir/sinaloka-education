import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PaymentModule } from './payment.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('PaymentController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let studentId: string;
  let enrollmentId: string;
  let paymentId: string;

  const testEmails = ['pay-ctrl-admin@test.com'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        PaymentModule,
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
    await prisma.payment.deleteMany({
      where: { institution: { slug: 'pay-ctrl-inst' } },
    });
    await prisma.enrollment.deleteMany({
      where: { institution: { slug: 'pay-ctrl-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'pay-ctrl-inst' } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'pay-ctrl-inst' } },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'pay-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'pay-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Pay Ctrl Inst', slug: 'pay-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin
    await prisma.user.create({
      data: {
        email: 'pay-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Seed tutor for class
    const tutorUser = await prisma.user.create({
      data: {
        email: 'pay-ctrl-tutor-helper@test.com',
        password_hash: passwordHash,
        name: 'Tutor Helper',
        role: 'TUTOR',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });
    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUser.id,
        institution_id: testInstitutionId,
        subjects: ['Math'],
      },
    });

    // Seed student
    const student = await prisma.student.create({
      data: {
        institution_id: testInstitutionId,
        name: 'Payment Student',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId = student.id;

    // Seed class + enrollment
    const classRecord = await prisma.class.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: tutor.id,
        name: 'Payment Class',
        subject: 'Math',
        capacity: 20,
        fee: 100000,
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        institution_id: testInstitutionId,
        student_id: studentId,
        class_id: classRecord.id,
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    enrollmentId = enrollment.id;

    // Seed a payment
    const payment = await prisma.payment.create({
      data: {
        institution_id: testInstitutionId,
        student_id: studentId,
        enrollment_id: enrollmentId,
        amount: 100000,
        due_date: new Date('2026-04-01'),
        status: 'PENDING',
      },
    });
    paymentId = payment.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pay-ctrl-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.payment.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.enrollment.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.class.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.tutor.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.student.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.refreshToken.deleteMany({
        where: { user: { email: { in: [...testEmails, 'pay-ctrl-tutor-helper@test.com'] } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [...testEmails, 'pay-ctrl-tutor-helper@test.com'] } },
      });
      await prisma.institution.deleteMany({
        where: { id: testInstitutionId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it('GET /admin/payments — should list payments', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeDefined();
    expect(res.body.page).toBeDefined();
    expect(res.body.limit).toBeDefined();
  });

  it('POST /admin/payments — should create a payment', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        enrollment_id: enrollmentId,
        amount: 200000,
        due_date: '2026-05-01',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('PENDING');
  });

  it('GET /admin/payments/:id — should return a payment', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/payments/${paymentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(paymentId);
    expect(res.body.student).toBeDefined();
    expect(res.body.enrollment).toBeDefined();
  });

  it('PATCH /admin/payments/:id — should update a payment', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/payments/${paymentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID', paid_date: '2026-03-15' })
      .expect(200);

    expect(res.body.status).toBe('PAID');
  });

  it('GET /admin/payments?status=PAID — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payments?status=PAID')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.every((p: any) => p.status === 'PAID')).toBe(true);
  });

  it('GET /admin/payments/:id — should return 404 for nonexistent', async () => {
    await request(app.getHttpServer())
      .get('/admin/payments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /admin/payments/:id — should delete a payment', async () => {
    // Create a payment to delete
    const created = await prisma.payment.create({
      data: {
        institution_id: testInstitutionId,
        student_id: studentId,
        enrollment_id: enrollmentId,
        amount: 50000,
        due_date: new Date('2026-06-01'),
        status: 'PENDING',
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/payments/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('GET /admin/payments — should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/admin/payments')
      .expect(401);
  });
});
