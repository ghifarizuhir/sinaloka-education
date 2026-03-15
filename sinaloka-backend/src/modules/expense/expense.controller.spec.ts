import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ExpenseModule } from './expense.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('ExpenseController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let expenseId: string;

  const testEmails = ['expense-ctrl-admin@test.com'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        ExpenseModule,
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
    await prisma.expense.deleteMany({
      where: { institution: { slug: 'expense-ctrl-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'expense-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Expense Ctrl Inst', slug: 'expense-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed admin
    await prisma.user.create({
      data: {
        email: 'expense-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Seed an expense
    const expense = await prisma.expense.create({
      data: {
        institution_id: testInstitutionId,
        category: 'RENT',
        amount: 5000000,
        date: new Date('2026-03-01'),
        description: 'Monthly office rent',
      },
    });
    expenseId = expense.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'expense-ctrl-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.expense.deleteMany({
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

  it('GET /admin/expenses — should list expenses', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeDefined();
    expect(res.body.page).toBeDefined();
    expect(res.body.limit).toBeDefined();
  });

  it('POST /admin/expenses — should create an expense', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'UTILITIES',
        amount: 500000,
        date: '2026-03-15',
        description: 'Electricity bill',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.category).toBe('UTILITIES');
  });

  it('GET /admin/expenses/:id — should return an expense', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(expenseId);
    expect(res.body.category).toBe('RENT');
  });

  it('PATCH /admin/expenses/:id — should update an expense', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 5500000, description: 'Updated rent' })
      .expect(200);

    expect(res.body.description).toBe('Updated rent');
  });

  it('GET /admin/expenses?category=RENT — should filter by category', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/expenses?category=RENT')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      res.body.data.every((e: any) => e.category === 'RENT'),
    ).toBe(true);
  });

  it('GET /admin/expenses/:id — should return 404 for nonexistent', async () => {
    await request(app.getHttpServer())
      .get('/admin/expenses/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('DELETE /admin/expenses/:id — should delete an expense', async () => {
    const created = await prisma.expense.create({
      data: {
        institution_id: testInstitutionId,
        category: 'SUPPLIES',
        amount: 100000,
        date: new Date('2026-03-10'),
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/expenses/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('GET /admin/expenses — should return 401 without token', async () => {
    await request(app.getHttpServer())
      .get('/admin/expenses')
      .expect(401);
  });
});
