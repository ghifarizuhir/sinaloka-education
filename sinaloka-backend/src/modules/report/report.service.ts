import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

const REPORT_LABELS = {
  id: {
    attendanceReport: 'Laporan Kehadiran',
    financeReport: 'Laporan Keuangan',
    studentProgressReport: 'Laporan Perkembangan Siswa',
    period: 'Periode',
    date: 'Tanggal',
    student: 'Siswa',
    class: 'Kelas',
    status: 'Status',
    totalIncome: 'Total Pendapatan (Lunas)',
    totalPayouts: 'Total Pembayaran Tutor',
    totalExpenses: 'Total Pengeluaran',
    netProfit: 'Laba Bersih',
    transactions: 'transaksi',
    attendanceRate: 'Tingkat Kehadiran',
    homeworkRate: 'Tingkat Penyelesaian PR',
    totalSessions: 'Total Sesi',
    sessionNotes: 'Catatan Sesi',
    homework: 'PR',
    done: 'Selesai',
    notDone: 'Belum',
    topic: 'Topik',
    notes: 'Catatan',
  },
  en: {
    attendanceReport: 'Attendance Report',
    financeReport: 'Finance Report',
    studentProgressReport: 'Student Progress Report',
    period: 'Period',
    date: 'Date',
    student: 'Student',
    class: 'Class',
    status: 'Status',
    totalIncome: 'Total Income (Paid Payments)',
    totalPayouts: 'Total Payouts',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    transactions: 'transactions',
    attendanceRate: 'Attendance Rate',
    homeworkRate: 'Homework Completion Rate',
    totalSessions: 'Total Sessions',
    sessionNotes: 'Session Notes',
    homework: 'Homework',
    done: 'Done',
    notDone: 'Not done',
    topic: 'Topic',
    notes: 'Notes',
  },
};

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  private async getLabels(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { default_language: true },
    });
    const lang = institution?.default_language === 'en' ? 'en' : 'id';
    return REPORT_LABELS[lang];
  }

  async generateAttendanceReport(
    institutionId: string,
    filters: {
      date_from: Date;
      date_to: Date;
      class_id?: string;
      student_id?: string;
    },
  ): Promise<Buffer> {
    const records = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        session: {
          date: { gte: filters.date_from, lte: filters.date_to },
          ...(filters.class_id ? { class_id: filters.class_id } : {}),
        },
        ...(filters.student_id ? { student_id: filters.student_id } : {}),
      },
      include: {
        student: { select: { name: true } },
        session: { select: { date: true, class: { select: { name: true } } } },
      },
      orderBy: { session: { date: 'asc' } },
    });

    const l = await this.getLabels(institutionId);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text(l.attendanceReport, { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(10)
      .text(
        `${l.period}: ${filters.date_from.toISOString().slice(0, 10)} to ${filters.date_to.toISOString().slice(0, 10)}`,
      );
    doc.moveDown();

    // Table header
    const cols = [40, 150, 180, 80];
    let y = doc.y;
    doc.font('Helvetica-Bold');
    doc.text(l.date, cols[0], y);
    doc.text(l.student, cols[1], y);
    doc.text(l.class, cols[2], y);
    doc.text(l.status, cols[3], y);
    doc.font('Helvetica');
    y += 20;

    for (const r of records) {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      const status =
        r.status === 'PRESENT' ? 'P' : r.status === 'LATE' ? 'L' : 'A';
      doc.text(r.session.date.toISOString().slice(0, 10), cols[0], y);
      doc.text(r.student.name, cols[1], y);
      doc.text(r.session.class.name, cols[2], y);
      doc.text(status, cols[3], y);
      y += 18;
    }

    doc.end();
    return new Promise((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );
  }

  async generateFinanceReport(
    institutionId: string,
    filters: { date_from: Date; date_to: Date },
  ): Promise<Buffer> {
    const where = { institution_id: institutionId };
    const dateRange = { gte: filters.date_from, lte: filters.date_to };

    const [payments, payouts, expenses] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { ...where, status: 'PAID', paid_date: dateRange },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.aggregate({
        where: { ...where, date: dateRange },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { ...where, date: dateRange },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = Number(payments._sum.amount ?? 0);
    const totalPayouts = Number(payouts._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    const l = await this.getLabels(institutionId);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text(l.financeReport, { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(10)
      .text(
        `${l.period}: ${filters.date_from.toISOString().slice(0, 10)} to ${filters.date_to.toISOString().slice(0, 10)}`,
      );
    doc.moveDown();

    doc.fontSize(12);
    doc.text(
      `${l.totalIncome}: ${totalIncome} (${payments._count} ${l.transactions})`,
    );
    doc.text(
      `${l.totalPayouts}: ${totalPayouts} (${payouts._count} ${l.transactions})`,
    );
    doc.text(
      `${l.totalExpenses}: ${totalExpenses} (${expenses._count} ${l.transactions})`,
    );
    doc.moveDown();
    doc
      .font('Helvetica-Bold')
      .text(`${l.netProfit}: ${totalIncome - totalPayouts - totalExpenses}`);
    doc.font('Helvetica');

    doc.end();
    return new Promise((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );
  }

  async generateStudentProgressReport(
    institutionId: string,
    studentId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Buffer> {
    const dateFilter =
      dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : undefined;
    const attendances = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        student_id: studentId,
        ...(dateFilter ? { session: { date: dateFilter } } : {}),
      },
      include: {
        session: {
          select: {
            date: true,
            topic_covered: true,
            session_summary: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { session: { date: 'asc' } },
    });

    const total = attendances.length;
    const presentLate = attendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;
    const homeworkDone = attendances.filter((a) => a.homework_done).length;
    const attendanceRate =
      total > 0 ? Math.round((presentLate / total) * 100) : 0;
    const homeworkRate =
      total > 0 ? Math.round((homeworkDone / total) * 100) : 0;

    const student = await this.prisma.student.findFirstOrThrow({
      where: { id: studentId, institution_id: institutionId },
    });

    const l = await this.getLabels(institutionId);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text(l.studentProgressReport, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`${l.student}: ${student.name}`);
    doc.text(`${l.attendanceRate}: ${attendanceRate}%`);
    doc.text(`${l.homeworkRate}: ${homeworkRate}%`);
    doc.text(`${l.totalSessions}: ${total}`);
    doc.moveDown();

    doc.fontSize(14).text(l.sessionNotes);
    doc.moveDown(0.5);
    doc.fontSize(10);
    for (const a of attendances) {
      if (doc.y > 720) doc.addPage();
      doc
        .font('Helvetica-Bold')
        .text(
          `${a.session.date.toISOString().slice(0, 10)} - ${a.session.class.name}`,
        );
      doc.font('Helvetica');
      doc.text(
        `${l.status}: ${a.status} | ${l.homework}: ${a.homework_done ? l.done : l.notDone}`,
      );
      if (a.session.topic_covered)
        doc.text(`${l.topic}: ${a.session.topic_covered}`);
      if (a.notes) doc.text(`${l.notes}: ${a.notes}`);
      doc.moveDown(0.5);
    }

    doc.end();
    return new Promise((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );
  }

  // ── Financial Reporting (Phase 6) ──

  private groupByMonth(
    records: { date: Date | null; amount: any }[],
  ): { month: string; amount: number }[] {
    const map = new Map<string, number>();
    for (const r of records) {
      if (!r.date) continue;
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + Number(r.amount ?? 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }

  async getFinancialSummary(
    institutionId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const where = { institution_id: institutionId };

    const [revenue, payouts, expenses] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          ...where,
          status: 'PAID',
          paid_date: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.aggregate({
        where: { ...where, date: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { ...where, date: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const sixMonthsAgo = new Date(periodEnd);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyPayments = await this.prisma.payment.findMany({
      where: {
        ...where,
        status: 'PAID',
        paid_date: { gte: sixMonthsAgo, lte: periodEnd },
      },
      select: { paid_date: true, amount: true },
    });

    const totalRevenue = Number(revenue._sum.amount ?? 0);
    const totalPayouts = Number(payouts._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    return {
      period_start: periodStart,
      period_end: periodEnd,
      total_revenue: totalRevenue,
      total_payouts: totalPayouts,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalPayouts - totalExpenses,
      payment_count: revenue._count,
      payout_count: payouts._count,
      expense_count: expenses._count,
      revenue_by_month: this.groupByMonth(
        monthlyPayments.map((p) => ({ date: p.paid_date, amount: p.amount })),
      ),
    };
  }

  async getRevenueBreakdown(
    institutionId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const where = { institution_id: institutionId };
    const paidDateRange = { gte: periodStart, lte: periodEnd };

    const byStatus = await this.prisma.payment.groupBy({
      by: ['status'],
      where: { ...where, due_date: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const byMethod = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        ...where,
        status: 'PAID',
        paid_date: paidDateRange,
        method: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const paidPayments = await this.prisma.payment.findMany({
      where: { ...where, status: 'PAID', paid_date: paidDateRange },
      select: {
        amount: true,
        enrollment: { select: { class: { select: { id: true, name: true } } } },
      },
    });

    const classMap = new Map<
      string,
      {
        class_id: string;
        class_name: string;
        amount: number;
        payment_count: number;
      }
    >();
    for (const p of paidPayments) {
      const cls = p.enrollment?.class;
      if (!cls) continue;
      const existing = classMap.get(cls.id) ?? {
        class_id: cls.id,
        class_name: cls.name,
        amount: 0,
        payment_count: 0,
      };
      existing.amount += Number(p.amount);
      existing.payment_count += 1;
      classMap.set(cls.id, existing);
    }

    return {
      by_class: Array.from(classMap.values()).sort(
        (a, b) => b.amount - a.amount,
      ),
      by_payment_method: byMethod.map((m) => ({
        method: m.method ?? 'OTHER',
        amount: Number(m._sum.amount ?? 0),
        count: m._count.id,
      })),
      by_status: byStatus.map((s) => ({
        status: s.status,
        amount: Number(s._sum.amount ?? 0),
        count: s._count.id,
      })),
    };
  }

  async getExpenseBreakdown(
    institutionId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const where = { institution_id: institutionId };

    const byCategory = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { ...where, date: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const sixMonthsAgo = new Date(periodEnd);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyExpenses = await this.prisma.expense.findMany({
      where: { ...where, date: { gte: sixMonthsAgo, lte: periodEnd } },
      select: { date: true, amount: true },
    });

    return {
      by_category: byCategory
        .map((c) => ({
          category: c.category,
          amount: Number(c._sum.amount ?? 0),
          count: c._count.id,
        }))
        .sort((a, b) => b.amount - a.amount),
      monthly_trend: this.groupByMonth(
        monthlyExpenses.map((e) => ({ date: e.date, amount: e.amount })),
      ),
    };
  }

  async exportCsv(
    institutionId: string,
    type: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<string> {
    const where = { institution_id: institutionId };
    const dateRange = { gte: periodStart, lte: periodEnd };

    if (type === 'payments') {
      const data = await this.prisma.payment.findMany({
        where: { ...where, due_date: dateRange },
        include: {
          student: { select: { name: true } },
          enrollment: { include: { class: { select: { name: true } } } },
        },
        orderBy: { due_date: 'desc' },
      });
      return stringify(
        data.map((p) => ({
          date: p.due_date?.toISOString().split('T')[0] ?? '',
          student: p.student?.name ?? '',
          class: p.enrollment?.class?.name ?? '',
          amount: Number(p.amount),
          status: p.status,
          method: p.method ?? '',
          invoice_number: p.invoice_number ?? '',
          notes: p.notes ?? '',
        })),
        { header: true },
      );
    }

    if (type === 'payouts') {
      const data = await this.prisma.payout.findMany({
        where: { ...where, date: dateRange },
        include: { tutor: { include: { user: { select: { name: true } } } } },
        orderBy: { date: 'desc' },
      });
      return stringify(
        data.map((p) => ({
          date: p.date?.toISOString().split('T')[0] ?? '',
          tutor: p.tutor?.user?.name ?? '',
          amount: Number(p.amount),
          status: p.status,
          period_start: p.period_start?.toISOString().split('T')[0] ?? '',
          period_end: p.period_end?.toISOString().split('T')[0] ?? '',
          description: p.description ?? '',
        })),
        { header: true },
      );
    }

    const data = await this.prisma.expense.findMany({
      where: { ...where, date: dateRange },
      orderBy: { date: 'desc' },
    });
    return stringify(
      data.map((e) => ({
        date: e.date?.toISOString().split('T')[0] ?? '',
        category: e.category,
        amount: Number(e.amount),
        description: e.description ?? '',
      })),
      { header: true },
    );
  }
}
