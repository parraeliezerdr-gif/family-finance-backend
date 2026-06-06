import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransactionDto, profileId: string) {
    const splitsTotal = dto.splits.reduce((sum, s) => sum + s.amount, 0);

    if (Math.abs(splitsTotal - dto.amount) > 0.01) {
      throw new BadRequestException(
        `La suma de los splits (${splitsTotal}) debe ser igual al monto total (${dto.amount})`,
      );
    }

    return this.prisma.transaction.create({
      data: {
        householdId: dto.householdId,
        accountId: dto.accountId,
        createdById: profileId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        transactionDate: new Date(dto.transactionDate),
        splits: {
          create: dto.splits.map((s) => ({
            categoryId: s.categoryId,
            amount: s.amount,
          })),
        },
      },
      include: {
        splits: {
          include: {
            category: true,
          },
        },
        account: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(householdId: string) {
    return this.prisma.transaction.findMany({
      where: { householdId },
      orderBy: { transactionDate: 'desc' },
      include: {
        splits: {
          include: {
            category: true,
          },
        },
        account: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        splits: {
          include: {
            category: true,
          },
        },
        account: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }
}
