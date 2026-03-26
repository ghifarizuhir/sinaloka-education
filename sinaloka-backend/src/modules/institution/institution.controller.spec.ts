import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { InstitutionModule } from './institution.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('InstitutionController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let testSuperAdminId: string;
  let testAdminId: string;
  let testInstitutionId: string;
  let createdInstitutionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PrismaModule,
        AuthModule,
        InstitutionModule,
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
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: {
            in: ['inst-super-admin@test.com', 'inst-admin@test.com'],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['inst-super-admin@test.com', 'inst-admin@test.com'],
        },
      },
    });
    await prisma.institution.deleteMany({
      where: {
        slug: {
          in: [
            'inst-ctrl-test',
            'new-institution',
            'new-institution-2',
            'updated-institution',
          ],
        },
      },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Inst Ctrl Test', slug: 'inst-ctrl-test' },
    });
    testInstitutionId = institution.id;

    // Create super admin (no institution)
    const passwordHash = await bcrypt.hash('password123', 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: 'inst-super-admin@test.com',
        password_hash: passwordHash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        is_active: true,
      },
    });
    testSuperAdminId = superAdmin.id;

    // Create regular admin
    const admin = await prisma.user.create({
      data: {
        email: 'inst-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin User',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });
    testAdminId = admin.id;

    // Login as super admin
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'inst-super-admin@test.com', password: 'password123' });
    superAdminToken = superAdminLogin.body.access_token;

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'inst-admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.refreshToken.deleteMany({
        where: {
          user_id: { in: [testSuperAdminId, testAdminId] },
        },
      });
      if (createdInstitutionId) {
        await prisma.institution.deleteMany({
          where: { id: createdInstitutionId },
        });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [testSuperAdminId, testAdminId] } },
      });
      await prisma.institution.deleteMany({
        where: { id: testInstitutionId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /admin/institutions', () => {
    it('should create institution as super admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'New Institution' })
        .expect(201);

      expect(response.body.name).toBe('New Institution');
      expect(response.body.slug).toBe('new-institution');
      expect(response.body.id).toBeDefined();
      createdInstitutionId = response.body.id;
    });

    it('should reject creation for admin role', async () => {
      await request(app.getHttpServer())
        .post('/admin/institutions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Should Fail' })
        .expect(403);
    });

    it('should reject creation for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/admin/institutions')
        .send({ name: 'Should Fail' })
        .expect(401);
    });
  });

  describe('GET /admin/institutions', () => {
    it('should list institutions', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /admin/institutions/:id', () => {
    it('should get institution by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/institutions/${testInstitutionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.id).toBe(testInstitutionId);
      expect(response.body.name).toBe('Inst Ctrl Test');
    });

    it('should return 404 for non-existent institution', async () => {
      await request(app.getHttpServer())
        .get('/admin/institutions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/institutions/:id', () => {
    it('should update institution', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/institutions/${testInstitutionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ address: '456 Updated Ave' })
        .expect(200);

      expect(response.body.address).toBe('456 Updated Ave');
    });
  });

  describe('DELETE /admin/institutions/:id', () => {
    it('should delete institution', async () => {
      // Create one to delete
      const created = await request(app.getHttpServer())
        .post('/admin/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'To Delete' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/admin/institutions/${created.body.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(204);
    });
  });
});
