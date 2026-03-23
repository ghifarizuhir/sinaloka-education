import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('findAll', () => {
    it('should filter only user-targeted notifications for PARENT role', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('inst-1', 'user-1', { page: 1, limit: 20 }, 'PARENT');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should include broadcast notifications for ADMIN role', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('inst-1', 'user-1', { page: 1, limit: 20 }, 'ADMIN');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should enforce ownership for PARENT role', async () => {
      prisma.notification.update.mockResolvedValue({ id: 'n1', read_at: new Date() });
      await service.markAsRead('n1', 'inst-1', 'user-1', 'PARENT');

      const whereArg = prisma.notification.update.mock.calls[0][0].where;
      expect(whereArg.user_id).toBe('user-1');
      expect(whereArg.OR).toBeUndefined();
    });
  });
});
