import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuthModule } from './auth.module.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUserId: string;
  let testInstitutionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        PrismaModule,
        AuthModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up any test data
    await prisma.refreshToken.deleteMany({
      where: { user: { email: 'auth-test@test.com' } },
    });
    await prisma.user.deleteMany({
      where: { email: 'auth-test@test.com' },
    });
    await prisma.institution.deleteMany({
      where: { slug: 'auth-test-inst' },
    });

    // Create test institution
    const institution = await prisma.institution.create({
      data: {
        name: 'Auth Test Institution',
        slug: 'auth-test-inst',
      },
    });
    testInstitutionId = institution.id;

    // Create test user
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'auth-test@test.com',
        password_hash: passwordHash,
        name: 'Auth Test User',
        role: 'ADMIN',
        institution_id: testInstitutionId,
        is_active: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up
    if (prisma) {
      await prisma.refreshToken.deleteMany({
        where: { user_id: testUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
      await prisma.institution.deleteMany({
        where: { id: testInstitutionId },
      });
    }

    if (app) {
      await app.close();
    }
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'password123' })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.expires_in).toBeGreaterThan(0);
    });

    it('should return 401 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' })
        .expect(401);
    });

    it('should return 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 400 for missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // First login to get a refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'password123' })
        .expect(200);

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginResponse.body.refresh_token })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('access_token');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
      // New refresh token should be different from the old one
      expect(refreshResponse.body.refresh_token).not.toBe(
        loginResponse.body.refresh_token,
      );
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile when authenticated', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'password123' })
        .expect(200);

      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .expect(200);

      expect(meResponse.body.email).toBe('auth-test@test.com');
      expect(meResponse.body.name).toBe('Auth Test User');
      expect(meResponse.body.role).toBe('ADMIN');
      expect(meResponse.body.institution).toBeDefined();
      expect(meResponse.body.institution.name).toBe('Auth Test Institution');
      // Should not expose password
      expect(meResponse.body.password_hash).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and revoke refresh token', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'password123' })
        .expect(200);

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .send({ refresh_token: loginResponse.body.refresh_token })
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Try to use the revoked refresh token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginResponse.body.refresh_token })
        .expect(401);
    });
  });
});
