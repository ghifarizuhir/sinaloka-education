import { Module } from '@nestjs/common';
import { SessionController } from './session.controller.js';
import { TutorSessionController } from './tutor-session.controller.js';
import { SessionService } from './session.service.js';
import { PayoutModule } from '../payout/payout.module.js';

@Module({
  imports: [PayoutModule],
  controllers: [SessionController, TutorSessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
