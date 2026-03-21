import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;
  private readonly tutorPortalUrl: string;
  private readonly parentPortalUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      'Sinaloka <noreply@sinaloka.com>';
    this.tutorPortalUrl =
      this.configService.get<string>('TUTOR_PORTAL_URL') ||
      'http://localhost:5173';
    this.parentPortalUrl =
      this.configService.get<string>('PARENT_PORTAL_URL') ||
      'http://localhost:5174';
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
        subject: `Undangan Bergabung sebagai Tutor di ${params.institutionName}`,
        html: this.buildInvitationHtml({
          tutorName: params.tutorName,
          institutionName: params.institutionName,
          inviteUrl,
        }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email to ${params.to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  async sendParentInvitation(params: {
    to: string;
    institutionName: string;
    inviteToken: string;
    studentNames: string[];
  }): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.parentPortalUrl}/register?token=${params.inviteToken}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: `Undangan Portal Orang Tua - ${params.institutionName}`,
        html: this.buildParentInvitationHtml({
          institutionName: params.institutionName,
          inviteUrl,
          studentNames: params.studentNames,
        }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send parent invitation email to ${params.to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  async sendPasswordReset(params: {
    to: string;
    userName: string;
    resetToken: string;
  }): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${this.tutorPortalUrl}/reset-password?token=${params.resetToken}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: 'Reset Password Sinaloka',
        html: this.buildPasswordResetHtml({
          userName: params.userName,
          resetUrl,
        }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${params.to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  private buildPasswordResetHtml(params: {
    userName: string;
    resetUrl: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Sinaloka</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Halo <strong>${params.userName}</strong>,</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 28px;">Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah untuk membuat password baru.</p>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${params.resetUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
              </div>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center; margin: 0 0 8px;">Link ini akan kedaluwarsa dalam <strong style="color: #71717a;">1 jam</strong>.</p>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center; margin: 0;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Dikirim oleh Sinaloka</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildInvitationHtml(params: {
    tutorName: string;
    institutionName: string;
    inviteUrl: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${params.institutionName}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">

              <!-- Greeting -->
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Halo <strong>${params.tutorName}</strong>,</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 8px;">Kami dengan senang hati mengundang Anda untuk bergabung sebagai <strong>Tutor</strong> di <strong>${params.institutionName}</strong>.</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 28px;">Kami sangat antusias bisa bekerja sama dengan Anda dalam memberikan pengalaman belajar terbaik bagi siswa kami.</p>

              <!-- Steps -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 10px; padding: 24px 28px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="font-size: 14px; font-weight: 700; color: #18181b; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;">Langkah Selanjutnya</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="vertical-align: top; padding-right: 14px;">
                          <div style="width: 28px; height: 28px; background-color: #18181b; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">1</div>
                        </td>
                        <td style="vertical-align: center;">
                          <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6;"><strong>Terima undangan</strong> — klik tombol di bawah untuk memulai</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="vertical-align: top; padding-right: 14px;">
                          <div style="width: 28px; height: 28px; background-color: #18181b; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">2</div>
                        </td>
                        <td style="vertical-align: center;">
                          <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6;"><strong>Buat kata sandi</strong> — atur akun dan kata sandi Anda</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="vertical-align: top; padding-right: 14px;">
                          <div style="width: 28px; height: 28px; background-color: #18181b; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">3</div>
                        </td>
                        <td style="vertical-align: center;">
                          <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6;"><strong>Lengkapi profil</strong> — tambahkan informasi dan mata pelajaran Anda</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 14px;">
                          <div style="width: 28px; height: 28px; background-color: #18181b; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">4</div>
                        </td>
                        <td style="vertical-align: center;">
                          <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6;"><strong>Mulai mengajar</strong> — kelola jadwal dan sesi Anda</p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${params.inviteUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Terima Undangan</a>
              </div>

              <!-- Expiry notice -->
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center; margin: 0 0 8px;">Link ini akan kedaluwarsa dalam <strong style="color: #71717a;">48 jam</strong>.</p>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center; margin: 0;">Jika Anda tidak merasa menerima undangan ini, abaikan email ini.</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #71717a;">Dikirim oleh <strong>${params.institutionName}</strong> melalui Sinaloka</p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Anda menerima email ini karena diundang sebagai tutor.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildParentInvitationHtml(params: {
    institutionName: string;
    inviteUrl: string;
    studentNames: string[];
  }): string {
    const studentList = params.studentNames
      .map((n) => `<li style="margin-bottom: 4px;">${n}</li>`)
      .join('');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${params.institutionName}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Halo,</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 8px;">Anda diundang untuk bergabung di <strong>Portal Orang Tua ${params.institutionName}</strong> untuk memantau perkembangan anak Anda:</p>
              <ul style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 28px; padding-left: 20px;">${studentList}</ul>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 28px;">Melalui portal ini, Anda dapat melihat jadwal, kehadiran, dan pembayaran anak Anda.</p>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${params.inviteUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Daftar Sekarang</a>
              </div>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center; margin: 0 0 8px;">Link ini akan kedaluwarsa dalam <strong style="color: #71717a;">72 jam</strong>.</p>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center; margin: 0;">Jika Anda tidak merasa menerima undangan ini, abaikan email ini.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #71717a;">Dikirim oleh <strong>${params.institutionName}</strong> melalui Sinaloka</p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Anda menerima email ini karena diundang sebagai orang tua.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendSubscriptionReminder(
    to: string,
    planType: string,
    expiresAt: Date,
    daysRemaining: number,
  ): Promise<{ success: boolean; error?: string }> {
    const subjectMap: Record<number, string> = {
      7: `Subscription ${planType} Anda akan berakhir dalam 7 hari`,
      3: `Subscription ${planType} Anda akan berakhir dalam 3 hari`,
      1: `URGENT: Subscription ${planType} Anda berakhir besok`,
    };
    const subject =
      subjectMap[daysRemaining] ??
      `Subscription ${planType} Anda akan segera berakhir`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html: this.buildSubscriptionReminderHtml({
          planType,
          expiresAt,
          daysRemaining,
        }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send subscription reminder email to ${to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  async sendSubscriptionGracePeriodNotification(
    to: string,
    graceEndsAt: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Subscription Anda telah expired — 7 hari grace period',
        html: this.buildSubscriptionGracePeriodHtml({ graceEndsAt }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send subscription grace period email to ${to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  async sendSubscriptionDowngradeNotification(
    to: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Plan Anda telah di-downgrade ke STARTER',
        html: this.buildSubscriptionDowngradeHtml(),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send subscription downgrade email to ${to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  async sendSubscriptionPaymentConfirmed(
    to: string,
    planType: string,
    expiresAt: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: `Pembayaran subscription ${planType} dikonfirmasi`,
        html: this.buildSubscriptionPaymentConfirmedHtml({
          planType,
          expiresAt,
        }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send subscription payment confirmed email to ${to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  async sendSubscriptionPaymentRejected(
    to: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Pembayaran subscription ditolak',
        html: this.buildSubscriptionPaymentRejectedHtml({ reason }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send subscription payment rejected email to ${to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  async sendSubscriptionPendingPaymentNotification(
    to: string,
    institutionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Pembayaran subscription baru menunggu konfirmasi',
        html: this.buildSubscriptionPendingPaymentHtml({ institutionId }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send subscription pending payment email to ${to}`,
        error,
      );
      return { success: false, error: 'Failed to send email' };
    }
  }

  private buildSubscriptionReminderHtml(params: {
    planType: string;
    expiresAt: Date;
    daysRemaining: number;
  }): string {
    const formattedDate = params.expiresAt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const urgencyColor =
      params.daysRemaining === 1
        ? '#dc2626'
        : params.daysRemaining === 3
          ? '#ea580c'
          : '#ca8a04';
    const urgencyMessage =
      params.daysRemaining === 1
        ? 'Subscription Anda berakhir <strong>besok</strong>. Segera perpanjang agar layanan tidak terganggu.'
        : `Subscription Anda akan berakhir dalam <strong>${params.daysRemaining} hari</strong>. Perpanjang sekarang untuk menghindari gangguan layanan.`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Sinaloka</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Pengingat Subscription</p>
              <div style="background-color: #fef9c3; border-left: 4px solid ${urgencyColor}; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0;">${urgencyMessage}</p>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Detail Subscription</p>
                    <p style="margin: 0 0 4px; font-size: 15px; color: #18181b;"><strong>Plan:</strong> ${params.planType}</p>
                    <p style="margin: 0; font-size: 15px; color: #18181b;"><strong>Berakhir:</strong> ${formattedDate}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0;">Hubungi administrator Sinaloka untuk memperpanjang subscription Anda.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Dikirim oleh Sinaloka</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSubscriptionGracePeriodHtml(params: {
    graceEndsAt: Date;
  }): string {
    const formattedDate = params.graceEndsAt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Sinaloka</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Subscription Anda Telah Expired</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 20px;">Subscription Anda telah berakhir, namun Anda masih dapat menggunakan semua fitur selama masa <strong>grace period 7 hari</strong>.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0;">Grace period berakhir pada <strong>${formattedDate}</strong>. Setelah tanggal ini, akun Anda akan otomatis di-downgrade ke plan STARTER.</p>
              </div>
              <p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0;">Segera lakukan pembayaran untuk menjaga akses penuh ke semua fitur Sinaloka.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Dikirim oleh Sinaloka</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSubscriptionDowngradeHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Sinaloka</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Akun Anda Telah Di-downgrade</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 20px;">Karena masa grace period telah berakhir tanpa pembayaran, akun Anda telah otomatis di-downgrade ke plan <strong>STARTER</strong>.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Plan STARTER — Batas Saat Ini</p>
                    <p style="margin: 0 0 4px; font-size: 15px; color: #18181b;">Maksimal <strong>30 siswa</strong></p>
                    <p style="margin: 0; font-size: 15px; color: #18181b;">Maksimal <strong>5 tutor</strong></p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 20px;">Semua data Anda tetap tersimpan dengan aman. Upgrade kembali kapan saja untuk mendapatkan akses penuh.</p>
              <p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0;">Hubungi administrator Sinaloka untuk melakukan upgrade plan Anda.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Dikirim oleh Sinaloka</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSubscriptionPaymentConfirmedHtml(params: {
    planType: string;
    expiresAt: Date;
  }): string {
    const formattedDate = params.expiresAt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Sinaloka</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Pembayaran Dikonfirmasi</p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0;">Pembayaran subscription Anda telah berhasil dikonfirmasi. Akun Anda kini aktif dengan plan <strong>${params.planType}</strong>.</p>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Detail Subscription</p>
                    <p style="margin: 0 0 4px; font-size: 15px; color: #18181b;"><strong>Plan:</strong> ${params.planType}</p>
                    <p style="margin: 0; font-size: 15px; color: #18181b;"><strong>Aktif hingga:</strong> ${formattedDate}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0;">Terima kasih telah menggunakan Sinaloka. Selamat mengelola lembaga bimbingan belajar Anda!</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Dikirim oleh Sinaloka</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSubscriptionPaymentRejectedHtml(params: {
    reason: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Sinaloka</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Pembayaran Ditolak</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 20px;">Mohon maaf, pembayaran subscription Anda tidak dapat dikonfirmasi.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Alasan Penolakan</p>
                    <p style="margin: 0; font-size: 15px; color: #3f3f46; line-height: 1.6;">${params.reason}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0;">Jika Anda memiliki pertanyaan, hubungi administrator Sinaloka untuk mendapatkan bantuan.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Dikirim oleh Sinaloka</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSubscriptionPendingPaymentHtml(params: {
    institutionId: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #18181b; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Sinaloka</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <p style="font-size: 17px; color: #18181b; line-height: 1.6; margin: 0 0 16px;">Pembayaran Baru Menunggu Konfirmasi</p>
              <p style="font-size: 15px; color: #3f3f46; line-height: 1.7; margin: 0 0 20px;">Ada pembayaran subscription baru yang menunggu konfirmasi dari Anda.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Detail</p>
                    <p style="margin: 0; font-size: 15px; color: #18181b;"><strong>Institution ID:</strong> ${params.institutionId}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 14px; color: #71717a; line-height: 1.6; margin: 0;">Silakan login ke dashboard Sinaloka untuk meninjau dan mengkonfirmasi pembayaran.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">Dikirim oleh Sinaloka</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
