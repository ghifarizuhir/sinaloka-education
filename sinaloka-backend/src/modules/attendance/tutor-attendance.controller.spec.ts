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

describe('TutorAttendanceController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tutorToken: string;
  let testInstitutionId: string;
  let sessionId: string;
  let studentId1: string;
  let studentId2: string;

  const testEmails = [
    'tutor-att-tutor@test.com',
    'tutor-att-other@test.com',
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
      where: { institution: { slug: 'tutor-att-inst' } },
    });
    await prisma.session.deleteMany({
      where: { institution: { slug: 'tutor-att-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'tutor-att-inst' } },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'tutor-att-inst' } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'tutor-att-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'tutor-att-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: {
        name: 'Tutor Att Inst',
        slug: 'tutor-att-inst',
      },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-att-tutor@test.com',
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

    // Login as tutor
    const tutorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'tutor-att-tutor@test.com',
        password: 'password123',
      });

    // Handle potential undefined – but in integration test the login should work
    if (!tutorLogin.body.access_token) {
      throw new Error('Failed to get tutor token: ' + JSON.stringify(tutorLogin.body));
    }
    tutorToken = tutorLogin.body.access_token;

    // Seed class
    const classRecord = await prisma.class.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: tutor.id,
        name: 'Math Tutor Att',
        subject: 'Math',
        capacity: 20,
        fee: 100000,
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });

    // Seed session
    const session = await prisma.session.create({
      data: {
        institution_id: testInstitutionId,
        class_id: classRecord.id,
        date: new Date('2026-04-06'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED',
        created_by: tutorUser.id,
      },
    });
    sessionId = session.id;

    // Seed students
    const student1 = await prisma.student.create({
      data: {
        institution_id: testInstitutionId,
        name: 'Alice',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId1 = student1.id;

    const student2 = await prisma.student.create({
      data: {
        institution_id: testInstitutionId,
        name: 'Bob',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId2 = student2.id;
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

  let createdAttendanceId: string;

  it('POST /tutor/attendance — should batch create attendance records', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutor/attendance')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        session_id: sessionId,
        records: [
          { student_id: studentId1, status: 'PRESENT', homework_done: true, notes: 'Great' },
          { student_id: studentId2, status: 'ABSENT', homework_done: false, notes: 'Sick' },
        ],
      })
      .expect(201);

    expect(res.body.length).toBe(2);
    expect(res.body[0].session_id).toBe(sessionId);
    expect(res.body[0].student).toBeDefined();
    createdAttendanceId = res.body[0].id;
  });

  it('POST /tutor/attendance — should reject duplicate attendance', async () => {
    await request(app.getHttpServer())
      .post('/tutor/attendance')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        session_id: sessionId,
        records: [
          { student_id: studentId1, status: 'PRESENT', homework_done: true },
        ],
      })
      .expect(409);
  });

  it('PATCH /tutor/attendance/:id — should update own attendance record', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tutor/attendance/${createdAttendanceId}`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ notes: 'Updated note', homework_done: false })
      .expect(200);

    expect(res.body.notes).toBe('Updated note');
    expect(res.body.homework_done).toBe(false);
  });

  it('should reject attendance creation for non-owner tutor session', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);

    const otherUser = await prisma.user.create({
      data: {
        email: 'tutor-att-other@test.com',
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
        email: 'tutor-att-other@test.com',
        password: 'password123',
      });
    const otherToken = otherLogin.body.access_token;

    // Create a new student to avoid conflict
    const newStudent = await prisma.student.create({
      data: {
        institution_id: testInstitutionId,
        name: 'Charlie',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });

    await request(app.getHttpServer())
      .post('/tutor/attendance')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        session_id: sessionId,
        records: [
          { student_id: newStudent.id, status: 'PRESENT', homework_done: false },
        ],
      })
      .expect(403);
  });
});
