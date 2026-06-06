import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: {
        householdId: dto.householdId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        periodType: dto.periodType ?? 'MONTHLY',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(householdId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { householdId, isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.prisma.transactionSplit.aggregate({
          _sum: { amount: true },
          where: {
            categoryId: budget.categoryId,
            transaction: {
              householdId,
              transactionDate: { gte: firstOfMonth },
              type: 'EXPENSE',
            },
          },
        });

        const spentAmount = Number(spent._sum.amount ?? 0);
        const budgetAmount = Number(budget.amount);
        const percentage = Math.round((spentAmount / budgetAmount) * 100);

        return {
          ...budget,
          spent: spentAmount,
          available: budgetAmount - spentAmount,
          percentage,
        };
      }),
    );

    return result;
  }

  async remove(id: string) {
    return this.prisma.budget.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
