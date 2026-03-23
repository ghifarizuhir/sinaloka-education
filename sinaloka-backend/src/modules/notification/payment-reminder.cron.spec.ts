import { Test } from '@nestjs/testing';
import { PaymentReminderCron } from './payment-reminder.cron.js';
import { NotificationService } from './notification.service.js';
import { NotificationGateway } from './notification.gateway.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('PaymentReminderCron', () => {
  let cron: PaymentReminderCron;
  let prisma: { institution: any; payment: any; notification: any };
  let notificationService: { create: jest.Mock };
  let notificationGateway: { pushToUser: jest.Mock };

  beforeEach(async () => {
    prisma = {
      institution: { findMany: jest.fn() },
      payment: { findMany: jest.fn() },
      notification: { findFirst: jest.fn() },
    };
    notificationService = { create: jest.fn() };
    notificationGateway = { pushToUser: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PaymentReminderCron,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: NotificationGateway, useValue: notificationGateway },
      ],
    }).compile();

    cron = module.get(PaymentReminderCron);
  });

  it('should skip when no institutions have auto-reminders', async () => {
    prisma.institution.findMany.mockResolvedValue([]);
    await cron.sendPaymentReminders();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it('should skip payments with no parent links', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
        student: { id: 'stu-1', name: 'Anak A', parent_links: [] },
      },
    ]);

    await cron.sendPaymentReminders();
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('should create notification for payment with parent', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
        student: {
          id: 'stu-1',
          name: 'Anak A',
          parent_links: [{ parent: { user_id: 'user-parent-1' } }],
        },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null);
    notificationService.create.mockResolvedValue({
      id: 'notif-1',
      type: 'payment.reminder',
    });

    await cron.sendPaymentReminders();

    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: 'inst-1',
        userId: 'user-parent-1',
        type: 'payment.reminder',
        title: 'Pengingat Pembayaran',
      }),
    );
    expect(notificationGateway.pushToUser).toHaveBeenCalledWith(
      'inst-1',
      'user-parent-1',
      expect.any(Object),
    );
  });

  it('should skip duplicate reminders within 24h', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
        student: {
          id: 'stu-1',
          name: 'Anak A',
          parent_links: [{ parent: { user_id: 'user-parent-1' } }],
        },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing-notif' });

    await cron.sendPaymentReminders();
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('should send to multiple parents for one student', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'OVERDUE',
        student: {
          id: 'stu-1',
          name: 'Anak A',
          parent_links: [
            { parent: { user_id: 'parent-1' } },
            { parent: { user_id: 'parent-2' } },
          ],
        },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null);
    notificationService.create.mockResolvedValue({
      id: 'notif-1',
      type: 'payment.reminder',
    });

    await cron.sendPaymentReminders();
    expect(notificationService.create).toHaveBeenCalledTimes(2);
  });
});
