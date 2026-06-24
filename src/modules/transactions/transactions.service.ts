import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateTransactionDto, profileId: string) {
    const splits = dto.splits ?? [];

    const effectiveSplits = splits.length === 0
      ? [{ amount: dto.amount, categoryId: undefined as string | undefined }]
      : splits;

    const splitsTotal = effectiveSplits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsTotal - dto.amount) > 0.01) {
      throw new BadRequestException(
        `La suma de los splits (${splitsTotal}) debe ser igual al monto total (${dto.amount})`,
      );
    }

    if (dto.type === 'TRANSFER' && !dto.toAccountId) {
      throw new BadRequestException('Las transferencias requieren una cuenta destino');
    }

    if (dto.type === 'LOAN_RECEIVED' && !dto.description) {
      throw new BadRequestException('Los préstamos recibidos requieren una descripción');
    }

    if (dto.type === 'LOAN_GIVEN' && dto.relatedLoanId) {
      const loan = await this.prisma.transaction.findUnique({
        where: { id: dto.relatedLoanId },
      });
      if (!loan || loan.type !== 'LOAN_RECEIVED') {
        throw new BadRequestException('El préstamo relacionado no es válido');
      }
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        householdId: dto.householdId,
        accountId: dto.accountId,
        toAccountId: dto.toAccountId ?? null,
        relatedLoanId: dto.relatedLoanId ?? null,
        createdById: profileId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        transactionDate: new Date(dto.transactionDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        splits: {
          create: effectiveSplits.map((s) => ({
            ...(s.categoryId ? { categoryId: s.categoryId } : {}),
            amount: s.amount,
          })),
        },
      },
      include: {
        splits: { include: { category: true } },
        account: true,
        toAccount: true,
        relatedLoan: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (dto.type === 'EXPENSE') {
      const categoryIds = effectiveSplits
        .map((s) => s.categoryId)
        .filter(Boolean) as string[];
      this.checkBudgetAlerts(dto.householdId, categoryIds, effectiveSplits).catch(() => {});
    }

    return transaction;
  }

  private getPeriodStart(periodType: string, now: Date): Date {
    const d = new Date(now);
    if (periodType === 'MONTHLY') return new Date(d.getFullYear(), d.getMonth(), 1);
    if (periodType === 'WEEKLY') {
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return new Date(d.getFullYear(), 0, 1);
  }

  private async checkBudgetAlerts(
    householdId: string,
    categoryIds: string[],
    splits: { categoryId?: string; amount: number }[],
  ) {
    if (categoryIds.length === 0) return;

    const now = new Date();
    const budgets = await this.prisma.budget.findMany({
      where: { householdId, categoryId: { in: categoryIds }, isActive: true },
    });

    for (const budget of budgets) {
      const periodStart = this.getPeriodStart(budget.periodType, now);

      const { _sum } = await this.prisma.transactionSplit.aggregate({
        _sum: { amount: true },
        where: {
          categoryId: budget.categoryId,
          transaction: {
            householdId,
            type: 'EXPENSE',
            transactionDate: { gte: periodStart },
          },
        },
      });

      const txContribution = splits
        .filter((s) => s.categoryId === budget.categoryId)
        .reduce((sum, s) => sum + s.amount, 0);

      const currTotal = Number(_sum.amount ?? 0);
      const prevTotal = currTotal - txContribution;
      const budgetAmount = Number(budget.amount);
      const prevPct = (prevTotal / budgetAmount) * 100;
      const currPct = (currTotal / budgetAmount) * 100;

      let threshold = 0;
      if (prevPct < 100 && currPct >= 100) threshold = 100;
      else if (prevPct < 80 && currPct >= 80) threshold = 80;

      if (threshold === 0) continue;

      const [members, category] = await Promise.all([
        this.prisma.householdMember.findMany({
          where: { householdId },
          include: { profile: { select: { email: true, fullName: true } } },
        }),
        this.prisma.category.findUnique({ where: { id: budget.categoryId } }),
      ]);

      for (const member of members) {
        await this.emailService.sendBudgetAlertEmail({
          to: member.profile.email,
          fullName: member.profile.fullName ?? 'Usuario',
          categoryName: category?.name ?? 'Categoría',
          percentage: Math.round(currPct),
          threshold,
          budgetAmount,
        });
      }
    }
  }

  async findAll(householdId: string) {
    return this.prisma.transaction.findMany({
      where: { householdId },
      orderBy: { transactionDate: 'desc' },
      include: {
        splits: { include: { category: true } },
        account: true,
        toAccount: true,
        relatedLoan: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findLoansReceived(householdId: string) {
    return this.prisma.transaction.findMany({
      where: { householdId, type: 'LOAN_RECEIVED' },
      orderBy: { transactionDate: 'desc' },
      include: { account: true, loanPayments: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        splits: { include: { category: true } },
        account: true,
        toAccount: true,
        relatedLoan: true,
        loanPayments: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.transaction.delete({ where: { id } });
  }
}
