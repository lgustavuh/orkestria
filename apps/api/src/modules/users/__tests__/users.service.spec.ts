import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  const mockPrisma = {
    user: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
    userRole: { create: jest.fn(), delete: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u1', roles: [{ role: { name: 'ADMIN' } }] }]);
      mockPrisma.user.count.mockResolvedValue(1);
      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await service.findAll({ role: 'DESIGNER' });
      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.roles).toBeDefined();
    });

    it('should search by name/email', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await service.findAll({ search: 'ana' });
      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR).toHaveLength(3);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should hash password and revoke tokens', async () => {
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});

      const result = await service.changePassword('u1', 'NewPass123!');
      expect(result.message).toContain('alterada');

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      // Password should be hashed, not plain text
      expect(updateCall.data.passwordHash).not.toBe('NewPass123!');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('assignRole', () => {
    it('should create user-role association', async () => {
      mockPrisma.userRole.create.mockResolvedValue({ userId: 'u1', roleId: 'r1', role: { name: 'DESIGNER' } });
      const result = await service.assignRole('u1', 'r1');
      expect(result.role.name).toBe('DESIGNER');
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', isActive: false });
      const result = await service.deactivate('u1');
      expect(result.isActive).toBe(false);
    });
  });
});
