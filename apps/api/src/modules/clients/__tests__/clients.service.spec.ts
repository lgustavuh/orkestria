import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from '../clients.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ClientsService', () => {
  let service: ClientsService;
  const mockPrisma = {
    client: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
    clientUser: { create: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ClientsService>(ClientsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create client', async () => {
      mockPrisma.client.create.mockResolvedValue({ id: 'c1', name: 'Test Client' });
      const result = await service.create({ name: 'Test Client', companyName: 'Test Co' });
      expect(result.name).toBe('Test Client');
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPrisma.client.findMany.mockResolvedValue([{ id: 'c1' }]);
      mockPrisma.client.count.mockResolvedValue(1);
      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should search by name/company/email', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);
      await service.findAll({ search: 'almeida' });
      const call = mockPrisma.client.findMany.mock.calls[0][0];
      expect(call.where.OR.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('findOne', () => {
    it('should return client with relations', async () => {
      mockPrisma.client.findUnique.mockResolvedValue({ id: 'c1', name: 'Test', clientUsers: [], projects: [] });
      const result = await service.findOne('c1');
      expect(result.name).toBe('Test');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null);
      await expect(service.findOne('none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addUser', () => {
    it('should link user to client', async () => {
      mockPrisma.clientUser.create.mockResolvedValue({ clientId: 'c1', userId: 'u1', isPrimary: true });
      const result = await service.addUser('c1', 'u1', true);
      expect(result.isPrimary).toBe(true);
    });
  });
});
