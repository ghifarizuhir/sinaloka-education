import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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
        service.create({ name: 'Platform', address: null, phone: null, email: null }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject slug that generates a reserved word', async () => {
      await expect(
        service.create({ name: 'Admin', address: null, phone: null, email: null }),
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

    it('should regenerate slug when name changes', async () => {
      // findOne call returns existing institution
      prisma.institution.findUnique
        .mockResolvedValueOnce(mockInstitution) // findOne check
        .mockResolvedValueOnce(null); // slug uniqueness check
      prisma.institution.update.mockResolvedValue({
        ...mockInstitution,
        name: 'Updated Name',
        slug: 'updated-name',
      });

      const result = await service.update('inst-1', { name: 'Updated Name' });

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({ slug: 'updated-name' }),
      });
    });
  });

  describe('remove', () => {
    it('should delete an institution', async () => {
      prisma.institution.findUnique.mockResolvedValue(mockInstitution);
      prisma.institution.delete.mockResolvedValue(mockInstitution);

      const result = await service.remove('inst-1');

      expect(result).toEqual(mockInstitution);
      expect(prisma.institution.delete).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
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
      await expect(service.findBySlugPublic('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
