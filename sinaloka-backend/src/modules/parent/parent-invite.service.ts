import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  CreateParentInviteDto,
  ParentRegisterDto,
} from './parent.dto.js';

@Injectable()
export class ParentInviteService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvite(institutionId: string, dto: CreateParentInviteDto) {
    // Validate all student IDs belong to this institution
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

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const invite = await this.prisma.parentInvite.create({
      data: {
        institution_id: institutionId,
        email: dto.email,
        token,
        student_ids: dto.student_ids,
        expires_at: expiresAt,
      },
    });

    return invite;
  }

  async registerParent(dto: ParentRegisterDto) {
    const invite = await this.prisma.parentInvite.findUnique({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite token');
    }

    if (invite.used_at) {
      throw new BadRequestException('Invite has already been used');
    }

    if (invite.expires_at < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    // Check if email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Email "${invite.email}" is already registered`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: invite.email,
          password_hash: passwordHash,
          role: 'PARENT',
          institution_id: invite.institution_id,
          is_active: true,
        },
      });

      // Create parent profile
      const parent = await tx.parent.create({
        data: {
          user_id: user.id,
          institution_id: invite.institution_id,
        },
      });

      // Link students from invite
      const studentIds = [...invite.student_ids];

      // Auto-link additional students matching parent_email
      const extraStudents = await tx.student.findMany({
        where: {
          institution_id: invite.institution_id,
          parent_email: invite.email,
          id: { notIn: studentIds },
        },
        select: { id: true },
      });

      for (const s of extraStudents) {
        studentIds.push(s.id);
      }

      if (studentIds.length > 0) {
        await tx.parentStudent.createMany({
          data: studentIds.map((sid) => ({
            parent_id: parent.id,
            student_id: sid,
          })),
        });
      }

      // Mark invite as used
      await tx.parentInvite.update({
        where: { id: invite.id },
        data: { used_at: new Date() },
      });

      return { user, parent };
    });

    return result;
  }
}
