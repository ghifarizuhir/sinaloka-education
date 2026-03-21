import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PlanLimit } from '../../common/decorators/plan.decorator.js';
import { TutorService } from './tutor.service.js';
import {
  CreateTutorSchema,
  UpdateTutorSchema,
  TutorQuerySchema,
} from './tutor.dto.js';
import type {
  CreateTutorDto,
  UpdateTutorDto,
  TutorQueryDto,
} from './tutor.dto.js';
import { InvitationService } from '../invitation/invitation.service.js';
import { InviteTutorSchema } from '../invitation/invitation.dto.js';
import type { InviteTutorDto } from '../invitation/invitation.dto.js';

@Controller('admin/tutors')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class TutorController {
  constructor(
    private readonly tutorService: TutorService,
    private readonly invitationService: InvitationService,
  ) {}

  @PlanLimit('tutors')
  @Post()
  async create(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateTutorSchema)) dto: CreateTutorDto,
  ) {
    return this.tutorService.create(institutionId, dto);
  }

  @Get()
  async findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(TutorQuerySchema)) query: TutorQueryDto,
  ) {
    return this.tutorService.findAll(institutionId, query);
  }

  @PlanLimit('tutors')
  @Post('invite')
  async invite(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(InviteTutorSchema)) dto: InviteTutorDto,
  ) {
    return this.invitationService.invite(institutionId, dto);
  }

  @Post(':id/resend-invite')
  async resendInvite(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.invitationService.resendInvite(institutionId, id);
  }

  @Post(':id/cancel-invite')
  async cancelInvite(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.invitationService.cancelInvite(institutionId, id);
  }

  @Get(':id')
  async findOne(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.tutorService.findOne(institutionId, id);
  }

  @Patch(':id')
  async update(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTutorSchema)) dto: UpdateTutorDto,
  ) {
    return this.tutorService.update(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.tutorService.delete(institutionId, id);
  }
}
