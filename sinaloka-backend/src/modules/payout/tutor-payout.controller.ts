import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PayoutService } from './payout.service.js';
import { PayoutQuerySchema } from './payout.dto.js';
import type { PayoutQueryDto } from './payout.dto.js';

@Controller('tutor/payouts')
@Roles(Role.TUTOR)
export class TutorPayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async findOwn(
    @CurrentUser() user: JwtPayload,
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(PayoutQuerySchema)) query: PayoutQueryDto,
  ) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: user.userId, institution_id: institutionId },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    return this.payoutService.findByTutor(institutionId, tutor.id, query);
  }
}
