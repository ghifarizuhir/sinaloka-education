import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TutorModule } from './tutor.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('TutorProfileController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tutorToken: string;
  let adminToken: string;
  let testInstitutionId: string;
  let tutorUserId: string;

  const testEmails = [
    'tutor-profile-admin@test.com',
    'tutor-profile-user@test.com',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        TutorModule,
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
    await prisma.tutor.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'tutor-profile-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: { name: 'Tutor Profile Inst', slug: 'tutor-profile-inst' },
    });
    testInstitutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create tutor user
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-profile-user@test.com',
        password_hash: passwordHash,
        name: 'Profile Tutor',
        role: 'TUTOR',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });
    tutorUserId = tutorUser.id;

    // Create tutor record
    await prisma.tutor.create({
      data: {
        user_id: tutorUserId,
        institution_id: testInstitutionId,
        subjects: ['Math'],
        experience_years: 2,
      },
    });

    // Create admin user
    await prisma.user.create({
      data: {
        email: 'tutor-profile-admin@test.com',
        password_hash: passwordHash,
        name: 'Profile Admin',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });

    // Login as tutor
    const tutorLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'tutor-profile-user@test.com',
        password: 'password123',
      });
    tutorToken = tutorLogin.body.access_token;

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'tutor-profile-admin@test.com',
        password: 'password123',
      });
    adminToken = adminLogin.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
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

  describe('GET /tutor/profile', () => {
    it('should return tutor profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/tutor/profile')
        .set('Authorization', `Bearer ${tutorToken}`)
        .expect(200);

      expect(response.body.subjects).toEqual(['Math']);
      expect(response.body.user.name).toBe('Profile Tutor');
      expect(response.body.user.email).toBe('tutor-profile-user@test.com');
    });

    it('should reject admin role accessing tutor profile', async () => {
      await request(app.getHttpServer())
        .get('/tutor/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('PATCH /tutor/profile', () => {
    it('should update bank details', async () => {
      const response = await request(app.getHttpServer())
        .patch('/tutor/profile')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          bank_name: 'BCA',
          bank_account_number: '1234567890',
          bank_account_holder: 'Profile Tutor',
        })
        .expect(200);

      expect(response.body.bank_name).toBe('BCA');
      expect(response.body.bank_account_number).toBe('1234567890');
      expect(response.body.bank_account_holder).toBe('Profile Tutor');
    });

    it('should update availability', async () => {
      const availability = {
        monday: ['09:00-12:00', '14:00-17:00'],
        wednesday: ['09:00-12:00'],
      };

      const response = await request(app.getHttpServer())
        .patch('/tutor/profile')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ availability })
        .expect(200);

      expect(response.body.availability).toEqual(availability);
    });

    it('should not allow admin to update tutor profile', async () => {
      await request(app.getHttpServer())
        .patch('/tutor/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bank_name: 'Hack' })
        .expect(403);
    });
  });
});
