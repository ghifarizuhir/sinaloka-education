import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PlanGuard } from './common/guards/plan.guard.js';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor.js';
import { PlanWarningInterceptor } from './common/interceptors/plan-warning.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { InstitutionModule } from './modules/institution/institution.module.js';
import { UserModule } from './modules/user/user.module.js';
import { StudentModule } from './modules/student/student.module.js';
import { TutorModule } from './modules/tutor/tutor.module.js';
import { ClassModule } from './modules/class/class.module.js';
import { EnrollmentModule } from './modules/enrollment/enrollment.module.js';
import { SessionModule } from './modules/session/session.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PayoutModule } from './modules/payout/payout.module.js';
import { ExpenseModule } from './modules/expense/expense.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { ParentModule } from './modules/parent/parent.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { InvitationModule } from './modules/invitation/invitation.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SubjectModule } from './modules/subject/subject.module.js';
import { PlanModule } from './modules/plan/plan.module.js';
import { RegistrationModule } from './modules/registration/registration.module.js';
import { SubscriptionModule } from './modules/subscription/subscription.module.js';
import { SubscriptionGuard } from './modules/subscription/subscription.guard.js';
import { SettlementModule } from './modules/settlement/settlement.module.js';
import { SubscriptionWarningInterceptor } from './modules/subscription/subscription-warning.interceptor.js';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    InvitationModule,
    AuthModule,
    InstitutionModule,
    UserModule,
    StudentModule,
    TutorModule,
    ClassModule,
    EnrollmentModule,
    SessionModule,
    AttendanceModule,
    PaymentModule,
    PayoutModule,
    ExpenseModule,
    DashboardModule,
    ReportModule,
    UploadModule,
    ParentModule,
    SettingsModule,
    SubjectModule,
    PlanModule,
    RegistrationModule,
    SubscriptionModule,
    SettlementModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    WhatsappModule,
    NotificationModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlanGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PlanWarningInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SubscriptionWarningInterceptor,
    },
  ],
})
export class AppModule {}
