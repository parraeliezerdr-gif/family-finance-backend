import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateInvitationDto, invitedByProfileId: string) {
    const existing = await this.prisma.invitation.findFirst({
      where: { householdId: dto.householdId, email: dto.email, status: 'PENDING' },
    });

    if (existing) {
      throw new BadRequestException('Ya existe una invitación pendiente para este correo');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invitation, invitedBy] = await Promise.all([
      this.prisma.invitation.create({
        data: { householdId: dto.householdId, email: dto.email, role: dto.role, expiresAt },
        include: { household: { select: { id: true, name: true } } },
      }),
      this.prisma.profile.findUnique({ where: { id: invitedByProfileId }, select: { fullName: true, email: true } }),
    ]);

    await this.emailService.sendInvitationEmail({
      to: dto.email,
      householdName: invitation.household.name,
      invitedByName: invitedBy?.fullName ?? invitedBy?.email ?? 'Un miembro',
      invitationId: invitation.id,
    });

    return invitation;
  }

  async findAll(householdId: string) {
    return this.prisma.invitation.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(id: string, profileId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('La invitación ya fue usada o expiró');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('La invitación ha expirado');
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.email !== invitation.email) {
      throw new BadRequestException(
        'Esta invitación no corresponde a tu correo',
      );
    }

    const alreadyMember = await this.prisma.householdMember.findUnique({
      where: {
        profileId_householdId: {
          profileId,
          householdId: invitation.householdId,
        },
      },
    });

    if (alreadyMember) {
      throw new BadRequestException('Ya eres miembro de este hogar');
    }

    const [member] = await this.prisma.$transaction([
      this.prisma.householdMember.create({
        data: {
          profileId,
          householdId: invitation.householdId,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return member;
  }

  async revoke(id: string) {
    return this.prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }
}
