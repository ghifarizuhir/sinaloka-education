import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PayoutModule } from './payout.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('PayoutController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let tutorId: string;
  let payoutId: string;

  const testEmails = [
    'payout-ctrl-admin@test.com',
    'payout-ctrl-tutor@test.com',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        PayoutModule,
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
    await prisma.payout.deleteMany({
      where: { institution: { slug: 'payout-ctrl-inst' } },
    });
    await prisma.tutor.deleteMany({
      where: { institution: { slug: 'payout-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'payout-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Payout Ctrl Inst', slug: 'payout-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin
    await prisma.user.create({
      data: {
        email: 'payout-ctrl-admin@test.com',
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
        email: 'payout-ctrl-tutor@test.com',
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
    tutorId = tutor.id;

    // Seed a payout
    const payout = await prisma.payout.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: tutorId,
        amount: 500000,
        date: new Date('2026-03-01'),
        status: 'PENDING',
      },
    });
    payoutId = payout.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'payout-ctrl-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.payout.deleteMany({
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

  it('GET /admin/payouts — should list payouts', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payouts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeDefined();
    expect(res.body.page).toBeDefined();
    expect(res.body.limit).toBeDefined();
  });

  it('POST /admin/payouts — should create a payout', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/payouts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tutor_id: tutorId,
        amount: 750000,
        date: '2026-04-01',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('PENDING');
  });

  it('GET /admin/payouts/:id — should return a payout', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/payouts/${payoutId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(payoutId);
    expect(res.body.tutor).toBeDefined();
  });

  it('PATCH /admin/payouts/:id — should update a payout', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/payouts/${payoutId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROCESSING' })
      .expect(200);

    expect(res.body.status).toBe('PROCESSING');
  });

  it('GET /admin/payouts?status=PROCESSING — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/payouts?status=PROCESSING')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      res.body.data.every((p: any) => p.status === 'PROCESSING'),
    ).toBe(true);
  });

  it('GET /admin/payouts/:id — should return 404 for nonexistent', async () => {
    await request(app.getHttpServer())
      .get('/admin/payouts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /admin/payouts/:id — should delete a payout', async () => {
    const created = await prisma.payout.create({
      data: {
        institution_id: testInstitutionId,
        tutor_id: tutorId,
        amount: 100000,
        date: new Date('2026-06-01'),
        status: 'PENDING',
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/payouts/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('GET /admin/payouts — should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/admin/payouts')
      .expect(401);
  });
});
