import {
  Injectable,
  NotFoundException,
  ConflictException,
  GoneException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import type { InviteTutorDto, AcceptInviteDto } from './invitation.dto.js';

const INVITE_EXPIRY_HOURS = 48;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async invite(institutionId: string, dto: InviteTutorDto) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already in use`);
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException(`Institution not found`);
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name ?? dto.email,
          email: dto.email,
          password_hash: null,
          role: 'TUTOR',
          institution_id: institutionId,
          is_active: false,
        },
      });

      const tutor = await tx.tutor.create({
        data: {
          user_id: user.id,
          institution_id: institutionId,
          subjects: dto.subjects,
          experience_years: dto.experience_years ?? 0,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              is_active: true,
            },
          },
        },
      });

      await tx.invitation.create({
        data: {
          email: dto.email,
          token,
          institution_id: institutionId,
          tutor_id: tutor.id,
          status: 'PENDING',
          expires_at: expiresAt,
        },
      });

      return tutor;
    });

    await this.emailService.sendTutorInvitation({
      to: dto.email,
      tutorName: dto.name ?? dto.email,
      institutionName: institution.name,
      inviteToken: token,
    });

    return result;
  }

  async resendInvite(institutionId: string, tutorId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: tutorId, institution_id: institutionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            is_active: true,
          },
        },
        invitation: true,
      },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID "${tutorId}" not found`);
    }

    if (tutor.user.is_active) {
      throw new BadRequestException(
        'Cannot resend invite: tutor account is already active',
      );
    }

    if (!tutor.invitation) {
      throw new BadRequestException(
        'No pending invitation found for this tutor',
      );
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException(`Institution not found`);
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.prisma.invitation.update({
      where: { id: tutor.invitation.id },
      data: {
        token,
        status: 'PENDING',
        expires_at: expiresAt,
      },
    });

    await this.emailService.sendTutorInvitation({
      to: tutor.user.email,
      tutorName: tutor.user.name ?? tutor.user.email,
      institutionName: institution.name,
      inviteToken: token,
    });

    return { message: 'Invitation resent successfully' };
  }

  async cancelInvite(institutionId: string, tutorId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: tutorId, institution_id: institutionId },
      include: {
        user: {
          select: {
            id: true,
            is_active: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with ID "${tutorId}" not found`);
    }

    if (tutor.user.is_active) {
      throw new BadRequestException(
        'Cannot cancel invite: tutor account is already active',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { tutor_id: tutorId } });
      await tx.tutor.delete({ where: { id: tutorId } });
      await tx.refreshToken.deleteMany({
        where: { user_id: tutor.user_id },
      });
      await tx.user.delete({ where: { id: tutor.user_id } });
    });
  }

  async validateToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === 'CANCELLED') {
      throw new ForbiddenException('This invitation has been cancelled');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new GoneException('This invitation has already been accepted');
    }

    if (invitation.status === 'EXPIRED' || invitation.expires_at < new Date()) {
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new GoneException('This invitation has expired');
    }

    return {
      email: invitation.email,
      institutionName: invitation.institution.name,
      tutorName: invitation.tutor.user.name,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                is_active: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === 'CANCELLED') {
      throw new ForbiddenException('This invitation has been cancelled');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new GoneException('This invitation has already been accepted');
    }

    if (invitation.status === 'EXPIRED' || invitation.expires_at < new Date()) {
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new GoneException('This invitation has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: invitation.tutor.user_id },
        data: {
          password_hash: passwordHash,
          is_active: true,
          ...(dto.name !== undefined ? { name: dto.name } : {}),
        },
      });

      const tutorData: Record<string, unknown> = {};
      if (dto.bank_name !== undefined) tutorData.bank_name = dto.bank_name;
      if (dto.bank_account_number !== undefined)
        tutorData.bank_account_number = dto.bank_account_number;
      if (dto.bank_account_holder !== undefined)
        tutorData.bank_account_holder = dto.bank_account_holder;

      if (Object.keys(tutorData).length > 0) {
        await tx.tutor.update({
          where: { id: invitation.tutor_id },
          data: tutorData,
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    });

    return { message: 'Invitation accepted successfully' };
  }
}
