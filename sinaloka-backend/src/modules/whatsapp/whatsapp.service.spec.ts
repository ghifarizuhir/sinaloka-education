import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

jest.mock('../../common/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn(),
  };
});

import { WhatsappService } from './whatsapp.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let prisma: {
    whatsappMessage: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    payment: {
      findFirst: jest.Mock;
    };
  };

  const configValues: Record<string, string> = {
    WHATSAPP_ACCESS_TOKEN: 'test-token',
    WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
    WHATSAPP_APP_SECRET: 'test-secret',
  };

  beforeEach(async () => {
    prisma = {
      whatsappMessage: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => configValues[key] },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  describe('isConfigured()', () => {
    it('should return true when WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured() — missing config', () => {
    let unconfiguredService: WhatsappService;

    beforeEach(async () => {
      const emptyConfig: Record<string, string> = {};

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsappService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: ConfigService,
            useValue: { get: (key: string) => emptyConfig[key] },
          },
        ],
      }).compile();

      unconfiguredService = module.get<WhatsappService>(WhatsappService);
    });

    it('should return false when WHATSAPP_ACCESS_TOKEN is missing', () => {
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe('normalizePhone()', () => {
    it('should convert 081234567890 to +6281234567890', () => {
      expect(service.normalizePhone('081234567890')).toBe('+6281234567890');
    });

    it('should convert 6281234567890 to +6281234567890', () => {
      expect(service.normalizePhone('6281234567890')).toBe('+6281234567890');
    });

    it('should keep +6281234567890 unchanged', () => {
      expect(service.normalizePhone('+6281234567890')).toBe('+6281234567890');
    });

    it('should strip dashes from 08-123-456-7890', () => {
      expect(service.normalizePhone('08-123-456-7890')).toBe('+6281234567890');
    });

    it('should strip parens and spaces from (081) 234 567 890', () => {
      expect(service.normalizePhone('(081) 234 567 890')).toBe(
        '+6281234567890',
      );
    });

    it('should prepend +62 to bare number 81234567890', () => {
      expect(service.normalizePhone('81234567890')).toBe('+6281234567890');
    });

    it('should throw BadRequestException for too short number 123', () => {
      expect(() => service.normalizePhone('123')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => service.normalizePhone('')).toThrow(BadRequestException);
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('should return true for valid HMAC SHA-256 signature', () => {
      const payload = '{"test":"data"}';
      const expected =
        'sha256=' +
        crypto
          .createHmac('sha256', 'test-secret')
          .update(payload)
          .digest('hex');

      expect(service.verifyWebhookSignature(payload, expected)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = '{"test":"data"}';
      // Must be same byte length as a real sha256 hex digest (64 hex chars)
      const fakeSignature = 'sha256=' + 'a'.repeat(64);
      expect(service.verifyWebhookSignature(payload, fakeSignature)).toBe(
        false,
      );
    });

    it('should return false when no signature provided', () => {
      expect(service.verifyWebhookSignature('payload', '')).toBe(false);
    });
  });

  describe('sendPaymentReminder()', () => {
    it('should throw NotFoundException when payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.sendPaymentReminder('inst-1', 'pay-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when student has no parent_phone', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: '500000',
        due_date: new Date(),
        status: 'PENDING',
        student: { name: 'Alice', parent_phone: null },
        institution: { name: 'Test Institution', default_language: 'id' },
      });

      await expect(
        service.sendPaymentReminder('inst-1', 'pay-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing message when recent reminder exists (dedup)', async () => {
      const existingMessage = {
        id: 'msg-1',
        status: 'SENT',
        created_at: new Date(),
      };

      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: '500000',
        due_date: new Date(),
        status: 'PENDING',
        student: { name: 'Alice', parent_phone: '081234567890' },
        institution: { name: 'Test Institution', default_language: 'id' },
      });

      prisma.whatsappMessage.findFirst.mockResolvedValue(existingMessage);

      const result = await service.sendPaymentReminder('inst-1', 'pay-1');

      expect(result).toEqual(existingMessage);
      expect(prisma.whatsappMessage.create).not.toHaveBeenCalled();
    });
  });
});
