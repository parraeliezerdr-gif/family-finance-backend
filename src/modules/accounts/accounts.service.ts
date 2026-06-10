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
        // Ingresos y préstamos recibidos
        const income = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            accountId: account.id,
            type: { in: ['INCOME', 'LOAN_RECEIVED'] },
          },
        });

        // Gastos y préstamos dados
        const expense = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            accountId: account.id,
            type: { in: ['EXPENSE', 'LOAN_GIVEN', 'CREDIT_CARD_PAYMENT'] },
          },
        });

        // Transferencias salientes (cuenta origen)
        const transferOut = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            accountId: account.id,
            type: 'TRANSFER',
          },
        });

        // Transferencias entrantes (cuenta destino)
        const transferIn = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            toAccountId: account.id,
            type: 'TRANSFER',
          },
        });

        const currentBalance =
          Number(account.initialBalance) +
          Number(income._sum.amount ?? 0) -
          Number(expense._sum.amount ?? 0) -
          Number(transferOut._sum.amount ?? 0) +
          Number(transferIn._sum.amount ?? 0);

        return { ...account, currentBalance };
      }),
    );

    return accountsWithBalance;
  }
}
