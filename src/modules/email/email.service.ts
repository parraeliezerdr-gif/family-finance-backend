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

  async sendBudgetAlertEmail(params: {
    to: string; fullName: string; categoryName: string;
    percentage: number; threshold: number; budgetAmount: number;
  }) {
    if (!this.canSend()) return;
    const isExceeded = params.threshold >= 100;
    const color = isExceeded ? '#EF4444' : '#FBBC05';
    const emoji = isExceeded ? '🚨' : '⚠️';
    try {
      await this.resend!.emails.send({
        from: this.from,
        to: params.to,
        subject: `${emoji} Presupuesto ${isExceeded ? 'superado' : 'al ' + params.threshold + '%'}: ${params.categoryName} – Évora`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
          <body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
          <tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#1a1e14;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#A79A64;padding:6px 32px;"><p style="margin:0;color:#1a1e14;font-size:20px;font-weight:bold;letter-spacing:2px;">ÉVORA</p></td></tr>
          <tr><td style="padding:36px 32px;">
            <p style="margin:0 0 8px;color:#F2EFE7;font-size:22px;font-weight:bold;">${emoji} Alerta de presupuesto</p>
            <p style="margin:0 0 20px;color:#a0a08a;font-size:15px;">Hola, <strong style="color:#F2EFE7;">${params.fullName}</strong></p>
            <div style="background:#252b1e;border-left:4px solid ${color};border-radius:4px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0 0 4px;color:#a0a08a;font-size:13px;">Categoría</p>
              <p style="margin:0;color:#F2EFE7;font-size:18px;font-weight:bold;">${params.categoryName}</p>
              <p style="margin:8px 0 0;color:${color};font-size:28px;font-weight:bold;">${params.percentage}%</p>
              <p style="margin:4px 0 0;color:#a0a08a;font-size:13px;">del presupuesto ${isExceeded ? 'superado' : 'utilizado'}</p>
            </div>
            <p style="margin:0;color:#a0a08a;font-size:13px;">Revisa tus gastos en Évora para mantener tus finanzas bajo control.</p>
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid #2a2e25;"><p style="margin:0;color:#5a5a4a;font-size:12px;">© 2025 Évora · Finanzas familiares</p></td></tr>
          </table></td></tr></table></body></html>`,
      });
    } catch (err) { this.logger.error('Error sending budget alert email', err); }
  }

  async sendLoanDueReminderEmail(params: {
    to: string; fullName: string; description: string;
    amount: number; daysLeft: number; dueDate: string;
  }) {
    if (!this.canSend()) return;
    try {
      await this.resend!.emails.send({
        from: this.from,
        to: params.to,
        subject: `⏰ Préstamo próximo a vencer en ${params.daysLeft} días – Évora`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
          <body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
          <tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#1a1e14;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#A79A64;padding:6px 32px;"><p style="margin:0;color:#1a1e14;font-size:20px;font-weight:bold;letter-spacing:2px;">ÉVORA</p></td></tr>
          <tr><td style="padding:36px 32px;">
            <p style="margin:0 0 8px;color:#F2EFE7;font-size:22px;font-weight:bold;">⏰ Recordatorio de préstamo</p>
            <p style="margin:0 0 20px;color:#a0a08a;font-size:15px;">Hola, <strong style="color:#F2EFE7;">${params.fullName}</strong></p>
            <div style="background:#252b1e;border-left:4px solid #FBBC05;border-radius:4px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0 0 4px;color:#a0a08a;font-size:13px;">Préstamo de</p>
              <p style="margin:0;color:#F2EFE7;font-size:18px;font-weight:bold;">${params.description}</p>
              <p style="margin:8px 0 0;color:#A79A64;font-size:26px;font-weight:bold;">$${params.amount.toLocaleString('es-CO')}</p>
              <p style="margin:8px 0 0;color:#FBBC05;font-size:14px;">Vence el ${params.dueDate} · <strong>${params.daysLeft} días restantes</strong></p>
            </div>
            <p style="margin:0;color:#a0a08a;font-size:13px;">Recuerda gestionar este pago antes de la fecha límite.</p>
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid #2a2e25;"><p style="margin:0;color:#5a5a4a;font-size:12px;">© 2025 Évora · Finanzas familiares</p></td></tr>
          </table></td></tr></table></body></html>`,
      });
    } catch (err) { this.logger.error('Error sending loan reminder email', err); }
  }

  async sendGoalAchievedEmail(params: {
    to: string; fullName: string; goalName: string; targetAmount: number;
  }) {
    if (!this.canSend()) return;
    try {
      await this.resend!.emails.send({
        from: this.from,
        to: params.to,
        subject: `🎉 ¡Meta alcanzada! ${params.goalName} – Évora`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
          <body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
          <tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#1a1e14;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#A79A64;padding:6px 32px;"><p style="margin:0;color:#1a1e14;font-size:20px;font-weight:bold;letter-spacing:2px;">ÉVORA</p></td></tr>
          <tr><td style="padding:36px 32px;text-align:center;">
            <p style="margin:0 0 8px;color:#F2EFE7;font-size:28px;font-weight:bold;">🎉 ¡Felicitaciones!</p>
            <p style="margin:0 0 24px;color:#a0a08a;font-size:15px;">Hola, <strong style="color:#F2EFE7;">${params.fullName}</strong>. Tu meta de ahorro fue alcanzada.</p>
            <div style="background:#252b1e;border:1px solid #A79A64;border-radius:8px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#A79A64;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Meta alcanzada</p>
              <p style="margin:0 0 8px;color:#F2EFE7;font-size:24px;font-weight:bold;">${params.goalName}</p>
              <p style="margin:0;color:#10B981;font-size:26px;font-weight:bold;">$${params.targetAmount.toLocaleString('es-CO')} ✓</p>
            </div>
            <p style="margin:0;color:#a0a08a;font-size:13px;">Sigue así, el siguiente objetivo te espera.</p>
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid #2a2e25;"><p style="margin:0;color:#5a5a4a;font-size:12px;">© 2025 Évora · Finanzas familiares</p></td></tr>
          </table></td></tr></table></body></html>`,
      });
    } catch (err) { this.logger.error('Error sending goal achieved email', err); }
  }

  async sendNewMemberEmail(params: {
    to: string; fullName: string; newMemberName: string; householdName: string;
  }) {
    if (!this.canSend()) return;
    try {
      await this.resend!.emails.send({
        from: this.from,
        to: params.to,
        subject: `👥 ${params.newMemberName} se unió a ${params.householdName} – Évora`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
          <body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
          <tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#1a1e14;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#A79A64;padding:6px 32px;"><p style="margin:0;color:#1a1e14;font-size:20px;font-weight:bold;letter-spacing:2px;">ÉVORA</p></td></tr>
          <tr><td style="padding:36px 32px;">
            <p style="margin:0 0 8px;color:#F2EFE7;font-size:22px;font-weight:bold;">👥 Nuevo miembro en el hogar</p>
            <p style="margin:0 0 20px;color:#a0a08a;font-size:15px;">Hola, <strong style="color:#F2EFE7;">${params.fullName}</strong></p>
            <div style="background:#252b1e;border-left:4px solid #A79A64;border-radius:4px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0 0 4px;color:#a0a08a;font-size:13px;">Se unió a <strong style="color:#A79A64;">${params.householdName}</strong></p>
              <p style="margin:0;color:#F2EFE7;font-size:18px;font-weight:bold;">${params.newMemberName}</p>
            </div>
            <p style="margin:0;color:#a0a08a;font-size:13px;">Ya tiene acceso a las finanzas compartidas del hogar.</p>
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid #2a2e25;"><p style="margin:0;color:#5a5a4a;font-size:12px;">© 2025 Évora · Finanzas familiares</p></td></tr>
          </table></td></tr></table></body></html>`,
      });
    } catch (err) { this.logger.error('Error sending new member email', err); }
  }

  async sendMonthlySummaryEmail(params: {
    to: string; fullName: string; householdName: string;
    month: string; income: number; expense: number; net: number;
  }) {
    if (!this.canSend()) return;
    const netColor = params.net >= 0 ? '#10B981' : '#EF4444';
    const netSign = params.net >= 0 ? '+' : '';
    try {
      await this.resend!.emails.send({
        from: this.from,
        to: params.to,
        subject: `📊 Resumen de ${params.month} – ${params.householdName} – Évora`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
          <body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 0;">
          <tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#1a1e14;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#A79A64;padding:6px 32px;"><p style="margin:0;color:#1a1e14;font-size:20px;font-weight:bold;letter-spacing:2px;">ÉVORA</p></td></tr>
          <tr><td style="padding:36px 32px;">
            <p style="margin:0 0 4px;color:#F2EFE7;font-size:22px;font-weight:bold;">📊 Resumen de ${params.month}</p>
            <p style="margin:0 0 24px;color:#a0a08a;font-size:14px;">${params.householdName} · Hola, ${params.fullName}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#252b1e;border-radius:8px;padding:16px;text-align:center;width:30%;">
                  <p style="margin:0 0 4px;color:#a0a08a;font-size:12px;">Ingresos</p>
                  <p style="margin:0;color:#10B981;font-size:18px;font-weight:bold;">$${params.income.toLocaleString('es-CO')}</p>
                </td>
                <td style="width:4%;"></td>
                <td style="background:#252b1e;border-radius:8px;padding:16px;text-align:center;width:30%;">
                  <p style="margin:0 0 4px;color:#a0a08a;font-size:12px;">Gastos</p>
                  <p style="margin:0;color:#EF4444;font-size:18px;font-weight:bold;">$${params.expense.toLocaleString('es-CO')}</p>
                </td>
                <td style="width:4%;"></td>
                <td style="background:#252b1e;border-radius:8px;padding:16px;text-align:center;width:30%;">
                  <p style="margin:0 0 4px;color:#a0a08a;font-size:12px;">Neto</p>
                  <p style="margin:0;color:${netColor};font-size:18px;font-weight:bold;">${netSign}$${params.net.toLocaleString('es-CO')}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#a0a08a;font-size:13px;">Ingresa a Évora para ver el detalle completo de tus finanzas.</p>
          </td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid #2a2e25;"><p style="margin:0;color:#5a5a4a;font-size:12px;">© 2025 Évora · Finanzas familiares</p></td></tr>
          </table></td></tr></table></body></html>`,
      });
    } catch (err) { this.logger.error('Error sending monthly summary email', err); }
  }
}
