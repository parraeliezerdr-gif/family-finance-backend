import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHouseholdDto } from './dto/create-household.dto';

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateHouseholdDto) {
    return this.prisma.household.create({
      data: {
        name: dto.name,
      },
    });
  }

  async findAll() {
    return this.prisma.household.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}