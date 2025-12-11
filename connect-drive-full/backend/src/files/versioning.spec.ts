import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { FilesService } from './files.service';
import { FileEntity } from './entities/file.entity';
import { FileVersion } from './entities/version.entity';
import { RecycleEntry } from './entities/recycle.entity';
import { User } from '../auth/entities/user.entity';
import { MinioService } from '../minio/minio.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FilesService - Versioning Properties', () => {
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
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVersionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
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
    deleteObject: jest.fn(),
    copyObject: jest.fn(),
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

  /**
   * **Feature: connectdrive-completion, Property 10: File versioning on duplicate names**
   * **Validates: Requirements 2.5**
   */
  describe('Property 10: File versioning on duplicate names', () => {
    it('should create new versions when files with same name are uploaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ownerId: fc.uuid(),
            filename: fc.string({ minLength: 1, maxLength: 50 }),
            folderId: fc.option(fc.uuid(), { nil: null }),
            size: fc.integer({ min: 1, max: 1000000 }),
            mime: fc.constantFrom('image/jpeg', 'text/plain', 'application/pdf'),
            key: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async (fileData) => {
            // Setup mocks
            const mockUser = {
              id: fileData.ownerId,
              storageQuota: 10000000,
              storageUsed: 0,
            };

            const mockExistingFile = {
              id: fc.sample(fc.uuid(), 1)[0],
              ownerId: fileData.ownerId,
              filename: fileData.filename,
              folderId: fileData.folderId,
              isDeleted: false,
              currentVersion: 1,
              size: 500,
              key: 'existing-key',
            };

            const mockVersions = [
              {
                id: fc.sample(fc.uuid(), 1)[0],
                fileId: mockExistingFile.id,
                versionNumber: 1,
                uploadedAt: new Date(),
              },
            ];

            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockFileRepo.findOne
              .mockResolvedValueOnce(mockExistingFile) // First call for duplicate check
              .mockResolvedValue({ ...mockExistingFile, relations: ['versions', 'shares', 'folder'] }); // Subsequent calls
            mockVersionRepo.find.mockResolvedValue(mockVersions);
            mockVersionRepo.create.mockReturnValue({ fileId: mockExistingFile.id, ...fileData });
            mockVersionRepo.save.mockResolvedValue({ id: fc.sample(fc.uuid(), 1)[0] });
            mockFileRepo.update.mockResolvedValue({ affected: 1 });
            mockUserRepo.save.mockResolvedValue(mockUser);
            mockMinioService.copyObject.mockResolvedValue(undefined);

            // Act
            const result = await service.create(fileData);

            // Assert - When duplicate filename is uploaded, it should create a new version
            expect(mockVersionRepo.create).toHaveBeenCalledWith(
              expect.objectContaining({
                fileId: mockExistingFile.id,
                versionNumber: 2, // Should increment version number
                filename: fileData.filename,
                size: fileData.size,
                mime: fileData.mime,
                uploadedBy: fileData.ownerId,
              }),
            );

            expect(mockFileRepo.update).toHaveBeenCalledWith(
              { id: mockExistingFile.id },
              expect.objectContaining({
                currentVersion: 2,
                size: fileData.size,
                key: fileData.key,
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Feature: connectdrive-completion, Property 26: Version listing chronological order**
   * **Validates: Requirements 6.2**
   */
  describe('Property 26: Version listing chronological order', () => {
    it('should return versions in chronological order (newest first)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileId: fc.uuid(),
            versions: fc.array(
              fc.record({
                id: fc.uuid(),
                versionNumber: fc.integer({ min: 1, max: 10 }),
                uploadedAt: fc.date(),
                filename: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              { minLength: 2, maxLength: 5 },
            ),
          }),
          async (testData) => {
            // Setup mocks
            const mockFile = {
              id: testData.fileId,
              isDeleted: false,
            };

            const sortedVersions = [...testData.versions].sort(
              (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
            );

            mockFileRepo.findOne.mockResolvedValue(mockFile);
            mockVersionRepo.find.mockResolvedValue(sortedVersions);

            // Act
            const result = await service.getVersions(testData.fileId);

            // Assert - Versions should be returned in chronological order (newest first)
            expect(mockVersionRepo.find).toHaveBeenCalledWith({
              where: { fileId: testData.fileId },
              order: { uploadedAt: 'DESC' },
            });

            // Verify the order is maintained
            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].uploadedAt.getTime()).toBeGreaterThanOrEqual(
                result[i + 1].uploadedAt.getTime(),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Feature: connectdrive-completion, Property 27: Version restoration**
   * **Validates: Requirements 6.3**
   */
  describe('Property 27: Version restoration', () => {
    it('should restore previous version as new current version', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileId: fc.uuid(),
            versionId: fc.uuid(),
            userId: fc.uuid(),
            currentVersion: fc.integer({ min: 2, max: 10 }),
          }),
          async (testData) => {
            // Setup mocks
            const mockFile = {
              id: testData.fileId,
              ownerId: testData.userId,
              currentVersion: testData.currentVersion,
              size: 1000,
              isDeleted: false,
            };

            const mockVersion = {
              id: testData.versionId,
              fileId: testData.fileId,
              versionNumber: 1,
              key: 'old-version-key',
              filename: 'restored-file.txt',
              size: 800,
              mime: 'text/plain',
            };

            const newKey = `${Date.now()}-restored-file.txt`;

            mockFileRepo.findOne.mockResolvedValue(mockFile);
            mockVersionRepo.findOne.mockResolvedValue(mockVersion);
            mockVersionRepo.create.mockReturnValue({
              fileId: testData.fileId,
              versionNumber: testData.currentVersion + 1,
            });
            mockVersionRepo.save.mockResolvedValue({ id: fc.sample(fc.uuid(), 1)[0] });
            mockFileRepo.update.mockResolvedValue({ affected: 1 });
            mockMinioService.copyObject.mockResolvedValue(undefined);
            mockUserRepo.findOne.mockResolvedValue({ id: testData.userId, storageUsed: 5000 });
            mockUserRepo.save.mockResolvedValue({});

            // Act
            const result = await service.restoreVersion(testData.fileId, testData.versionId, testData.userId);

            // Assert - Version restoration should create new version and update file
            expect(mockMinioService.copyObject).toHaveBeenCalledWith(
              mockVersion.key,
              expect.stringContaining(mockVersion.filename),
            );

            expect(mockVersionRepo.create).toHaveBeenCalledWith(
              expect.objectContaining({
                fileId: testData.fileId,
                versionNumber: testData.currentVersion + 1,
                filename: mockVersion.filename,
                size: mockVersion.size,
                mime: mockVersion.mime,
                uploadedBy: testData.userId,
              }),
            );

            expect(mockFileRepo.update).toHaveBeenCalledWith(
              { id: testData.fileId },
              expect.objectContaining({
                currentVersion: testData.currentVersion + 1,
                filename: mockVersion.filename,
                size: mockVersion.size,
                mime: mockVersion.mime,
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Feature: connectdrive-completion, Property 28: Version limit enforcement**
   * **Validates: Requirements 6.4**
   */
  describe('Property 28: Version limit enforcement', () => {
    it('should enforce maximum 10 versions per file', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileId: fc.uuid(),
            ownerId: fc.uuid(),
            filename: fc.string({ minLength: 1, maxLength: 50 }),
            size: fc.integer({ min: 1, max: 1000 }),
            key: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async (fileData) => {
            // Setup mocks - file with 10 versions (at limit)
            const mockFile = {
              id: fileData.fileId,
              ownerId: fileData.ownerId,
              currentVersion: 10,
              size: 500,
              isDeleted: false,
            };

            const mockVersions = Array.from({ length: 10 }, (_, i) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              fileId: fileData.fileId,
              versionNumber: i + 1,
              key: `version-${i + 1}-key`,
              uploadedAt: new Date(Date.now() - (10 - i) * 1000), // Oldest first
            }));

            const mockUser = {
              id: fileData.ownerId,
              storageQuota: 10000000,
              storageUsed: 5000,
            };

            mockFileRepo.findOne.mockResolvedValue(mockFile);
            mockVersionRepo.find.mockResolvedValue(mockVersions);
            mockVersionRepo.remove.mockResolvedValue({});
            mockVersionRepo.create.mockReturnValue({ fileId: fileData.fileId });
            mockVersionRepo.save.mockResolvedValue({ id: fc.sample(fc.uuid(), 1)[0] });
            mockFileRepo.update.mockResolvedValue({ affected: 1 });
            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockUserRepo.save.mockResolvedValue(mockUser);
            mockMinioService.deleteObject.mockResolvedValue(undefined);

            // Act
            await service.createNewVersion(fileData.fileId, fileData);

            // Assert - Should remove oldest version when at limit
            expect(mockVersionRepo.remove).toHaveBeenCalledWith(mockVersions[9]); // Oldest version
            expect(mockMinioService.deleteObject).toHaveBeenCalledWith(mockVersions[9].key);

            // Should create new version
            expect(mockVersionRepo.create).toHaveBeenCalledWith(
              expect.objectContaining({
                fileId: fileData.fileId,
                versionNumber: 11,
                filename: fileData.filename,
                size: fileData.size,
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});