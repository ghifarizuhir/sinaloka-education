import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AttendanceModule } from './attendance.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('AttendanceController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let sessionId: string;
  let classId: string;
  let studentId: string;
  let attendanceId: string;

  const testEmails = [
    'att-ctrl-admin@test.com',
    'att-ctrl-tutor@test.com',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        AttendanceModule,
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
    await prisma.attendance.deleteMany({
      where: { institution: { slug: 'att-ctrl-inst' } },
    });
    await prisma.session.deleteMany({
      where: { institution: { slug: 'att-ctrl-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'att-ctrl-inst' } },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'att-ctrl-inst' } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'att-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'att-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Att Ctrl Inst', slug: 'att-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'att-ctrl-admin@test.com',
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
        email: 'att-ctrl-tutor@test.com',
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
        name: 'Math Attendance',
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

    // Seed session
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

    // Seed student
    const student = await prisma.student.create({
      data: {
        institution_id: testInstitutionId,
        name: 'Alice',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId = student.id;

    // Seed an attendance record for admin to query/update
    const attendance = await prisma.attendance.create({
      data: {
        institution_id: testInstitutionId,
        session_id: sessionId,
        student_id: studentId,
        status: 'PRESENT',
        homework_done: true,
      },
    });
    attendanceId = attendance.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'att-ctrl-admin@test.com',
        password: 'password123',
      });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.attendance.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.session.deleteMany({
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

  it('GET /admin/attendance?session_id= — should list attendance for a session', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/attendance?session_id=${sessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].session_id).toBe(sessionId);
    expect(res.body[0].student).toBeDefined();
  });

  it('PATCH /admin/attendance/:id — should update attendance record', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/attendance/${attendanceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LATE', notes: 'Arrived 10 min late' })
      .expect(200);

    expect(res.body.status).toBe('LATE');
    expect(res.body.notes).toBe('Arrived 10 min late');
  });

  it('PATCH /admin/attendance/:id — should return 404 for nonexistent record', async () => {
    await request(app.getHttpServer())
      .patch('/admin/attendance/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ABSENT' })
      .expect(404);
  });

  it('GET /admin/attendance/summary — should return summary stats', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/admin/attendance/summary?class_id=${classId}&date_from=2026-04-01&date_to=2026-04-30`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.total_records).toBeDefined();
    expect(res.body.present).toBeDefined();
    expect(res.body.absent).toBeDefined();
    expect(res.body.late).toBeDefined();
    expect(res.body.homework_done).toBeDefined();
    expect(res.body.attendance_rate).toBeDefined();
  });
});
