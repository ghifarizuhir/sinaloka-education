import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from './user.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('UserController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let testSuperAdminId: string;
  let testAdminId: string;
  let testInstitutionId: string;
  let testInstitutionId2: string;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        UserModule,
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
    const testEmails = [
      'user-ctrl-super@test.com',
      'user-ctrl-admin@test.com',
      'user-new@test.com',
      'user-to-delete@test.com',
      'user-other-inst@test.com',
    ];

    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: { in: ['user-ctrl-inst', 'user-ctrl-inst-2'] } },
    });

    // Create test institutions
    const institution = await prisma.institution.create({
      data: { name: 'User Ctrl Inst', slug: 'user-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    const institution2 = await prisma.institution.create({
      data: { name: 'User Ctrl Inst 2', slug: 'user-ctrl-inst-2' },
    });
    testInstitutionId2 = institution2.id;

    // Create super admin (no institution)
    const passwordHash = await bcrypt.hash('password123', 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: 'user-ctrl-super@test.com',
        password_hash: passwordHash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        is_active: true,
      },
    });
    testSuperAdminId = superAdmin.id;

    // Create admin scoped to institution
    const admin = await prisma.user.create({
      data: {
        email: 'user-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin User',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });
    testAdminId = admin.id;

    // Create user in other institution for scoping test
    await prisma.user.create({
      data: {
        email: 'user-other-inst@test.com',
        password_hash: passwordHash,
        name: 'Other Inst User',
        role: 'ADMIN',
        institution_id: testInstitutionId2,
        is_active: true,
      },
    });

    // Login as super admin
    const superAdminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-ctrl-super@test.com', password: 'password123' });
    superAdminToken = superAdminLogin.body.access_token;

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user-ctrl-admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      const testEmails = [
        'user-ctrl-super@test.com',
        'user-ctrl-admin@test.com',
        'user-new@test.com',
        'user-to-delete@test.com',
        'user-other-inst@test.com',
      ];
      await prisma.refreshToken.deleteMany({
        where: { user: { email: { in: testEmails } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: testEmails } },
      });
      await prisma.institution.deleteMany({
        where: { id: { in: [testInstitutionId, testInstitutionId2] } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /admin/users', () => {
    it('should create a user as super admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'New User',
          email: 'user-new@test.com',
          password: 'password123',
          role: 'ADMIN',
          institution_id: testInstitutionId,
        })
        .expect(201);

      expect(response.body.name).toBe('New User');
      expect(response.body.email).toBe('user-new@test.com');
      expect(response.body.role).toBe('ADMIN');
      expect(response.body.password_hash).toBeUndefined();
      createdUserId = response.body.id;
    });

    it('should reject creation for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .send({
          name: 'Fail User',
          email: 'fail@test.com',
          password: 'password123',
          role: 'ADMIN',
        })
        .expect(401);
    });
  });

  describe('GET /admin/users', () => {
    it('should list all users as super admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should only list institution-scoped users as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Admin should only see users in their institution
      const institutionIds = response.body.data.map(
        (u: any) => u.institution_id,
      );
      for (const instId of institutionIds) {
        expect(instId).toBe(testInstitutionId);
      }
    });
  });

  describe('GET /admin/users/:id', () => {
    it('should get user by id as super admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/users/${testAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.id).toBe(testAdminId);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('should update user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Updated User Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated User Name');
    });
  });

  describe('DELETE /admin/users/:id', () => {
    it('should delete user', async () => {
      // Create a user to delete
      const passwordHash = await bcrypt.hash('password123', 10);
      const toDelete = await prisma.user.create({
        data: {
          email: 'user-to-delete@test.com',
          password_hash: passwordHash,
          name: 'To Delete',
          role: 'ADMIN',
          institution_id: testInstitutionId,
          is_active: true,
        },
      });

      await request(app.getHttpServer())
        .delete(`/admin/users/${toDelete.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(204);
    });
  });
});
