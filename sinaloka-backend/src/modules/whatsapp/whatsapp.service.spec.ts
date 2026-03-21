import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
    FONNTE_TOKEN: 'test-fonnte-token',
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
    it('should return true when FONNTE_TOKEN is set', () => {
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

    it('should return false when FONNTE_TOKEN is missing', () => {
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

  describe('sendMessage()', () => {
    beforeEach(() => {
      prisma.whatsappMessage.create.mockResolvedValue({
        id: 'msg-1',
        status: 'PENDING',
        retry_count: 0,
      });
    });

    it('should send message via Fonnte and update status to SENT', async () => {
      const mockResponse = {
        status: true,
        id: ['80367170'],
        process: 'pending',
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      prisma.whatsappMessage.update.mockResolvedValue({
        id: 'msg-1',
        status: 'SENT',
        wa_message_id: '80367170',
      });

      const result = await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test message',
        relatedType: 'payment',
        relatedId: 'pay-1',
      });

      expect(result?.status).toBe('SENT');

      // Verify the target was sent without + prefix
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.target).toBe('6281234567890');
      expect(body.target).not.toContain('+');

      // Verify Authorization header has no Bearer prefix
      expect(fetchCall[1].headers.Authorization).toBe('test-fonnte-token');
    });

    it('should store structured templateParams in DB record', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: true, id: ['123'] }),
      });
      prisma.whatsappMessage.update.mockResolvedValue({
        id: 'msg-1',
        status: 'SENT',
      });

      await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test',
        templateName: 'payment_reminder',
        templateParams: { studentName: 'Alice', amount: '500.000' },
      });

      expect(prisma.whatsappMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            template_name: 'payment_reminder',
            template_params: { studentName: 'Alice', amount: '500.000' },
          }),
        }),
      );
    });

    it('should mark message FAILED when Fonnte returns status false', async () => {
      const mockResponse = {
        status: false,
        reason: 'token invalid',
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      prisma.whatsappMessage.update.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
        error: 'token invalid',
      });
      prisma.whatsappMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
      });

      const result = await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test message',
      });

      expect(result?.status).toBe('FAILED');
    });

    it('should mark message FAILED on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

      prisma.whatsappMessage.update.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
        error: 'Network timeout',
      });
      prisma.whatsappMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        status: 'FAILED',
      });

      const result = await service.sendMessage({
        institutionId: 'inst-1',
        phone: '081234567890',
        message: 'Test message',
      });

      expect(result?.status).toBe('FAILED');
    });
  });

  describe('handleStatusUpdate()', () => {
    it('should map Fonnte "Sent" to DELIVERED', async () => {
      await service.handleStatusUpdate('wa-123', 'Sent');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'DELIVERED' },
      });
    });

    it('should map Fonnte "Read" to READ', async () => {
      await service.handleStatusUpdate('wa-123', 'Read');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'READ' },
      });
    });

    it('should map Fonnte "Failed" to FAILED', async () => {
      await service.handleStatusUpdate('wa-123', 'Failed');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'FAILED' },
      });
    });

    it('should be case-insensitive', async () => {
      await service.handleStatusUpdate('wa-123', 'SENT');
      expect(prisma.whatsappMessage.updateMany).toHaveBeenCalledWith({
        where: { wa_message_id: 'wa-123' },
        data: { status: 'DELIVERED' },
      });
    });

    it('should ignore unknown status', async () => {
      await service.handleStatusUpdate('wa-123', 'unknown');
      expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
    });

    it('should no-op when waMessageId is empty', async () => {
      await service.handleStatusUpdate('', 'Sent');
      expect(prisma.whatsappMessage.updateMany).not.toHaveBeenCalled();
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
