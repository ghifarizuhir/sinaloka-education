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

describe('SessionController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let classId: string;

  const testEmails = [
    'session-ctrl-admin@test.com',
    'session-ctrl-tutor@test.com',
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
      where: { institution: { slug: 'session-ctrl-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'session-ctrl-inst' } },
    });
    await prisma.tutorSubject.deleteMany({
      where: { tutor: { institution: { slug: 'session-ctrl-inst' } } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'session-ctrl-inst' } },
    });
    await prisma.subject.deleteMany({
      where: { institution: { slug: 'session-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'session-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Session Ctrl Inst', slug: 'session-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin user
    await prisma.user.create({
      data: {
        email: 'session-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Seed tutor user + tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'session-ctrl-tutor@test.com',
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
      },
    });

    // Create subject and tutor-subject link
    const subject = await prisma.subject.create({
      data: { name: 'Math', institution_id: testInstitutionId },
    });
    await prisma.tutorSubject.create({
      data: { tutor_id: tutor.id, subject_id: subject.id },
    });

    // Seed a class with schedules
    const classRecord = await prisma.class.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: tutor.id,
        name: 'Math 101',
        subject_id: subject.id,
        capacity: 20,
        fee: 100000,
        schedules: {
          create: [
            { day: 'Monday', start_time: '14:00', end_time: '15:30' },
            { day: 'Wednesday', start_time: '14:00', end_time: '15:30' },
          ],
        },
        status: 'ACTIVE',
      },
    });
    classId = classRecord.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'session-ctrl-admin@test.com',
        password: 'password123',
      });
    adminToken = loginRes.body.access_token;
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
      await prisma.subject.deleteMany({
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

  let createdSessionId: string;

  it('POST /admin/sessions — should create a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class_id: classId,
        date: '2026-04-06',
        start_time: '14:00',
        end_time: '15:30',
      })
      .expect(201);

    expect(res.body.class_id).toBe(classId);
    expect(res.body.institution_id).toBe(testInstitutionId);
    expect(res.body.start_time).toBe('14:00');
    createdSessionId = res.body.id;
  });

  it('GET /admin/sessions — should list sessions with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /admin/sessions?class_id= — should filter by class_id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/sessions?class_id=${classId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.class_id).toBe(classId));
  });

  it('GET /admin/sessions?status=SCHEDULED — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/sessions?status=SCHEDULED')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.status).toBe('SCHEDULED'));
  });

  it('GET /admin/sessions/:id — should return a single session', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdSessionId);
    expect(res.body.class).toBeDefined();
  });

  it('PATCH /admin/sessions/:id — should update a session', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ topic_covered: 'Algebra basics' })
      .expect(200);

    expect(res.body.topic_covered).toBe('Algebra basics');
  });

  it('POST /admin/sessions/generate — should auto-generate sessions from class schedule', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/sessions/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class_id: classId,
        date_from: '2026-05-04', // Monday
        date_to: '2026-05-15', // Friday — Mon 4, Wed 6, Mon 11, Wed 13 = 4
      })
      .expect(201);

    expect(res.body.count).toBe(4);
  });

  it('POST /admin/sessions/generate — should be idempotent (skip existing)', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/sessions/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class_id: classId,
        date_from: '2026-05-04',
        date_to: '2026-05-15',
      })
      .expect(201);

    expect(res.body.count).toBe(0);
  });

  it('DELETE /admin/sessions/:id — should delete a session', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /admin/sessions/:id — should return 404 for nonexistent session', async () => {
    await request(app.getHttpServer())
      .get('/admin/sessions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
