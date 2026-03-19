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
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      'Sinaloka <noreply@sinaloka.com>';
    this.tutorPortalUrl =
      this.configService.get<string>('TUTOR_PORTAL_URL') ||
      'http://localhost:5173';
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
}
