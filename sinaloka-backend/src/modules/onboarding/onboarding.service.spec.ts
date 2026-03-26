import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('OnboardingService', () => {
  let service: OnboardingService;

  const mockPrisma = {
    institution: { findUnique: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  describe('getStatus', () => {
    it('should throw NotFoundException when institution not found', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.getStatus('inst-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return correct status when institution has name, phone, and billing_mode', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PREPAID',
        onboarding_completed: false,
        name: 'Test Institution',
        phone: '08123456789',
      });

      const result = await service.getStatus('inst-1');

      expect(result).toEqual({
        billing_mode: 'PREPAID',
        onboarding_completed: false,
        steps: {
          profile: true,
          billing: true,
        },
      });
    });

    it('should return steps.profile=false when name is null', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PREPAID',
        onboarding_completed: false,
        name: null,
        phone: '08123456789',
      });

      const result = await service.getStatus('inst-1');

      expect(result.steps.profile).toBe(false);
      expect(result.steps.billing).toBe(true);
    });
  });

  describe('setBillingMode', () => {
    it('should throw NotFoundException when institution not found', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue(null);

      await expect(
        service.setBillingMode('inst-1', { billing_mode: 'PREPAID' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when billing_mode is already set', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PREPAID',
      });

      await expect(
        service.setBillingMode('inst-1', { billing_mode: 'POSTPAID' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update and return result when billing_mode is null', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: null,
      });
      mockPrisma.institution.update.mockResolvedValue({
        billing_mode: 'PREPAID',
        onboarding_completed: false,
      });

      const result = await service.setBillingMode('inst-1', {
        billing_mode: 'PREPAID',
      });

      expect(mockPrisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { billing_mode: 'PREPAID' },
        select: { billing_mode: true, onboarding_completed: true },
      });
      expect(result).toEqual({
        billing_mode: 'PREPAID',
        onboarding_completed: false,
      });
    });
  });

  describe('complete', () => {
    it('should throw NotFoundException when institution not found', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue(null);

      await expect(service.complete('inst-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when billing_mode is null', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: null,
      });

      await expect(service.complete('inst-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call $transaction and return onboarding_completed', async () => {
      mockPrisma.institution.findUnique.mockResolvedValue({
        billing_mode: 'PREPAID',
      });
      mockPrisma.$transaction.mockResolvedValue([
        { onboarding_completed: true },
        { id: 'user-1' },
      ]);

      const result = await service.complete('inst-1', 'user-1');

      expect(mockPrisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { onboarding_completed: true },
        select: { onboarding_completed: true },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { must_change_password: false },
        select: { id: true },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ onboarding_completed: true });
    });
  });
});
