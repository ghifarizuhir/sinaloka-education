import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ReportModule } from './report.module.js';
import { ReportService } from './report.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('ReportController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;

  const fakePdf = Buffer.from('%PDF-1.4 fake');
  const testEmails = ['report-ctrl-admin@test.com'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PrismaModule,
        AuthModule,
        ReportModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    })
      .overrideProvider(ReportService)
      .useValue({
        generateAttendanceReport: jest.fn().mockResolvedValue(fakePdf),
        generateFinanceReport: jest.fn().mockResolvedValue(fakePdf),
        generateStudentProgressReport: jest.fn().mockResolvedValue(fakePdf),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up test data
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'report-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Report Ctrl Inst', slug: 'report-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin
    await prisma.user.create({
      data: {
        email: 'report-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'report-ctrl-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
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

  it('GET /admin/reports/attendance — should return application/pdf', async () => {
    await request(app.getHttpServer())
      .get('/admin/reports/attendance?date_from=2026-01-01&date_to=2026-03-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('content-type', /application\/pdf/);
  });

  it('GET /admin/reports/finance — should return application/pdf', async () => {
    await request(app.getHttpServer())
      .get('/admin/reports/finance?date_from=2026-01-01&date_to=2026-03-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('content-type', /application\/pdf/);
  });

  it('GET /admin/reports/student-progress — should return application/pdf', async () => {
    await request(app.getHttpServer())
      .get(
        '/admin/reports/student-progress?student_id=10000000-0000-4000-a000-000000000001',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('content-type', /application\/pdf/);
  });

  it('GET /admin/reports/attendance — should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/admin/reports/attendance?date_from=2026-01-01&date_to=2026-03-31')
      .expect(401);
  });
});
