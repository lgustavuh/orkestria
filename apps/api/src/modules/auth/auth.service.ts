import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_DAYS = 7;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto, tenantId?: string | null) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já cadastrado');

    // Prevent ADMIN role assignment via registration
    if (dto.roleIds?.length) {
      const adminRole = await this.prisma.role.findFirst({ where: { name: 'ADMIN' } });
      if (adminRole && dto.roleIds.includes(adminRole.id)) {
        throw new BadRequestException('Não é permitido atribuir a role ADMIN via registro');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        tenantId: tenantId || undefined,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roles: { create: dto.roleIds?.map((roleId) => ({ roleId })) || [] },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        resource: 'user',
        resourceId: user.id,
        details: { email: user.email },
      },
    });

    return this.sanitizeUser(user);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Credenciais inválidas');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciais inválidas');

    if (user.mfaEnabled) {
      if (!dto.mfaCode) return { requiresMfa: true, userId: user.id };
      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: dto.mfaCode,
        window: 1,
      });
      if (!isValid) throw new UnauthorizedException('Código MFA inválido');
    }

    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', resource: 'session', ipAddress, userAgent },
    });

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(stored.user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.auditLog.create({
      data: { userId, action: 'LOGOUT', resource: 'session' },
    });
  }

  async enableMfa(userId: string) {
    const secret = speakeasy.generateSecret({ name: `Orkestria:${userId}`, issuer: 'Orkestria' });
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret.base32 } });
    return { secret: secret.base32, otpauthUrl: secret.otpauth_url };
  }

  async verifyAndActivateMfa(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('MFA não foi iniciado');

    const isValid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token, window: 1 });
    if (!isValid) throw new BadRequestException('Código MFA inválido');

    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { mfaEnabled: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'Se o email existir, enviaremos instruções de recuperação' };

    const resetToken = uuid();
    const expires = new Date(Date.now() + 3600000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: resetToken, passwordResetExpires: expires },
    });

    return { message: 'Se o email existir, enviaremos instruções de recuperação' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('Token inválido ou expirado');

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  private async generateTokens(user: any) {
    const roles = user.roles?.map((ur: any) => ur.role.name) || [];
    const payload: JwtPayload = { sub: user.id, email: user.email, roles };
    const accessToken = this.jwt.sign(payload);

    const refreshToken = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_DAYS);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, mfaSecret, passwordResetToken, passwordResetExpires, ...safe } = user;
    return { ...safe, roles: user.roles?.map((ur: any) => ur.role.name) || [] };
  }
}
