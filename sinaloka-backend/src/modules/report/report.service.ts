import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAttendanceReport(
    institutionId: string,
    filters: { date_from: Date; date_to: Date; class_id?: string; student_id?: string },
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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(
      `Period: ${filters.date_from.toISOString().slice(0, 10)} to ${filters.date_to.toISOString().slice(0, 10)}`,
    );
    doc.moveDown();

    // Table header
    const cols = [40, 150, 180, 80];
    let y = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Date', cols[0], y);
    doc.text('Student', cols[1], y);
    doc.text('Class', cols[2], y);
    doc.text('Status', cols[3], y);
    doc.font('Helvetica');
    y += 20;

    for (const r of records) {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      const status = r.status === 'PRESENT' ? 'P' : r.status === 'LATE' ? 'L' : 'A';
      doc.text(r.session.date.toISOString().slice(0, 10), cols[0], y);
      doc.text(r.student.name, cols[1], y);
      doc.text(r.session.class.name, cols[2], y);
      doc.text(status, cols[3], y);
      y += 18;
    }

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('Finance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(
      `Period: ${filters.date_from.toISOString().slice(0, 10)} to ${filters.date_to.toISOString().slice(0, 10)}`,
    );
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Total Income (Paid Payments): ${totalIncome} (${payments._count} transactions)`);
    doc.text(`Total Payouts: ${totalPayouts} (${payouts._count} transactions)`);
    doc.text(`Total Expenses: ${totalExpenses} (${expenses._count} transactions)`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Net Profit: ${totalIncome - totalPayouts - totalExpenses}`);
    doc.font('Helvetica');

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  }

  async generateStudentProgressReport(
    institutionId: string,
    studentId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Buffer> {
    const dateFilter = dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : undefined;
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
    const attendanceRate = total > 0 ? Math.round((presentLate / total) * 100) : 0;
    const homeworkRate = total > 0 ? Math.round((homeworkDone / total) * 100) : 0;

    const student = await this.prisma.student.findFirstOrThrow({
      where: { id: studentId, institution_id: institutionId },
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('Student Progress Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${student.name}`);
    doc.text(`Attendance Rate: ${attendanceRate}%`);
    doc.text(`Homework Completion Rate: ${homeworkRate}%`);
    doc.text(`Total Sessions: ${total}`);
    doc.moveDown();

    doc.fontSize(14).text('Session Notes');
    doc.moveDown(0.5);
    doc.fontSize(10);
    for (const a of attendances) {
      if (doc.y > 720) doc.addPage();
      doc.font('Helvetica-Bold').text(
        `${a.session.date.toISOString().slice(0, 10)} - ${a.session.class.name}`,
      );
      doc.font('Helvetica');
      doc.text(`Status: ${a.status} | Homework: ${a.homework_done ? 'Done' : 'Not done'}`);
      if (a.session.topic_covered) doc.text(`Topic: ${a.session.topic_covered}`);
      if (a.notes) doc.text(`Notes: ${a.notes}`);
      doc.moveDown(0.5);
    }

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  }
}
