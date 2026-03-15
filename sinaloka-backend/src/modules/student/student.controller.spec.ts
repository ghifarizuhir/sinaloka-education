import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StudentModule } from './student.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('StudentController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let testInstitutionId: string;
  let createdStudentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        StudentModule,
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
    const testEmails = ['student-ctrl-admin@test.com'];
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'student-ctrl-inst' } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'student-ctrl-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Student Ctrl Inst', slug: 'student-ctrl-inst' },
    });
    testInstitutionId = institution.id;

    // Create admin
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'student-ctrl-admin@test.com',
        password_hash: passwordHash,
        name: 'Student Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student-ctrl-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.student.deleteMany({
        where: { institution_id: testInstitutionId },
      });
      await prisma.refreshToken.deleteMany({
        where: { user: { email: 'student-ctrl-admin@test.com' } },
      });
      await prisma.user.deleteMany({
        where: { email: 'student-ctrl-admin@test.com' },
      });
      await prisma.institution.deleteMany({
        where: { id: testInstitutionId },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /admin/students', () => {
    it('should create a student', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Student',
          grade: '10',
          email: 'student1@test.com',
          parent_name: 'Parent One',
          parent_phone: '1234567890',
        })
        .expect(201);

      expect(response.body.name).toBe('Test Student');
      expect(response.body.grade).toBe('10');
      expect(response.body.institution_id).toBe(testInstitutionId);
      createdStudentId = response.body.id;
    });

    it('should reject creation without auth', async () => {
      await request(app.getHttpServer())
        .post('/admin/students')
        .send({ name: 'Fail Student', grade: '10' })
        .expect(401);
    });
  });

  describe('GET /admin/students', () => {
    beforeAll(async () => {
      // Create extra students for list/filter tests
      await prisma.student.createMany({
        data: [
          {
            institution_id: testInstitutionId,
            name: 'Alice Smith',
            email: 'alice@test.com',
            grade: '11',
            status: 'ACTIVE',
          },
          {
            institution_id: testInstitutionId,
            name: 'Bob Jones',
            email: 'bob@test.com',
            grade: '12',
            status: 'INACTIVE',
          },
        ],
      });
    });

    it('should list students with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('should search students by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/students?search=alice')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.data.some((s: any) => s.name === 'Alice Smith'),
      ).toBe(true);
    });

    it('should filter students by grade', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/students?grade=12')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const s of response.body.data) {
        expect(s.grade).toBe('12');
      }
    });

    it('should filter students by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/students?status=INACTIVE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const s of response.body.data) {
        expect(s.status).toBe('INACTIVE');
      }
    });
  });

  describe('GET /admin/students/:id', () => {
    it('should get a single student', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdStudentId);
      expect(response.body.name).toBe('Test Student');
    });

    it('should return 404 for non-existent student', async () => {
      await request(app.getHttpServer())
        .get('/admin/students/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/students/:id', () => {
    it('should update a student', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Student Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Student Name');
    });
  });

  describe('DELETE /admin/students/:id', () => {
    it('should delete a student', async () => {
      const toDelete = await prisma.student.create({
        data: {
          institution_id: testInstitutionId,
          name: 'To Delete',
          grade: '9',
        },
      });

      await request(app.getHttpServer())
        .delete(`/admin/students/${toDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
