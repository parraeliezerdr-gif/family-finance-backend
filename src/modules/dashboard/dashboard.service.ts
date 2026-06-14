import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(householdId: string) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [accounts, incomeAgg, expenseAgg, recentTransactions, budgets, goals, loans] =
      await Promise.all([
        this.prisma.account.findMany({
          where: { householdId, isActive: true },
          select: {
            id: true,
            name: true,
            type: true,
            initialBalance: true,
            currencyCode: true,
          },
        }),

        // Solo ingresos reales, sin préstamos
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            householdId,
            type: 'INCOME',
            transactionDate: { gte: firstOfMonth, lte: lastOfMonth },
          },
        }),

        // Solo gastos reales, sin préstamos ni transferencias
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            householdId,
            type: 'EXPENSE',
            transactionDate: { gte: firstOfMonth, lte: lastOfMonth },
          },
        }),

        this.prisma.transaction.findMany({
          where: {
            householdId,
            type: { notIn: ['TRANSFER'] },
          },
          orderBy: { transactionDate: 'desc' },
          take: 5,
          include: {
            splits: { include: { category: true } },
            account: { select: { id: true, name: true } },
            toAccount: { select: { id: true, name: true } },
            relatedLoan: true,
            createdBy: { select: { id: true, fullName: true } },
          },
        }),

        this.prisma.budget.findMany({
          where: { householdId, isActive: true },
          include: { category: true },
        }),

        this.prisma.goal.findMany({
          where: { householdId, status: 'IN_PROGRESS' },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),

        // Préstamos recibidos pendientes
        this.prisma.transaction.findMany({
          where: {
            householdId,
            type: 'LOAN_RECEIVED',
          },
          orderBy: { transactionDate: 'desc' },
          include: {
            loanPayments: true,
          },
        }),
      ]);

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

        const transferOut = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { accountId: account.id, type: 'TRANSFER' },
        });

        const transferIn = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { toAccountId: account.id, type: 'TRANSFER' },
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

    const totalBalance = accountsWithBalance.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);

    const topCategoriesRaw: Array<{ categoryId: string; spent: string }> =
      await this.prisma.$queryRawUnsafe(`
        SELECT
          ts."categoryId",
          SUM(ts.amount) as spent
        FROM transaction_splits ts
        INNER JOIN transactions t ON t.id = ts."transactionId"
        WHERE
          t."householdId" = '${householdId}'
          AND t.type = 'EXPENSE'
          AND ts."categoryId" IS NOT NULL
          AND t."transactionDate" >= '${firstOfMonth.toISOString()}'
          AND t."transactionDate" <= '${lastOfMonth.toISOString()}'
        GROUP BY ts."categoryId"
        ORDER BY spent DESC
        LIMIT 5
      `);

    const categoryIds = topCategoriesRaw.map((c) => c.categoryId).filter(Boolean);
    const categoryDetails = categoryIds.length > 0
      ? await this.prisma.category.findMany({ where: { id: { in: categoryIds } } })
      : [];

    const topCategoriesWithDetails = topCategoriesRaw
      .map((tc) => {
        const detail = categoryDetails.find((c) => c.id === tc.categoryId);
        if (!detail) return null;
        return { category: detail, spent: Number(tc.spent) };
      })
      .filter(Boolean);

    const budgetsWithProgress = await Promise.all(
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

    const goalsWithProgress = goals.map((goal) => {
      const percentage = Math.round(
        (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100,
      );
      return { ...goal, percentage };
    });

    // Calcular préstamos con saldo pendiente
    const loansWithBalance = loans.map((loan) => {
      const totalPaid = loan.loanPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const totalAmount = Number(loan.amount);
      const pending = totalAmount - totalPaid;
      const percentage = Math.round((totalPaid / totalAmount) * 100);
      return {
        id: loan.id,
        description: loan.description,
        amount: totalAmount,
        paid: totalPaid,
        pending,
        percentage,
        dueDate: loan.dueDate,
        transactionDate: loan.transactionDate,
      };
    }).filter((l) => l.pending > 0);

    return {
      balance: {
        total: totalBalance,
        accounts: accountsWithBalance,
      },
      currentMonth: {
        income: totalIncome,
        expense: totalExpense,
        net: totalIncome - totalExpense,
      },
      topCategories: topCategoriesWithDetails,
      recentTransactions,
      budgets: budgetsWithProgress,
      goals: goalsWithProgress,
      loans: loansWithBalance,
    };
  }
}
