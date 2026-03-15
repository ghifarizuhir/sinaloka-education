import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;
  private readonly tutorPortalUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from = this.configService.get<string>('EMAIL_FROM') || 'Sinaloka <noreply@sinaloka.com>';
    this.tutorPortalUrl = this.configService.get<string>('TUTOR_PORTAL_URL') || 'http://localhost:5173';
  }

  async sendTutorInvitation(params: {
    to: string;
    tutorName: string;
    institutionName: string;
    inviteToken: string;
  }): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.tutorPortalUrl}/accept-invite?token=${params.inviteToken}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: `You're invited to join ${params.institutionName} as a tutor`,
        html: this.buildInvitationHtml({
          tutorName: params.tutorName,
          institutionName: params.institutionName,
          inviteUrl,
        }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${params.to}`, error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  private buildInvitationHtml(params: {
    tutorName: string;
    institutionName: string;
    inviteUrl: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #18181b;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; margin: 0;">${params.institutionName}</h1>
  </div>
  <p style="font-size: 16px; line-height: 1.6;">Hi ${params.tutorName},</p>
  <p style="font-size: 16px; line-height: 1.6;">You've been invited to join <strong>${params.institutionName}</strong> as a tutor. Click the button below to set up your account.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${params.inviteUrl}" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Invitation</a>
  </div>
  <p style="font-size: 14px; color: #71717a; line-height: 1.5;">This link expires in 48 hours. If you didn't expect this invitation, you can safely ignore this email.</p>
</body>
</html>`;
  }
}
