import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SessionModule } from './session.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('TutorSessionController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tutorToken: string;
  let adminToken: string;
  let testInstitutionId: string;
  let classId: string;
  let sessionId: string;

  const testEmails = [
    'tutor-sched-admin@test.com',
    'tutor-sched-tutor@test.com',
    'tutor-sched-other@test.com',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        SessionModule,
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
    await prisma.session.deleteMany({
      where: { institution: { slug: 'tutor-sched-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'tutor-sched-inst' } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'tutor-sched-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'tutor-sched-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Tutor Sched Inst', slug: 'tutor-sched-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'tutor-sched-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Seed tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-sched-tutor@test.com',
        password_hash: passwordHash,
        name: 'Tutor',
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

    // Seed class
    const classRecord = await prisma.class.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: tutor.id,
        name: 'Math 201',
        subject: 'Math',
        capacity: 20,
        fee: 100000,
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });
    classId = classRecord.id;

    // Seed a session
    const session = await prisma.session.create({
      data: {
        institution_id: testInstitutionId,
        class_id: classId,
        date: new Date('2026-04-06'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED',
        created_by: adminUser.id,
      },
    });
    sessionId = session.id;

    // Login as tutor
    const tutorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'tutor-sched-tutor@test.com',
        password: 'password123',
      });
    tutorToken = tutorLogin.body.access_token;

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'tutor-sched-admin@test.com',
        password: 'password123',
      });
    adminToken = adminLogin.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.session.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.class.deleteMany({
        where: { institution_id: testInstitutionId },
      });
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

  it('GET /tutor/schedule — should return sessions for tutor', async () => {
    const res = await request(app.getHttpServer())
      .get('/tutor/schedule')
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /tutor/schedule?status=SCHEDULED — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/tutor/schedule?status=SCHEDULED')
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.status).toBe('SCHEDULED'));
  });

  it('PATCH /tutor/schedule/:id/request-reschedule — should request reschedule', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tutor/schedule/${sessionId}/request-reschedule`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        proposed_date: '2026-04-10',
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      })
      .expect(200);

    expect(res.body.status).toBe('RESCHEDULE_REQUESTED');
    expect(res.body.proposed_start_time).toBe('16:00');
    expect(res.body.reschedule_reason).toBe('Personal conflict');
  });

  it('PATCH /admin/sessions/:id/approve — admin approves reschedule', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/sessions/${sessionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true })
      .expect(200);

    expect(res.body.status).toBe('SCHEDULED');
    expect(res.body.start_time).toBe('16:00');
    expect(res.body.end_time).toBe('17:30');
    expect(res.body.proposed_date).toBeNull();
    expect(res.body.proposed_start_time).toBeNull();
    expect(res.body.approved_by).toBeDefined();
  });

  it('PATCH /tutor/schedule/:id/request-reschedule — then admin rejects', async () => {
    // First request reschedule again
    await request(app.getHttpServer())
      .patch(`/tutor/schedule/${sessionId}/request-reschedule`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        proposed_date: '2026-04-15',
        proposed_start_time: '09:00',
        proposed_end_time: '10:30',
        reschedule_reason: 'Another conflict',
      })
      .expect(200);

    // Admin rejects
    const res = await request(app.getHttpServer())
      .patch(`/admin/sessions/${sessionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: false })
      .expect(200);

    expect(res.body.status).toBe('SCHEDULED');
    expect(res.body.proposed_date).toBeNull();
    // Time should still be the previously approved time
    expect(res.body.start_time).toBe('16:00');
  });

  it('PATCH /tutor/schedule/:id/cancel — should cancel own session', async () => {
    // Create a fresh session to cancel
    const freshSession = await prisma.session.create({
      data: {
        institution_id: testInstitutionId,
        class_id: classId,
        date: new Date('2026-04-13'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED',
        created_by: (await prisma.user.findFirst({ where: { email: 'tutor-sched-tutor@test.com' } }))!.id,
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/tutor/schedule/${freshSession.id}/cancel`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body.status).toBe('CANCELLED');
  });

  it('should reject request from non-owner tutor', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);

    const otherUser = await prisma.user.create({
      data: {
        email: 'tutor-sched-other@test.com',
        password_hash: passwordHash,
        name: 'Other Tutor',
        role: 'TUTOR',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    await prisma.tutor.create({
      data: {
        user_id: otherUser.id,
        institution_id: testInstitutionId,
        subjects: ['Science'],
      },
    });

    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'tutor-sched-other@test.com',
        password: 'password123',
      });
    const otherToken = otherLogin.body.access_token;

    await request(app.getHttpServer())
      .patch(`/tutor/schedule/${sessionId}/request-reschedule`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        proposed_date: '2026-04-20',
        proposed_start_time: '10:00',
        proposed_end_time: '11:30',
        reschedule_reason: 'Hijack attempt',
      })
      .expect(403);
  });
});
