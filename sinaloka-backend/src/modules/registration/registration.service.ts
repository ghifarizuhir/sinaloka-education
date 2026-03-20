import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvitationService } from '../invitation/invitation.service.js';
import { PLAN_LIMITS } from '../../common/constants/plans.js';
import {
  buildPaginationMeta,
  type PaginatedResponse,
} from '../../common/dto/pagination.dto.js';
import type {
  StudentRegistrationDto,
  TutorRegistrationDto,
  RejectRegistrationDto,
  RegistrationQueryDto,
} from './registration.dto.js';

const REGISTRATION_DEFAULTS = { student_enabled: false, tutor_enabled: false };

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitationService: InvitationService,
  ) {}

  async getInstitutionInfo(slug: string) {
    const institution = await this.prisma.institution.findFirst({
      where: { slug, is_active: true },
      select: {
        name: true,
        logo_url: true,
        slug: true,
        settings: true,
      },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.registration ?? {};
    const registration = { ...REGISTRATION_DEFAULTS, ...stored };

    return {
      institution: {
        name: institution.name,
        logo_url: institution.logo_url,
        slug: institution.slug,
      },
      registration,
    };
  }

  async submitStudentRegistration(slug: string, dto: StudentRegistrationDto) {
    const institution = await this.prisma.institution.findFirst({
      where: { slug, is_active: true },
      select: { id: true, settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.registration ?? {};
    const regSettings = { ...REGISTRATION_DEFAULTS, ...stored };

    if (!regSettings.student_enabled) {
      throw new ForbiddenException('Student registration is not enabled');
    }

    if (dto.email) {
      const duplicate = await this.prisma.registration.findFirst({
        where: {
          institution_id: institution.id,
          type: 'STUDENT',
          status: 'PENDING',
          email: dto.email,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'A pending registration with this email already exists',
        );
      }
    }

    const registration = await this.prisma.registration.create({
      data: {
        institution_id: institution.id,
        type: 'STUDENT',
        name: dto.name,
        grade: dto.grade,
        parent_name: dto.parent_name,
        parent_phone: dto.parent_phone,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        parent_email: dto.parent_email ?? null,
      },
    });

    return { id: registration.id, message: 'Registration submitted' };
  }

  async submitTutorRegistration(slug: string, dto: TutorRegistrationDto) {
    const institution = await this.prisma.institution.findFirst({
      where: { slug, is_active: true },
      select: { id: true, settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.registration ?? {};
    const regSettings = { ...REGISTRATION_DEFAULTS, ...stored };

    if (!regSettings.tutor_enabled) {
      throw new ForbiddenException('Tutor registration is not enabled');
    }

    const duplicate = await this.prisma.registration.findFirst({
      where: {
        institution_id: institution.id,
        type: 'TUTOR',
        status: 'PENDING',
        email: dto.email,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'A pending registration with this email already exists',
      );
    }

    const registration = await this.prisma.registration.create({
      data: {
        institution_id: institution.id,
        type: 'TUTOR',
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        subject_names: dto.subject_names,
        experience_years: dto.experience_years ?? null,
      },
    });

    return { id: registration.id, message: 'Registration submitted' };
  }

  async findAll(
    institutionId: string,
    query: RegistrationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, type, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { institution_id: institutionId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.registration.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.registration.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(institutionId: string, id: string) {
    const registration = await this.prisma.registration.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!registration) {
      throw new NotFoundException(`Registration with ID "${id}" not found`);
    }

    return registration;
  }

  async getPendingCount(institutionId: string) {
    const count = await this.prisma.registration.count({
      where: { institution_id: institutionId, status: 'PENDING' },
    });

    return { count };
  }

  async approve(institutionId: string, id: string, userId: string) {
    const registration = await this.prisma.registration.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!registration) {
      throw new NotFoundException(`Registration with ID "${id}" not found`);
    }

    if (registration.status !== 'PENDING') {
      throw new ForbiddenException('Only pending registrations can be approved');
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { plan_type: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const planConfig = PLAN_LIMITS[institution.plan_type];

    if (registration.type === 'STUDENT') {
      if (planConfig.maxStudents !== null) {
        const studentCount = await this.prisma.student.count({
          where: { institution_id: institutionId, status: 'ACTIVE' },
        });

        if (studentCount >= planConfig.maxStudents) {
          throw new ForbiddenException(
            `Student limit reached for your current plan (${planConfig.maxStudents} students)`,
          );
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.student.create({
          data: {
            institution_id: institutionId,
            name: registration.name,
            grade: registration.grade ?? '',
            email: registration.email ?? null,
            phone: registration.phone ?? null,
            parent_name: registration.parent_name ?? null,
            parent_phone: registration.parent_phone ?? null,
            parent_email: registration.parent_email ?? null,
            status: 'ACTIVE',
            enrolled_at: new Date(),
          },
        });

        await tx.registration.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewed_at: new Date(),
            reviewed_by: userId,
          },
        });
      });
    } else {
      // TUTOR
      if (planConfig.maxTutors !== null) {
        const tutorCount = await this.prisma.tutor.count({
          where: { institution_id: institutionId },
        });

        if (tutorCount >= planConfig.maxTutors) {
          throw new ForbiddenException(
            `Tutor limit reached for your current plan (${planConfig.maxTutors} tutors)`,
          );
        }
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email: registration.email! },
      });

      if (existingUser) {
        throw new ConflictException(
          `Email "${registration.email}" is already in use`,
        );
      }

      await this.invitationService.invite(institutionId, {
        email: registration.email!,
        name: registration.name,
        subject_ids: [],
        experience_years: registration.experience_years ?? 0,
      });

      await this.prisma.registration.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewed_at: new Date(),
          reviewed_by: userId,
        },
      });
    }

    return { message: 'Registration approved' };
  }

  async reject(
    institutionId: string,
    id: string,
    userId: string,
    dto: RejectRegistrationDto,
  ) {
    const registration = await this.prisma.registration.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!registration) {
      throw new NotFoundException(`Registration with ID "${id}" not found`);
    }

    if (registration.status !== 'PENDING') {
      throw new ForbiddenException('Only pending registrations can be rejected');
    }

    await this.prisma.registration.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejected_reason: dto.reason ?? null,
        reviewed_at: new Date(),
        reviewed_by: userId,
      },
    });

    return { message: 'Registration rejected' };
  }
}
