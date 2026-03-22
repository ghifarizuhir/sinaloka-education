import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { addDays, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(institutionId: string) {
    const where = { institution_id: institutionId };
    const [
      totalStudents,
      activeTutors,
      revenueAgg,
      attendanceCounts,
      upcomingSessions,
    ] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.tutor.count({ where: { ...where, is_verified: true } }),
      this.prisma.payment.aggregate({
        where: {
          ...where,
          status: 'PAID',
          paid_date: {
            gte: startOfMonth(new Date()),
            lte: endOfMonth(new Date()),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.session.count({
        where: {
          ...where,
          date: { gte: new Date(), lte: addDays(new Date(), 7) },
          status: 'SCHEDULED',
        },
      }),
    ]);

    const present =
      attendanceCounts.find((a) => a.status === 'PRESENT')?._count.status ?? 0;
    const late =
      attendanceCounts.find((a) => a.status === 'LATE')?._count.status ?? 0;
    const total = attendanceCounts.reduce((s, a) => s + a._count.status, 0);

    return {
      total_students: totalStudents,
      active_tutors: activeTutors,
      monthly_revenue: revenueAgg._sum.amount ?? 0,
      attendance_rate:
        total > 0 ? Math.round(((present + late) / total) * 10000) / 100 : 0,
      upcoming_sessions: upcomingSessions,
    };
  }

  async getActivity(institutionId: string) {
    const where = { institution_id: institutionId };
    const [enrollments, payments, attendances] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          student: { select: { name: true } },
          class: { select: { name: true } },
        },
      }),
      this.prisma.payment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 20,
        include: { student: { select: { name: true } } },
      }),
      this.prisma.attendance.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          student: { select: { name: true } },
          session: { select: { date: true } },
        },
      }),
    ]);

    const items = [
      ...enrollments.map((e) => ({
        type: 'enrollment' as const,
        description: `${e.student.name} enrolled in ${e.class.name}`,
        created_at: e.created_at,
      })),
      ...payments.map((p) => ({
        type: 'payment' as const,
        description: `${p.student.name} payment ${p.status} - ${p.amount}`,
        created_at: p.created_at,
      })),
      ...attendances.map((a) => ({
        type: 'attendance' as const,
        description: `${a.student.name} marked ${a.status} on ${a.session.date.toISOString().slice(0, 10)}`,
        created_at: a.created_at,
      })),
    ];
    items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return items.slice(0, 20);
  }

  async getUpcomingSessions(institutionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        institution_id: institutionId,
        date: { gte: new Date() },
        status: 'SCHEDULED',
      },
      orderBy: { date: 'asc' },
      take: 5,
      include: {
        class: {
          select: {
            name: true,
            subject: { select: { name: true } },
            tutor: {
              select: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      date: s.date,
      start_time: s.start_time,
      subject_name: s.class.subject.name,
      tutor_name: s.class.tutor.user.name,
      class_name: s.class.name,
    }));
  }

  async getAttendanceTrend(institutionId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        session: { date: { gte: sixMonthsAgo } },
      },
      select: { status: true, session: { select: { date: true } } },
    });

    // Group by session month (not created_at — session date is the actual class date)
    const byMonth = new Map<string, { present: number; total: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, { present: 0, total: 0 });
    }

    for (const a of attendances) {
      const key = `${a.session.date.getFullYear()}-${String(a.session.date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = byMonth.get(key);
      if (bucket) {
        bucket.total++;
        if (a.status === 'PRESENT' || a.status === 'LATE') bucket.present++;
      }
    }

    return {
      data: Array.from(byMonth.entries()).map(
        ([month, { present, total }]) => ({
          month,
          rate: total > 0 ? Math.round((present / total) * 10000) / 100 : 0,
        }),
      ),
    };
  }

  async getStudentGrowth(institutionId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const baseCount = await this.prisma.student.count({
      where: {
        institution_id: institutionId,
        created_at: { lt: sixMonthsAgo },
      },
    });

    const newStudents = await this.prisma.student.findMany({
      where: {
        institution_id: institutionId,
        created_at: { gte: sixMonthsAgo },
      },
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    });

    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      );
    }

    const countByMonth = new Map(months.map((m) => [m, 0]));
    for (const s of newStudents) {
      const key = `${s.created_at.getFullYear()}-${String(s.created_at.getMonth() + 1).padStart(2, '0')}`;
      if (countByMonth.has(key))
        countByMonth.set(key, countByMonth.get(key)! + 1);
    }

    let cumulative = baseCount;
    return {
      data: months.map((month) => {
        cumulative += countByMonth.get(month)!;
        return { month, count: cumulative };
      }),
    };
  }

  async getRevenueExpenses(institutionId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          institution_id: institutionId,
          status: 'PAID',
          paid_date: { gte: sixMonthsAgo },
        },
        select: { amount: true, paid_date: true },
      }),
      this.prisma.expense.findMany({
        where: {
          institution_id: institutionId,
          date: { gte: sixMonthsAgo },
        },
        select: { amount: true, date: true },
      }),
    ]);

    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      );
    }

    const revenueByMonth = new Map(months.map((m) => [m, 0]));
    const expensesByMonth = new Map(months.map((m) => [m, 0]));

    for (const p of payments) {
      if (!p.paid_date) continue;
      const key = `${p.paid_date.getFullYear()}-${String(p.paid_date.getMonth() + 1).padStart(2, '0')}`;
      if (revenueByMonth.has(key))
        revenueByMonth.set(key, revenueByMonth.get(key)! + Number(p.amount));
    }

    for (const e of expenses) {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      if (expensesByMonth.has(key))
        expensesByMonth.set(key, expensesByMonth.get(key)! + Number(e.amount));
    }

    return {
      data: months.map((month) => ({
        month,
        revenue: revenueByMonth.get(month)!,
        expenses: expensesByMonth.get(month)!,
      })),
    };
  }
}
