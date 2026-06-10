import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.transaction.create({
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
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
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
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async findLoansReceived(householdId: string) {
    return this.prisma.transaction.findMany({
      where: {
        householdId,
        type: 'LOAN_RECEIVED',
      },
      orderBy: { transactionDate: 'desc' },
      include: {
        account: true,
        loanPayments: true,
      },
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
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.transaction.delete({ where: { id } });
  }
}
