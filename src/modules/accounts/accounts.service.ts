import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        householdId: dto.householdId,
        name: dto.name,
        type: dto.type,
        currencyCode: dto.currencyCode ?? 'COP',
        initialBalance: dto.initialBalance ?? 0,
      },
    });
  }

  async findAll(householdId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { householdId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const income = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            accountId: account.id,
            type: { in: ['INCOME', 'LOAN_RECEIVED'] },
          },
        });

        const expense = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            accountId: account.id,
            type: { in: ['EXPENSE', 'LOAN_GIVEN', 'CREDIT_CARD_PAYMENT'] },
          },
        });

        const totalIncome = Number(income._sum.amount ?? 0);
        const totalExpense = Number(expense._sum.amount ?? 0);
        const currentBalance =
          Number(account.initialBalance) + totalIncome - totalExpense;

        return {
          ...account,
          currentBalance,
        };
      }),
    );

    return accountsWithBalance;
  }
}
