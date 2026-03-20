import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller.js';
import { RegisterController } from './register.controller.js';
import { RegistrationService } from './registration.service.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { InvitationModule } from '../invitation/invitation.module.js';

@Module({
  imports: [InvitationModule],
  controllers: [RegistrationController, RegisterController],
  providers: [RegistrationService, RateLimitGuard],
})
export class RegistrationModule {}
