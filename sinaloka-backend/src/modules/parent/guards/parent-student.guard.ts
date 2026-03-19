import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';

@Injectable()
export class ParentStudentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const studentId = request.params.studentId;

    // Only enforce for PARENT role
    if (user.role !== 'PARENT') {
      return true;
    }

    if (!studentId) {
      return true;
    }

    const parent = await this.prisma.parent.findFirst({
      where: { user_id: user.userId },
      select: { id: true },
    });

    if (!parent) {
      throw new ForbiddenException('Parent profile not found');
    }

    const link = await this.prisma.parentStudent.findFirst({
      where: {
        parent_id: parent.id,
        student_id: studentId,
      },
    });

    if (!link) {
      throw new ForbiddenException('You do not have access to this student');
    }

    return true;
  }
}
