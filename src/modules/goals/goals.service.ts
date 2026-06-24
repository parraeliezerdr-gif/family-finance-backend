import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateGoalDto } from './dto/create-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        householdId: dto.householdId,
        name: dto.name,
        description: dto.description,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount ?? 0,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
    });
  }

  async findAll(householdId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { householdId, status: 'IN_PROGRESS' },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((goal) => {
      const percentage = Math.round(
        (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100,
      );
      return { ...goal, percentage };
    });
  }

  async addAmount(id: string, amount: number) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new Error('Meta no encontrada');

    const newAmount = Number(goal.currentAmount) + amount;
    const isCompleted = newAmount >= Number(goal.targetAmount);

    const updated = await this.prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });

    if (isCompleted) {
      this.notifyGoalAchieved(goal.householdId, goal.name, Number(goal.targetAmount)).catch(() => {});
    }

    return updated;
  }

  private async notifyGoalAchieved(householdId: string, goalName: string, targetAmount: number) {
    const members = await this.prisma.householdMember.findMany({
      where: { householdId },
      include: { profile: { select: { email: true, fullName: true } } },
    });

    for (const member of members) {
      await this.emailService.sendGoalAchievedEmail({
        to: member.profile.email,
        fullName: member.profile.fullName ?? 'Usuario',
        goalName,
        targetAmount,
      });
    }
  }

  async remove(id: string) {
    return this.prisma.goal.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
