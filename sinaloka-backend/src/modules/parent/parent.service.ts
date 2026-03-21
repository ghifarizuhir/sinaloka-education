import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  buildPaginationMeta,
  PaginatedResponse,
} from '../../common/dto/pagination.dto.js';
import {
  ParentQueryDto,
  LinkStudentsDto,
  ChildAttendanceQueryDto,
  ChildSessionsQueryDto,
  ChildPaymentsQueryDto,
} from './parent.dto.js';
@Injectable()
export class ParentService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // --- Parent-facing methods ---

  async getParentByUserId(userId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { user_id: userId },
    });
    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }
    return parent;
  }

  async getChildren(userId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { user_id: userId },
      include: {
        children: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: {
                    class: {
                      select: { id: true, name: true, subject: { select: { name: true } } },
                    },
                  },
                },
                attendances: {
                  orderBy: { created_at: 'desc' },
                  take: 50,
                  select: { status: true, homework_done: true },
                },
                payments: {
                  where: { status: { in: ['PENDING', 'OVERDUE'] } },
                  select: { id: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }

    // Get next upcoming session per child
    const classIds = parent.children.flatMap((link) =>
      link.student.enrollments.map((e: any) => e.class.id),
    );

    const nextSessions =
      classIds.length > 0
        ? await this.prisma.session.findMany({
            where: {
              class_id: { in: classIds },
              status: 'SCHEDULED',
              date: { gte: new Date() },
            },
            orderBy: { date: 'asc' },
            include: {
              class: { select: { id: true, name: true, subject: { select: { name: true } } } },
            },
          })
        : [];

    return parent.children.map((link) => {
      const s = link.student;
      const attendances = s.attendances;
      const totalAttendance = attendances.length;
      const presentCount = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const attendanceRate =
        totalAttendance > 0
          ? Math.round((presentCount / totalAttendance) * 100)
          : 0;

      const pendingPayments = s.payments.filter(
        (p) => p.status === 'PENDING',
      ).length;
      const overduePayments = s.payments.filter(
        (p) => p.status === 'OVERDUE',
      ).length;

      // Find next upcoming session for this child's enrolled classes
      const childClassIds = s.enrollments.map((e: any) => e.class.id);
      const nextSession = nextSessions.find((sess: any) =>
        childClassIds.includes(sess.class_id),
      );

      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        status: s.status,
        enrollment_count: s.enrollments.length,
        attendance_rate: attendanceRate,
        pending_payments: pendingPayments,
        overdue_payments: overduePayments,
        next_session: nextSession
          ? {
              date: nextSession.date,
              start_time: nextSession.start_time,
              subject: nextSession.class.subject?.name ?? '',
              class_name: nextSession.class.name,
            }
          : null,
        enrollments: s.enrollments.map((e: any) => ({
          class_name: e.class.name,
          subject: e.class.subject?.name ?? '',
        })),
      };
    });
  }

  async getChildDetail(institutionId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, institution_id: institutionId },
      include: {
        enrollments: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: {
            class: {
              include: {
                schedules: true,
                tutor: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getChildAttendance(
    institutionId: string,
    studentId: string,
    query: ChildAttendanceQueryDto,
  ) {
    const { page, limit, date_from, date_to, class_id } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
      student_id: studentId,
    };

    const sessionFilter: Record<string, unknown> = {};
    if (class_id) sessionFilter.class_id = class_id;
    if (date_from || date_to) {
      sessionFilter.date = {};
      if (date_from) (sessionFilter.date as any).gte = new Date(date_from);
      if (date_to) (sessionFilter.date as any).lte = new Date(date_to);
    }
    if (Object.keys(sessionFilter).length > 0) {
      where.session = sessionFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          session: {
            select: {
              date: true,
              start_time: true,
              end_time: true,
              class: { select: { name: true, subject: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    // Compute summary from ALL matching records (not just current page)
    const allStatuses = await this.prisma.attendance.findMany({
      where,
      select: { status: true, homework_done: true },
    });

    const present = allStatuses.filter((a) => a.status === 'PRESENT').length;
    const absent = allStatuses.filter((a) => a.status === 'ABSENT').length;
    const late = allStatuses.filter((a) => a.status === 'LATE').length;
    const homeworkDone = allStatuses.filter((a) => a.homework_done).length;
    const attendanceRate =
      total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    const homeworkRate =
      total > 0 ? Math.round((homeworkDone / total) * 100) : 0;

    return {
      data,
      summary: {
        present,
        absent,
        late,
        homework_done: homeworkDone,
        attendance_rate: attendanceRate,
        homework_rate: homeworkRate,
      },
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getChildSessions(
    institutionId: string,
    studentId: string,
    query: ChildSessionsQueryDto,
  ) {
    const { page, limit, status, date_from, date_to } = query;
    const skip = (page - 1) * limit;

    // Get class IDs the student is enrolled in
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: institutionId,
        student_id: studentId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      select: { class_id: true },
    });

    const classIds = enrollments.map((e) => e.class_id);

    if (classIds.length === 0) {
      return { data: [], meta: buildPaginationMeta(0, page, limit) };
    }

    const where: Record<string, unknown> = {
      institution_id: institutionId,
      class_id: { in: classIds },
    };

    if (status) where.status = status;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) (where.date as any).gte = new Date(date_from);
      if (date_to) (where.date as any).lte = new Date(date_to);
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          class: { select: { name: true, subject: { select: { name: true } } } },
        },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getChildPayments(
    institutionId: string,
    studentId: string,
    query: ChildPaymentsQueryDto,
  ) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
      student_id: studentId,
    };

    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { due_date: 'desc' },
        include: {
          enrollment: {
            select: {
              class: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
      gateway_configured: true,
    };
  }

  async getChildEnrollments(institutionId: string, studentId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        institution_id: institutionId,
        student_id: studentId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: {
        class: {
          include: {
            schedules: true,
            tutor: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });
  }

  // --- Admin methods ---

  async findAll(
    institutionId: string,
    query: ParentQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, search, sort_by, sort_order } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderBy: Record<string, unknown> =
      sort_by === 'name'
        ? { user: { name: sort_order } }
        : { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, is_active: true },
          },
          _count: { select: { children: true } },
        },
      }),
      this.prisma.parent.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(institutionId: string, id: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        user: {
          select: { id: true, name: true, email: true, is_active: true },
        },
        children: {
          include: {
            student: {
              select: { id: true, name: true, grade: true, status: true },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID "${id}" not found`);
    }

    return parent;
  }

  async linkStudents(
    institutionId: string,
    parentId: string,
    dto: LinkStudentsDto,
  ) {
    await this.findOne(institutionId, parentId);

    const count = await this.prisma.student.count({
      where: {
        id: { in: dto.student_ids },
        institution_id: institutionId,
      },
    });

    if (count !== dto.student_ids.length) {
      throw new BadRequestException(
        'One or more student IDs do not belong to this institution',
      );
    }

    await this.prisma.parentStudent.createMany({
      data: dto.student_ids.map((sid) => ({
        parent_id: parentId,
        student_id: sid,
      })),
      skipDuplicates: true,
    });

    return this.findOne(institutionId, parentId);
  }

  async unlinkStudent(
    institutionId: string,
    parentId: string,
    studentId: string,
  ) {
    await this.findOne(institutionId, parentId);

    const link = await this.prisma.parentStudent.findFirst({
      where: { parent_id: parentId, student_id: studentId },
    });

    if (!link) {
      throw new NotFoundException('Student is not linked to this parent');
    }

    await this.prisma.parentStudent.delete({ where: { id: link.id } });
  }

  async deleteParent(institutionId: string, id: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID "${id}" not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.parent.delete({ where: { id } });
      await tx.refreshToken.deleteMany({ where: { user_id: parent.user_id } });
      await tx.user.delete({ where: { id: parent.user_id } });
    });
  }
}
