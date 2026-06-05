import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        householdId: dto.householdId,
        name: dto.name,
        type: dto.type,
        currencyCode: dto.currencyCode,
        initialBalance: dto.initialBalance,
      },
    });
  }

  async findAll() {
    return this.prisma.account.findMany({
      include: {
        household: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}