import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as fc from 'fast-check';

import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { FileVersion } from './entities/version.entity';
import { RecycleEntry } from './entities/recycle.entity';
import { User } from '../auth/entities/user.entity';
import { MinioService } from '../minio/minio.service';

describe('FilesService Property Tests', () => {
  let service: FilesService;
  let fileRepo: Repository<FileEntity>;
  let versionRepo: Repository<FileVersion>;
  let recycleRepo: Repository<RecycleEntry>;
  let userRepo: Repository<User>;
  let minioService: MinioService;

  const mockFileRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVersionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRecycleRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockMinioService = {
    presignedPutObject: jest.fn(),
    presignedGetObject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(FileEntity),
          useValue: mockFileRepo,
        },
        {
          provide: getRepositoryToken(FileVersion),
          useValue: mockVersionRepo,
        },
        {
          provide: getRepositoryToken(RecycleEntry),
          useValue: mockRecycleRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    fileRepo = module.get<Repository<FileEntity>>(getRepositoryToken(FileEntity));
    versionRepo = module.get<Repository<FileVersion>>(getRepositoryToken(FileVersion));
    recycleRepo = module.get<Repository<RecycleEntry>>(getRepositoryToken(RecycleEntry));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    minioService = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 7: Upload confirmation creates metadata', () => {
    it('should create file metadata with proper validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ownerId: fc.uuid(),
            filename: fc.string({ minLength: 1, maxLength: 255 }),
            size: fc.integer({ min: 1, max: 1000000000 }),
            mime: fc.constantFrom('image/jpeg', 'text/plain', 'application/pdf', 'video/mp4'),
            key: fc.string({ minLength: 10, maxLength: 500 }),
            folderId: fc.option(fc.uuid()),
          }),
          async (fileData) => {
            // Setup mocks
            const mockUser = {
              id: fileData.ownerId,
              storageQuota: 2000000000,
              storageUsed: 100000000,
            };

            const mockFile = {
              id: fc.sample(fc.uuid(), 1)[0],
              ...fileData,
              currentVersion: 1,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockVersion = {
              id: fc.sample(fc.uuid(), 1)[0],
              fileId: mockFile.id,
              versionNumber: 1,
              key: fileData.key,
              filename: fileData.filename,
              size: fileData.size,
              mime: fileData.mime,
              uploadedBy: fileData.ownerId,
              uploadedAt: new Date(),
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockFileRepo.createQueryBuilder.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: '50000000' }),
            });
            mockFileRepo.create.mockReturnValue(mockFile);
            mockFileRepo.save.mockResolvedValue(mockFile);
            mockVersionRepo.create.mockReturnValue(mockVersion);
            mockVersionRepo.save.mockResolvedValue(mockVersion);

            // Execute
            const result = await service.create(fileData);

            // Verify file creation
            expect(mockFileRepo.create).toHaveBeenCalledWith(fileData);
            expect(mockFileRepo.save).toHaveBeenCalledWith(mockFile);

            // Verify version creation
            expect(mockVersionRepo.create).toHaveBeenCalledWith({
              fileId: mockFile.id,
              versionNumber: 1,
              key: fileData.key,
              filename: fileData.filename,
              size: fileData.size,
              mime: fileData.mime,
              uploadedBy: fileData.ownerId,
            });

            // Verify storage update
            expect(mockUserRepo.save).toHaveBeenCalled();

            // Verify result
            expect(result).toEqual(mockFile);
            expect(result.filename).toBe(fileData.filename);
            expect(result.size).toBe(fileData.size);
            expect(result.ownerId).toBe(fileData.ownerId);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 8: Quota enforcement', () => {
    it('should enforce storage quota limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ownerId: fc.uuid(),
            filename: fc.string({ minLength: 1, maxLength: 255 }),
            size: fc.integer({ min: 1000000000, max: 2000000000 }), // Large file
            mime: fc.constantFrom('video/mp4', 'application/zip'),
            key: fc.string({ minLength: 10, maxLength: 500 }),
            storageQuota: fc.integer({ min: 1000000000, max: 1500000000 }), // Smaller quota
            storageUsed: fc.integer({ min: 500000000, max: 1000000000 }),
          }),
          async (testData) => {
            // Setup user with limited quota
            const mockUser = {
              id: testData.ownerId,
              storageQuota: testData.storageQuota,
              storageUsed: testData.storageUsed,
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockFileRepo.createQueryBuilder.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: testData.storageUsed.toString() }),
            });

            // If file would exceed quota, expect rejection
            if (testData.storageUsed + testData.size > testData.storageQuota) {
              await expect(
                service.create({
                  ownerId: testData.ownerId,
                  filename: testData.filename,
                  size: testData.size,
                  mime: testData.mime,
                  key: testData.key,
                }),
              ).rejects.toThrow(BadRequestException);
            } else {
              // Should succeed if within quota
              const mockFile = {
                id: fc.sample(fc.uuid(), 1)[0],
                ownerId: testData.ownerId,
                filename: testData.filename,
                size: testData.size,
                mime: testData.mime,
                key: testData.key,
                currentVersion: 1,
                isDeleted: false,
              };

              mockFileRepo.create.mockReturnValue(mockFile);
              mockFileRepo.save.mockResolvedValue(mockFile);
              mockVersionRepo.create.mockReturnValue({});
              mockVersionRepo.save.mockResolvedValue({});

              const result = await service.create({
                ownerId: testData.ownerId,
                filename: testData.filename,
                size: testData.size,
                mime: testData.mime,
                key: testData.key,
              });

              expect(result).toBeDefined();
              expect(mockUserRepo.save).toHaveBeenCalled();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 9: Storage accounting', () => {
    it('should accurately track storage usage changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ownerId: fc.uuid(),
            initialUsage: fc.integer({ min: 0, max: 1000000000 }),
            fileSize: fc.integer({ min: 1000, max: 100000000 }),
          }),
          async (testData) => {
            const mockUser = {
              id: testData.ownerId,
              storageQuota: 2000000000,
              storageUsed: testData.initialUsage,
            };

            mockUserRepo.findOne.mockResolvedValue(mockUser);

            // Test storage calculation
            mockFileRepo.createQueryBuilder.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: testData.initialUsage.toString() }),
            });

            const storageUsed = await service.getStorageUsed(testData.ownerId);
            expect(storageUsed).toBe(testData.initialUsage);

            // Test quota check
            const quotaCheck = async () => {
              await service.checkQuota(testData.ownerId, testData.fileSize);
            };

            if (testData.initialUsage + testData.fileSize > mockUser.storageQuota) {
              await expect(quotaCheck()).rejects.toThrow(BadRequestException);
            } else {
              await expect(quotaCheck()).resolves.not.toThrow();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 39: Search result accuracy', () => {
    it('should return accurate search results with proper filtering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ownerId: fc.uuid(),
            searchQuery: fc.string({ minLength: 1, maxLength: 50 }),
            folderId: fc.option(fc.uuid()),
            page: fc.integer({ min: 1, max: 10 }),
            limit: fc.integer({ min: 1, max: 50 }),
          }),
          async (testData) => {
            const mockFiles = fc.sample(
              fc.record({
                id: fc.uuid(),
                filename: fc.string({ minLength: 1, maxLength: 255 }),
                size: fc.integer({ min: 1, max: 1000000 }),
                mime: fc.constantFrom('image/jpeg', 'text/plain', 'application/pdf'),
                ownerId: fc.constant(testData.ownerId),
                isDeleted: fc.constant(false),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              fc.sample(fc.integer({ min: 0, max: 20 }), 1)[0],
            );

            const mockQueryBuilder = {
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(mockFiles.length),
              getMany: jest.fn().mockResolvedValue(mockFiles),
            };

            mockFileRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.search(
              testData.ownerId,
              testData.searchQuery,
              testData.folderId,
              testData.page,
              testData.limit,
            );

            // Verify query builder calls
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('file.ownerId = :ownerId', {
              ownerId: testData.ownerId,
            });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('file.isDeleted = :isDeleted', {
              isDeleted: false,
            });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              '(file.filename ILIKE :query OR file.mime ILIKE :query)',
              { query: `%${testData.searchQuery}%` },
            );

            if (testData.folderId) {
              expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('file.folderId = :folderId', {
                folderId: testData.folderId,
              });
            }

            // Verify pagination
            expect(mockQueryBuilder.skip).toHaveBeenCalledWith((testData.page - 1) * testData.limit);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(testData.limit);

            // Verify result structure
            expect(result).toEqual({
              items: mockFiles,
              total: mockFiles.length,
              page: testData.page,
              limit: testData.limit,
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 46: User ownership verification', () => {
    it('should correctly verify file ownership', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileId: fc.uuid(),
            ownerId: fc.uuid(),
            requesterId: fc.uuid(),
          }),
          async (testData) => {
            const isOwner = testData.ownerId === testData.requesterId;

            if (isOwner) {
              mockFileRepo.findOne.mockResolvedValue({
                id: testData.fileId,
                ownerId: testData.ownerId,
                isDeleted: false,
              });
            } else {
              mockFileRepo.findOne.mockResolvedValue(null);
            }

            const result = await service.verifyOwnership(testData.fileId, testData.requesterId);

            expect(result).toBe(isOwner);
            expect(mockFileRepo.findOne).toHaveBeenCalledWith({
              where: {
                id: testData.fileId,
                ownerId: testData.requesterId,
                isDeleted: false,
              },
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Duplicate filename handling', () => {
    it('should generate unique filenames for duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ownerId: fc.uuid(),
            filename: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 0),
            folderId: fc.option(fc.uuid()),
            existingCount: fc.integer({ min: 0, max: 3 }),
          }),
          async (testData) => {
            // Reset mocks
            mockFileRepo.findOne.mockReset();

            // Mock existing files - first call returns existing file, subsequent calls return null
            if (testData.existingCount > 0) {
              // First call finds existing file
              mockFileRepo.findOne.mockResolvedValueOnce({ filename: testData.filename });
              
              // Subsequent calls for versioned names return null (available)
              for (let i = 1; i <= testData.existingCount + 1; i++) {
                mockFileRepo.findOne.mockResolvedValueOnce(null);
              }
            } else {
              // No existing file
              mockFileRepo.findOne.mockResolvedValueOnce(null);
            }

            const result = await service.handleDuplicateFilename(
              testData.ownerId,
              testData.filename,
              testData.folderId,
            );

            if (testData.existingCount === 0) {
              expect(result).toBe(testData.filename);
            } else {
              expect(result).toContain(testData.filename.split('.')[0]);
              expect(result).toMatch(/\(1\)/);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Presigned URL generation', () => {
    it('should generate valid presigned URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            filename: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length > 0),
            contentType: fc.constantFrom('image/jpeg', 'text/plain', 'application/pdf'),
            ownerId: fc.uuid(),
          }),
          async (testData) => {
            const mockKey = `${fc.sample(fc.uuid(), 1)[0]}-${Date.now()}-${testData.filename}`;
            const mockUrl = `https://minio.example.com/bucket/${mockKey}`;
            
            mockMinioService.presignedPutObject.mockResolvedValue({
              key: mockKey,
              url: mockUrl,
            });

            const result = await service.generatePresignedUploadUrl(
              testData.filename,
              testData.contentType,
              testData.ownerId,
            );

            expect(result.key).toBe(mockKey);
            expect(result.uploadUrl).toBe(mockUrl);
            expect(result.expiresIn).toBe(3600);
            expect(mockMinioService.presignedPutObject).toHaveBeenCalledWith(testData.filename, 3600);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});