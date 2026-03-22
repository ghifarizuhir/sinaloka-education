import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service.js';
import { NotificationGateway } from './notification.gateway.js';
import { NOTIFICATION_EVENTS } from './notification.events.js';
import type {
  PaymentReceivedEvent,
  StudentRegisteredEvent,
  ParentRegisteredEvent,
  SessionCreatedEvent,
  SessionCancelledEvent,
  AttendanceSubmittedEvent,
  TutorInviteAcceptedEvent,
} from './notification.events.js';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.PAYMENT_RECEIVED)
  async onPaymentReceived(event: PaymentReceivedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
      title: 'Payment Received',
      body: `${event.studentName} made a payment of Rp ${event.amount.toLocaleString('id-ID')}`,
      data: { paymentId: event.paymentId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification as Record<string, unknown>);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.STUDENT_REGISTERED)
  async onStudentRegistered(event: StudentRegisteredEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.STUDENT_REGISTERED,
      title: 'New Student',
      body: `${event.studentName} has been registered`,
      data: { studentId: event.studentId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification as Record<string, unknown>);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.PARENT_REGISTERED)
  async onParentRegistered(event: ParentRegisteredEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.PARENT_REGISTERED,
      title: 'New Parent',
      body: `${event.parentName} joined as parent of ${event.studentNames.join(', ')}`,
      data: { parentId: event.parentId, studentNames: event.studentNames },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification as Record<string, unknown>);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.SESSION_CREATED)
  async onSessionCreated(event: SessionCreatedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.SESSION_CREATED,
      title: 'Session Scheduled',
      body: `New session for ${event.className} on ${event.date}`,
      data: { sessionId: event.sessionId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification as Record<string, unknown>);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.SESSION_CANCELLED)
  async onSessionCancelled(event: SessionCancelledEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.SESSION_CANCELLED,
      title: 'Session Cancelled',
      body: `Session for ${event.className} on ${event.date} was cancelled${event.reason ? `: ${event.reason}` : ''}`,
      data: { sessionId: event.sessionId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification as Record<string, unknown>);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.ATTENDANCE_SUBMITTED)
  async onAttendanceSubmitted(event: AttendanceSubmittedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.ATTENDANCE_SUBMITTED,
      title: 'Attendance Submitted',
      body: `${event.tutorName} submitted attendance for ${event.className} (${event.studentCount} students)`,
      data: { sessionId: event.sessionId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification as Record<string, unknown>);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.TUTOR_INVITE_ACCEPTED)
  async onTutorInviteAccepted(event: TutorInviteAcceptedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.TUTOR_INVITE_ACCEPTED,
      title: 'Tutor Joined',
      body: `${event.tutorName} accepted the tutor invitation`,
      data: { tutorId: event.tutorId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification as Record<string, unknown>);
    }
  }
}
