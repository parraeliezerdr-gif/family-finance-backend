import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend | null = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
  private readonly from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  private readonly logger = new Logger(EmailService.name);

  private canSend(): boolean {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY no configurada — correo omitido');
      return false;
    }
    return true;
  }

  async sendVerificationEmail(to: string, fullName: string, code: string) {
    if (!this.canSend()) return;
    try {
      await this.resend!.emails.send({
        from: this.from,
        to,
        subject: 'Verifica tu cuenta – Évora',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8" /></head>
          <body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
              <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1e14;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="background:#A79A64;padding:6px 32px;">
                      <p style="margin:0;color:#1a1e14;font-size:20px;font-weight:bold;letter-spacing:2px;">ÉVORA</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:36px 32px;">
                      <p style="margin:0 0 8px;color:#F2EFE7;font-size:22px;font-weight:bold;">Hola, ${fullName} 👋</p>
                      <p style="margin:0 0 24px;color:#a0a08a;font-size:15px;">Usa este código para verificar tu cuenta:</p>
                      <div style="background:#252b1e;border:1px solid #A79A64;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#A79A64;">${code}</span>
                      </div>
                      <p style="margin:0;color:#a0a08a;font-size:13px;">Este código expira en <strong style="color:#F2EFE7;">15 minutos</strong>. Si no creaste esta cuenta, ignora este correo.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px;border-top:1px solid #2a2e25;">
                      <p style="margin:0;color:#5a5a4a;font-size:12px;">© 2025 Évora · Finanzas familiares</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (err) {
      this.logger.error('Error sending verification email', err);
    }
  }

  async sendInvitationEmail(params: {
    to: string;
    householdName: string;
    invitedByName: string;
    invitationId: string;
  }) {
    if (!this.canSend()) return;
    const link = `${this.frontendUrl}/invite/${params.invitationId}`;
    try {
      await this.resend!.emails.send({
        from: this.from,
        to: params.to,
        subject: `${params.invitedByName} te invitó a ${params.householdName} – Évora`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8" /></head>
          <body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
              <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1e14;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="background:#A79A64;padding:6px 32px;">
                      <p style="margin:0;color:#1a1e14;font-size:20px;font-weight:bold;letter-spacing:2px;">ÉVORA</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:36px 32px;">
                      <p style="margin:0 0 8px;color:#F2EFE7;font-size:22px;font-weight:bold;">Tienes una invitación 🏠</p>
                      <p style="margin:0 0 24px;color:#a0a08a;font-size:15px;">
                        <strong style="color:#F2EFE7;">${params.invitedByName}</strong> te invitó a unirte al hogar
                        <strong style="color:#A79A64;">${params.householdName}</strong> en Évora.
                      </p>
                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="${link}" style="display:inline-block;background:#A79A64;color:#1a1e14;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Aceptar invitación</a>
                      </div>
                      <p style="margin:0;color:#a0a08a;font-size:13px;">Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px;border-top:1px solid #2a2e25;">
                      <p style="margin:0;color:#5a5a4a;font-size:12px;">© 2025 Évora · Finanzas familiares</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (err) {
      this.logger.error('Error sending invitation email', err);
    }
  }
}
