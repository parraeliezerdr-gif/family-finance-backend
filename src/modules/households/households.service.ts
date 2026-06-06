import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHouseholdDto } from './dto/create-household.dto';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHouseholdDto, profileId: string) {
    return this.prisma.household.create({
      data: {
        name: dto.name,
        members: {
          create: {
            profileId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            profile: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(profileId: string) {
    return this.prisma.household.findMany({
      where: {
        members: {
          some: { profileId },
        },
      },
      include: {
        members: {
          include: {
            profile: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.household.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            profile: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
