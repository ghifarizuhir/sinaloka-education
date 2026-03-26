import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

import { InstitutionService } from './institution.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let prisma: {
    institution: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    student: { count: jest.Mock };
    tutor: { count: jest.Mock };
    subject: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockInstitution = {
    id: 'inst-1',
    name: 'Test Institution',
    slug: 'test-institution',
    address: null,
    phone: null,
    email: null,
    logo_url: null,
    settings: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      institution: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      student: { count: jest.fn() },
      tutor: { count: jest.fn() },
      subject: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InstitutionService>(InstitutionService);
  });

  describe('findAll', () => {
    it('should return paginated institutions', async () => {
      prisma.institution.findMany.mockResolvedValue([mockInstitution]);
      prisma.institution.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 20,
        sort_order: 'asc' as const,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(prisma.institution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should filter by search term', async () => {
      prisma.institution.findMany.mockResolvedValue([]);
      prisma.institution.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 20,
        search: 'test',
        sort_order: 'asc' as const,
      });

      expect(prisma.institution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { slug: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an institution by id', async () => {
      prisma.institution.findUnique.mockResolvedValue(mockInstitution);

      const result = await service.findOne('inst-1');

      expect(result).toEqual(mockInstitution);
      expect(prisma.institution.findUnique).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        include: {
          users: {
            where: { role: 'ADMIN' },
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an institution with auto-generated slug', async () => {
      prisma.institution.findUnique.mockResolvedValue(null); // slug not taken
      prisma.institution.create.mockResolvedValue({
        ...mockInstitution,
        name: 'My New School',
        slug: 'my-new-school',
      });

      const result = await service.create({ name: 'My New School' });

      expect(result.slug).toBe('my-new-school');
      expect(prisma.institution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My New School',
          slug: 'my-new-school',
        }),
      });
    });

    it('should reject reserved slugs', async () => {
      await expect(
        service.create({
          name: 'Platform',
          address: null,
          phone: null,
          email: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject slug that generates a reserved word', async () => {
      await expect(
        service.create({
          name: 'Admin',
          address: null,
          phone: null,
          email: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should append suffix for duplicate slug', async () => {
      // First call: slug exists, second call: slug-2 is free
      prisma.institution.findUnique
        .mockResolvedValueOnce({ id: 'other-inst', slug: 'test-institution' })
        .mockResolvedValueOnce(null);
      prisma.institution.create.mockResolvedValue({
        ...mockInstitution,
        slug: 'test-institution-2',
      });

      const result = await service.create({ name: 'Test Institution' });

      expect(result.slug).toBe('test-institution-2');
    });

    it('should reject name that produces empty slug', async () => {
      await expect(
        service.create({ name: '!!!@@@###' }),
      ).rejects.toThrow('cannot be converted to a valid slug');
    });

    it('should strip leading and trailing hyphens from generated slug', async () => {
      prisma.institution.findUnique.mockResolvedValue(null); // slug not taken
      prisma.institution.create.mockResolvedValue({
        ...mockInstitution,
        name: '-Test School-',
        slug: 'test-school',
      });

      await service.create({ name: '-Test School-' });

      expect(prisma.institution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ slug: 'test-school' }),
      });
    });
  });

  describe('update', () => {
    it('should update an institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(mockInstitution);
      prisma.institution.update.mockResolvedValue({
        ...mockInstitution,
        address: '123 Main St',
      });

      const result = await service.update('inst-1', {
        address: '123 Main St',
      });

      expect(result.address).toBe('123 Main St');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { address: 'New Address' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should NOT regenerate slug when name changes', async () => {
      prisma.institution.findUnique.mockResolvedValue(mockInstitution); // findOne check
      prisma.institution.update.mockResolvedValue({
        ...mockInstitution,
        name: 'Updated Name',
        slug: 'test-institution', // slug stays the same
      });

      await service.update('inst-1', { name: 'Updated Name' });

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { name: 'Updated Name' },
      });
      // Verify slug was NOT included in the update data
      const updateCall = prisma.institution.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('slug');
    });
  });

  describe('update — explicit slug edit', () => {
    it('should allow explicit slug update', async () => {
      prisma.institution.findUnique
        .mockResolvedValueOnce(mockInstitution) // findOne check
        .mockResolvedValueOnce(null); // slug uniqueness check
      prisma.institution.update.mockResolvedValue({
        ...mockInstitution,
        slug: 'new-slug',
      });

      await service.update('inst-1', { slug: 'new-slug' });

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({ slug: 'new-slug' }),
      });
    });

    it('should reject slug that is already taken', async () => {
      prisma.institution.findUnique
        .mockResolvedValueOnce(mockInstitution) // findOne check
        .mockResolvedValueOnce({ id: 'other-inst', slug: 'taken-slug' }); // slug taken

      await expect(
        service.update('inst-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject reserved slug on explicit update', async () => {
      prisma.institution.findUnique.mockResolvedValue(mockInstitution); // findOne check

      await expect(
        service.update('inst-1', { slug: 'platform' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should no-op when slug is same as current', async () => {
      prisma.institution.findUnique.mockResolvedValue(mockInstitution); // findOne returns institution with slug 'test-institution'
      prisma.institution.update.mockResolvedValue(mockInstitution);

      await service.update('inst-1', { slug: 'test-institution' });

      // slug should not be in the update data since it's unchanged
      const updateCall = prisma.institution.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('slug');
    });

    it('should handle Prisma P2002 unique constraint violation gracefully', async () => {
      prisma.institution.findUnique
        .mockResolvedValueOnce(mockInstitution) // findOne check
        .mockResolvedValueOnce(null); // slug appears free
      // But update fails due to race condition
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      prisma.institution.update.mockRejectedValue(prismaError);

      await expect(
        service.update('inst-1', { slug: 'race-condition-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException (deletion not supported)', async () => {
      await expect(service.remove('inst-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findBySlugPublic', () => {
    it('should return public institution data by slug', async () => {
      const mockInstitution = {
        name: 'Test Bimbel',
        slug: 'test-bimbel',
        logo_url: null,
        description: 'A test institution',
        brand_color: '#2563eb',
        background_image_url: null,
        settings: { registration: { student_enabled: true } },
        is_active: true,
      };
      prisma.institution.findFirst.mockResolvedValue(mockInstitution as any);

      const result = await service.findBySlugPublic('test-bimbel');
      expect(result).toEqual({
        name: 'Test Bimbel',
        slug: 'test-bimbel',
        logo_url: null,
        description: 'A test institution',
        brand_color: '#2563eb',
        background_image_url: null,
        registration_enabled: true,
      });
    });

    it('should throw NotFoundException for unknown slug', async () => {
      prisma.institution.findFirst.mockResolvedValue(null);
      await expect(service.findBySlugPublic('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include landing_enabled in response', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        name: 'Test',
        slug: 'test',
        logo_url: null,
        description: null,
        brand_color: null,
        background_image_url: null,
        settings: null,
        landing_enabled: true,
      });

      const result = await service.findBySlugPublic('test');
      expect(result.landing_enabled).toBe(true);
    });
  });

  describe('findLandingBySlug', () => {
    it('should return landing data with stats and subjects', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        id: 'inst-1',
        name: 'Bimbel Test',
        slug: 'bimbel-test',
        logo_url: null,
        description: 'A test institution',
        brand_color: '#6366f1',
        background_image_url: null,
        email: 'info@test.com',
        phone: '08123456789',
        address: 'Jl. Test',
        settings: { registration: { student_enabled: true } },
        landing_enabled: true,
        landing_tagline: 'Learn with us',
        landing_about: 'We are a tutoring center',
        landing_cta_text: null,
        whatsapp_number: '08123456789',
        landing_features: [
          { id: 'f1', icon: 'Users', title: 'Small class', description: 'Max 5' },
        ],
        gallery_images: null,
        social_links: { instagram: '@test' },
      });

      prisma.$transaction.mockResolvedValue([
        10,
        3,
        [{ id: 's1', name: 'Math' }, { id: 's2', name: 'Physics' }],
      ]);

      const result = await service.findLandingBySlug('bimbel-test');

      expect(result.name).toBe('Bimbel Test');
      expect(result.landing_enabled).toBe(true);
      expect(result.landing_tagline).toBe('Learn with us');
      expect(result.registration_enabled).toBe(true);
      expect(result.stats).toEqual({
        active_students: 10,
        active_tutors: 3,
        total_subjects: 2,
      });
      expect(result.subjects).toHaveLength(2);
    });

    it('should throw NotFoundException for unknown slug', async () => {
      prisma.institution.findFirst.mockResolvedValue(null);
      await expect(service.findLandingBySlug('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return cached data on second call', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        id: 'inst-1', name: 'Test', slug: 'test',
        logo_url: null, description: null, brand_color: null,
        background_image_url: null, email: null, phone: null,
        address: null, settings: null, landing_enabled: false,
        landing_tagline: null, landing_about: null,
        landing_cta_text: null, whatsapp_number: null,
        landing_features: null, gallery_images: null,
        social_links: null,
      });
      prisma.$transaction.mockResolvedValue([0, 0, []]);

      await service.findLandingBySlug('test');
      await service.findLandingBySlug('test');

      expect(prisma.institution.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should clear cache on invalidateLandingCache', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        id: 'inst-1', name: 'Test', slug: 'test',
        logo_url: null, description: null, brand_color: null,
        background_image_url: null, email: null, phone: null,
        address: null, settings: null, landing_enabled: false,
        landing_tagline: null, landing_about: null,
        landing_cta_text: null, whatsapp_number: null,
        landing_features: null, gallery_images: null,
        social_links: null,
      });
      prisma.$transaction.mockResolvedValue([0, 0, []]);

      await service.findLandingBySlug('test');
      service.invalidateLandingCache('test');
      await service.findLandingBySlug('test');

      expect(prisma.institution.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
