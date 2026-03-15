import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor.js';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
