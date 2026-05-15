import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashed',
        roles: [{ role: { name: 'STRATEGIST' } }],
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.register({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.email).toBe('test@test.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '',
      isActive: true,
      mfaEnabled: false,
      roles: [{ role: { name: 'STRATEGIST' } }],
    };

    beforeEach(async () => {
      mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
    });

    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test@test.com',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect((result as any).user.email).toBe('test@test.com');
      expect((result as any).user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'none@test.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'test@test.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should require MFA code when MFA is enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, mfaEnabled: true, mfaSecret: 'secret' });

      const result = await service.login({
        email: 'test@test.com',
        password: 'Password123!',
      });

      expect(result).toEqual({ requiresMfa: true, userId: 'user-1' });
    });
  });

  describe('refreshTokens', () => {
    it('should rotate refresh tokens', async () => {
      const mockStored = {
        id: 'rt-1',
        token: 'valid-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'user-1',
          email: 'test@test.com',
          roles: [{ role: { name: 'STRATEGIST' } }],
        },
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStored);
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('valid-token');

      expect(result).toHaveProperty('accessToken');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
    });

    it('should reject expired refresh tokens', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      });

      await expect(service.refreshTokens('expired')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject revoked refresh tokens', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(),
      });

      await expect(service.refreshTokens('revoked')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should return same message whether email exists or not', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const r1 = await service.forgotPassword('none@test.com');

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});
      const r2 = await service.forgotPassword('exists@test.com');

      expect(r1.message).toBe(r2.message);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});

      const result = await service.resetPassword('valid-token', 'NewPass123!');
      expect(result.message).toContain('sucesso');
    });

    it('should reject invalid/expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
