import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.profile.create({
      data: {
        authUserId: crypto.randomUUID(),
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: hashedPassword,
        emailVerificationToken: code,
        emailVerificationExpires: expires,
      },
    });

    await this.emailService.sendVerificationEmail(
      dto.email,
      dto.fullName ?? 'Usuario',
      code,
    );

    return { message: 'Código de verificación enviado a tu correo', email: dto.email };
  }

  async verifyEmail(email: string, code: string) {
    const profile = await this.prisma.profile.findUnique({ where: { email } });

    if (!profile) throw new BadRequestException('Correo no encontrado');
    if (profile.emailVerified) throw new BadRequestException('El correo ya fue verificado');
    if (profile.emailVerificationToken !== code) throw new BadRequestException('Código incorrecto');
    if (!profile.emailVerificationExpires || profile.emailVerificationExpires < new Date()) {
      throw new BadRequestException('El código ha expirado');
    }

    const { passwordHash, emailVerificationToken, emailVerificationExpires, ...safeProfile } =
      await this.prisma.profile.update({
        where: { email },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

    const token = this.jwtService.sign({ sub: safeProfile.id, email: safeProfile.email });
    return { token, profile: safeProfile };
  }

  async resendVerification(email: string) {
    const profile = await this.prisma.profile.findUnique({ where: { email } });

    if (!profile) throw new BadRequestException('Correo no encontrado');
    if (profile.emailVerified) throw new BadRequestException('El correo ya fue verificado');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.profile.update({
      where: { email },
      data: { emailVerificationToken: code, emailVerificationExpires: expires },
    });

    await this.emailService.sendVerificationEmail(email, profile.fullName ?? 'Usuario', code);
    return { message: 'Nuevo código enviado' };
  }

  async login(dto: LoginDto) {
    const profile = await this.prisma.profile.findUnique({ where: { email: dto.email } });

    if (!profile) throw new UnauthorizedException('Credenciales inválidas');

    if (!profile.passwordHash) {
      throw new UnauthorizedException('Esta cuenta usa Google para iniciar sesión');
    }

    const valid = await bcrypt.compare(dto.password, profile.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    if (!profile.emailVerified) {
      throw new UnauthorizedException('Debes verificar tu correo antes de iniciar sesión');
    }

    const { passwordHash, emailVerificationToken, emailVerificationExpires, ...safeProfile } = profile;
    const token = this.jwtService.sign({ sub: safeProfile.id, email: safeProfile.email });
    return { token, profile: safeProfile };
  }

  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  }) {
    let profile = await this.prisma.profile.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (!profile) {
      profile = await this.prisma.profile.findUnique({ where: { email: googleUser.email } });

      if (profile) {
        profile = await this.prisma.profile.update({
          where: { id: profile.id },
          data: { googleId: googleUser.googleId, emailVerified: true, avatarUrl: googleUser.avatarUrl },
        });
      } else {
        profile = await this.prisma.profile.create({
          data: {
            authUserId: crypto.randomUUID(),
            email: googleUser.email,
            fullName: googleUser.fullName,
            avatarUrl: googleUser.avatarUrl,
            googleId: googleUser.googleId,
            emailVerified: true,
          },
        });
      }
    }

    const { passwordHash, emailVerificationToken, emailVerificationExpires, ...safeProfile } = profile;
    const token = this.jwtService.sign({ sub: safeProfile.id, email: safeProfile.email });
    return { token, profile: safeProfile };
  }
}
