import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ParentModule } from './parent.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('Parent (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let institutionId: string;
  let adminToken: string;
  let studentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PrismaModule,
        AuthModule,
        ParentModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Clean up any leftover test data
    await prisma.parentStudent.deleteMany({
      where: { parent: { institution: { slug: 'parent-test-inst' } } },
    });
    await prisma.parentInvite.deleteMany({
      where: { institution: { slug: 'parent-test-inst' } },
    });
    await prisma.parent.deleteMany({
      where: { institution: { slug: 'parent-test-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: { in: ['parent-admin@test.com', 'parent-user@test.com'] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['parent-admin@test.com', 'parent-user@test.com'] },
      },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'parent-test-inst' } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'parent-test-inst' },
    });

    // Seed test data
    const institution = await prisma.institution.create({
      data: { name: 'Parent Test Inst', slug: 'parent-test-inst' },
    });
    institutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'parent-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
        is_active: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Test Child',
        grade: '5',
        parent_email: 'parent-user@test.com',
      },
    });
    studentId = student.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'parent-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.parentStudent.deleteMany({
        where: { parent: { institution_id: institutionId } },
      });
      await prisma.parentInvite.deleteMany({
        where: { institution_id: institutionId },
      });
      await prisma.parent.deleteMany({
        where: { institution_id: institutionId },
      });
      await prisma.refreshToken.deleteMany({
        where: {
          user: {
            email: { in: ['parent-admin@test.com', 'parent-user@test.com'] },
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: { in: ['parent-admin@test.com', 'parent-user@test.com'] },
        },
      });
      await prisma.student.deleteMany({
        where: { institution_id: institutionId },
      });
      await prisma.institution.deleteMany({ where: { id: institutionId } });
    }
    if (app) await app.close();
  });

  it('full parent flow: invite → register → view children', async () => {
    // 1. Admin creates invite
    const inviteRes = await request(app.getHttpServer())
      .post('/admin/parents/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'parent-user@test.com', student_ids: [studentId] })
      .expect(201);

    expect(inviteRes.body).toHaveProperty('token');

    // 2. Parent registers
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register/parent')
      .send({
        token: inviteRes.body.token,
        name: 'Parent User',
        password: 'securepass123',
      })
      .expect(201);

    expect(registerRes.body).toHaveProperty('access_token');
    const parentToken = registerRes.body.access_token;

    // 3. Parent views children
    const childrenRes = await request(app.getHttpServer())
      .get('/parent/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(childrenRes.body).toHaveLength(1);
    expect(childrenRes.body[0].name).toBe('Test Child');
  });

  it('should deny parent access to unlinked student', async () => {
    // Create another student not linked to parent
    const otherStudent = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Other Child',
        grade: '3',
      },
    });

    // Login as parent
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'parent-user@test.com', password: 'securepass123' });
    const parentToken = loginRes.body.access_token;

    // Try to access unlinked student
    await request(app.getHttpServer())
      .get(`/parent/children/${otherStudent.id}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    // Clean up
    await prisma.student.delete({ where: { id: otherStudent.id } });
  });
});
