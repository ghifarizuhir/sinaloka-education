import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.subject.findMany({
      where: { institution_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, data: { name: string }) {
    const existing = await this.prisma.subject.findUnique({
      where: { name_institution_id: { name: data.name, institution_id: tenantId } },
    });
    if (existing) throw new ConflictException('Subject already exists');
    return this.prisma.subject.create({
      data: { name: data.name, institution_id: tenantId },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string }) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    if (data.name) {
      const existing = await this.prisma.subject.findUnique({
        where: { name_institution_id: { name: data.name, institution_id: tenantId } },
      });
      if (existing && existing.id !== id) throw new ConflictException('Subject name already exists');
    }
    return this.prisma.subject.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    const classCount = await this.prisma.class.count({ where: { subject_id: id } });
    const tutorCount = await this.prisma.tutorSubject.count({ where: { subject_id: id } });
    if (classCount > 0 || tutorCount > 0) {
      throw new BadRequestException(
        'Cannot delete subject: still referenced by classes or tutors',
      );
    }
    return this.prisma.subject.delete({ where: { id } });
  }

  async findTutorsBySubject(tenantId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, institution_id: tenantId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    return this.prisma.tutor.findMany({
      where: {
        institution_id: tenantId,
        is_verified: true,
        tutor_subjects: { some: { subject_id: subjectId } },
      },
      include: { tutor_subjects: { include: { subject: true } } },
      orderBy: { user: { name: 'asc' } },
    });
  }
}
