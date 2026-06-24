import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Every day at 9am: check loans due in the next 7 days
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLoanDueReminders() {
    this.logger.log('Checking loan due reminders...');

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const loans = await this.prisma.transaction.findMany({
      where: {
        type: 'LOAN_RECEIVED',
        dueDate: { gte: tomorrow, lte: in7Days },
      },
      include: {
        createdBy: { select: { email: true, fullName: true } },
      },
    });

    for (const loan of loans) {
      const daysLeft = Math.ceil(
        (loan.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      await this.emailService.sendLoanDueReminderEmail({
        to: loan.createdBy.email,
        fullName: loan.createdBy.fullName ?? 'Usuario',
        description: loan.description ?? 'Préstamo',
        amount: Number(loan.amount),
        daysLeft,
        dueDate: loan.dueDate!.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      });
    }

    this.logger.log(`Sent ${loans.length} loan due reminders`);
  }

  // 1st of every month at 8am: send monthly summary
  @Cron('0 8 1 * *')
  async sendMonthlySummaries() {
    this.logger.log('Sending monthly summaries...');

    const now = new Date();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const monthName = prevMonthStart.toLocaleString('es-CO', { month: 'long', year: 'numeric' });

    const households = await this.prisma.household.findMany({
      include: {
        members: {
          include: { profile: { select: { email: true, fullName: true } } },
        },
      },
    });

    for (const household of households) {
      const transactions = await this.prisma.transaction.findMany({
        where: {
          householdId: household.id,
          transactionDate: { gte: prevMonthStart, lte: prevMonthEnd },
          type: { in: ['INCOME', 'EXPENSE'] },
        },
      });

      const income = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      if (income === 0 && expense === 0) continue;

      for (const member of household.members) {
        await this.emailService.sendMonthlySummaryEmail({
          to: member.profile.email,
          fullName: member.profile.fullName ?? 'Usuario',
          householdName: household.name,
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          income,
          expense,
          net: income - expense,
        });
      }
    }

    this.logger.log(`Sent summaries for ${households.length} households`);
  }
}
