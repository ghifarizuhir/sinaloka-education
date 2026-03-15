import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DashboardModule } from './dashboard.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('DashboardController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;

  const testEmails = ['dash-ctrl-admin@test.com'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        DashboardModule,
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
      where: { institution: { slug: 'dash-ctrl-inst' } },
    });
    await prisma.session.deleteMany({
      where: { institution: { slug: 'dash-ctrl-inst' } },
    });
    await prisma.payment.deleteMany({
      where: { institution: { slug: 'dash-ctrl-inst' } },
    });
    await prisma.enrollment.deleteMany({
      where: { institution: { slug: 'dash-ctrl-inst' } },
    });
    await prisma.class.deleteMany({
      where: { institution: { slug: 'dash-ctrl-inst' } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'dash-ctrl-inst' } },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'dash-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'dash-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Dash Ctrl Inst', slug: 'dash-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin
    await prisma.user.create({
      data: {
        email: 'dash-ctrl-admin@test.com',
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
      .send({ email: 'dash-ctrl-admin@test.com', password: 'password123' });
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

  it('GET /admin/dashboard/stats — should return stats object', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('total_students');
    expect(res.body).toHaveProperty('active_tutors');
    expect(res.body).toHaveProperty('total_revenue');
    expect(res.body).toHaveProperty('attendance_rate');
    expect(res.body).toHaveProperty('upcoming_sessions');
  });

  it('GET /admin/dashboard/activity — should return array', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/dashboard/activity')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /admin/dashboard/stats — should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/admin/dashboard/stats')
      .expect(401);
  });
});
