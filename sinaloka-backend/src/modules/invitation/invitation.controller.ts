import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { InvitationService } from './invitation.service.js';
import { AcceptInviteSchema } from './invitation.dto.js';
import type { AcceptInviteDto } from './invitation.dto.js';

@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get(':token')
  @Public()
  async validateToken(@Param('token') token: string) {
    return this.invitationService.validateToken(token);
  }

  @Post('accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Body(new ZodValidationPipe(AcceptInviteSchema)) dto: AcceptInviteDto,
  ) {
    return this.invitationService.acceptInvite(dto);
  }
}
