import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { passwordHash, ...profile } = await this.prisma.profile.create({
      data: {
        authUserId: crypto.randomUUID(),
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: hashedPassword,
      },
    });

    const token = this.jwtService.sign({
      sub: profile.id,
      email: profile.email,
    });

    return { token, profile };
  }

  async login(dto: LoginDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { email: dto.email },
    });

    if (!profile) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, profile.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { passwordHash, ...safeProfile } = profile;

    const token = this.jwtService.sign({
      sub: safeProfile.id,
      email: safeProfile.email,
    });

    return { token, profile: safeProfile };
  }
}