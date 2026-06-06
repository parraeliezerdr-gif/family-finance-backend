import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        householdId: dto.householdId,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
      },
    });
  }

  async findAll(householdId: string) {
    return this.prisma.category.findMany({
      where: {
        householdId,
        isArchived: false,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ) {
    return this.prisma.category.update({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
  }

  async archive(id: string) {
    return this.prisma.category.update({
      where: {
        id,
      },
      data: {
        isArchived: true,
      },
    });
  }
}