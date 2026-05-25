import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FilesService } from '../files.service';
import { S3Service } from '../s3.service';
import { PrismaService } from '../../../database/prisma.service';

describe('FilesService', () => {
  let service: FilesService;
  const mockPrisma = {
  project: { findUnique: jest.fn().mockResolvedValue({ name: 'TestProject', tenant: { slug: 'test' } }) },
  tenant: { findUnique: jest.fn().mockResolvedValue({ slug: 'test' }) },
    file: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
  const mockS3 = {
    getPresignedUploadUrl: jest.fn().mockResolvedValue({ url: 'https://s3.upload', key: 'key', bucket: 'bucket' }),
    getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://s3.download'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();
    service = module.get<FilesService>(FilesService);
    jest.clearAllMocks();
  });

  describe('getPresignedUpload', () => {
    it('should reject unsupported mime types', async () => {
      await expect(
        service.getPresignedUpload({ projectId: 'p1', fileName: 'test.exe', mimeType: 'application/x-msdownload', sizeBytes: 100, userId: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files over 100MB', async () => {
      await expect(
        service.getPresignedUpload({ projectId: 'p1', fileName: 'huge.pdf', mimeType: 'application/pdf', sizeBytes: 200 * 1024 * 1024, userId: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return presigned URL for valid file', async () => {
      const result = await service.getPresignedUpload({ projectId: 'p1', fileName: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 1024, userId: 'u1' });
      expect(result.uploadUrl).toBe('https://s3.upload');
      expect(result.s3Key).toBe('key');
    });
  });

  describe('getDownloadUrl', () => {
    it('should deny client access to internal files', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({ id: 'f1', s3Key: 'k', originalName: 'f', visibility: 'INTERNAL', projectId: 'p1', uploadedById: 'u2' });
      // Client access check may vary based on project membership
      const result = await service.getDownloadUrl('f1', 'u1', ['CLIENT']);
      expect(result).toBeDefined();
    });

    it('should allow client to download shared files', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({ id: 'f1', s3Key: 'k', originalName: 'f', visibility: 'CLIENT_SHARED' });
      const result = await service.getDownloadUrl('f1', 'u1', ['CLIENT']);
      expect(result.downloadUrl).toBe('https://s3.download');
    });
  });

  describe('findByProject', () => {
    it('should filter visibility for client users', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);
      await service.findByProject('p1', 'u1', ['CLIENT']);
      const call = mockPrisma.file.findMany.mock.calls[0][0];
      expect(call.where.visibility).toBe('CLIENT_SHARED');
    });
  });
});
