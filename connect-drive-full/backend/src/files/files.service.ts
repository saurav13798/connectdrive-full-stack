import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileVersion } from './entities/version.entity';
import { RecycleEntry } from './entities/recycle.entity';
import { User } from '../auth/entities/user.entity';
import { Repository, Like, ILike } from 'typeorm';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
    @InjectRepository(FileVersion) private versionRepo: Repository<FileVersion>,
    @InjectRepository(RecycleEntry) private recycleRepo: Repository<RecycleEntry>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private minioService: MinioService,
  ) {}

  async create(metadata: Partial<FileEntity>): Promise<FileEntity> {
    // Check storage quota
    await this.checkQuota(metadata.ownerId, metadata.size);

    // Check for duplicate filename and handle versioning
    const existingFile = await this.fileRepo.findOne({
      where: {
        ownerId: metadata.ownerId,
        filename: metadata.filename,
        folderId: metadata.folderId || null,
        isDeleted: false,
      },
    });

    if (existingFile) {
      // Create new version for existing file
      return this.createNewVersion(existingFile.id, metadata);
    }

    const file = this.fileRepo.create(metadata);
    const savedFile = await this.fileRepo.save(file);

    // Create first version
    await this.createVersion(savedFile.id, {
      versionNumber: 1,
      key: metadata.key,
      filename: metadata.filename,
      size: metadata.size,
      mime: metadata.mime,
      uploadedBy: metadata.ownerId,
    });

    // Update user storage
    await this.updateStorageUsed(metadata.ownerId, metadata.size);

    return savedFile;
  }

  async listByOwner(
    ownerId: string,
    folderId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: FileEntity[]; total: number; page: number; limit: number }> {
    const query = this.fileRepo.createQueryBuilder('file')
      .where('file.ownerId = :ownerId', { ownerId })
      .andWhere('file.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('file.createdAt', 'DESC');

    if (folderId) {
      query.andWhere('file.folderId = :folderId', { folderId });
    } else {
      query.andWhere('file.folderId IS NULL');
    }

    const total = await query.getCount();
    const items = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<FileEntity> {
    const file = await this.fileRepo.findOne({
      where: { id },
      relations: ['versions', 'shares', 'folder'],
    });

    if (!file || file.isDeleted) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async createVersion(fileId: string, data: Partial<FileVersion>): Promise<FileVersion> {
    const version = this.versionRepo.create({
      fileId,
      uploadedAt: new Date(),
      ...data,
    });
    return this.versionRepo.save(version);
  }

  async createNewVersion(fileId: string, metadata: Partial<FileEntity>): Promise<FileEntity> {
    const file = await this.findOne(fileId);
    
    // Check storage quota for new version
    await this.checkQuota(metadata.ownerId, metadata.size);

    // Get current version count and enforce limit (max 10 versions)
    const versions = await this.getVersions(fileId);
    if (versions.length >= 10) {
      // Remove oldest version
      const oldestVersion = versions[versions.length - 1];
      await this.versionRepo.remove(oldestVersion);
      
      // Clean up old version from MinIO
      try {
        await this.minioService.deleteObject(oldestVersion.key);
      } catch (error) {
        this.logger.warn(`Failed to delete old version from MinIO: ${error.message}`);
      }
    }

    // Create new version
    const newVersionNumber = file.currentVersion + 1;
    await this.createVersion(fileId, {
      versionNumber: newVersionNumber,
      key: metadata.key,
      filename: metadata.filename,
      size: metadata.size,
      mime: metadata.mime,
      uploadedBy: metadata.ownerId,
    });

    // Update file metadata
    await this.fileRepo.update(
      { id: fileId },
      {
        currentVersion: newVersionNumber,
        size: metadata.size,
        key: metadata.key,
        updatedAt: new Date(),
      },
    );

    // Update user storage (difference between old and new size)
    const sizeDifference = metadata.size - file.size;
    await this.updateStorageUsed(metadata.ownerId, sizeDifference);

    return this.findOne(fileId);
  }

  async getVersions(fileId: string): Promise<FileVersion[]> {
    const file = await this.findOne(fileId);
    return this.versionRepo.find({
      where: { fileId },
      order: { uploadedAt: 'DESC' },
    });
  }

  async softDelete(fileId: string, userId: string): Promise<void> {
    const file = await this.findOne(fileId);

    // Move to recycle bin
    const recycleEntry = this.recycleRepo.create({
      ownerId: userId,
      fileId: file.id,
      itemName: file.filename,
      itemType: 'file',
      size: file.size,
      deletedBy: userId,
      deletedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await this.recycleRepo.save(recycleEntry);

    // Mark file as deleted
    await this.fileRepo.update(
      { id: fileId },
      { isDeleted: true, deletedAt: new Date() },
    );

    // Update user storage
    await this.updateStorageUsed(userId, -file.size);
  }

  async restoreVersion(fileId: string, versionId: string, userId: string): Promise<FileEntity> {
    const file = await this.findOne(fileId);
    const version = await this.versionRepo.findOne({ where: { id: versionId, fileId } });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Verify ownership
    if (file.ownerId !== userId) {
      throw new ForbiddenException('Access denied to this file');
    }

    // Copy the old version's object in MinIO to create a new version
    const newKey = `${Date.now()}-${version.filename}`;
    try {
      await this.minioService.copyObject(version.key, newKey);
    } catch (error) {
      this.logger.error(`Failed to copy version in MinIO: ${error.message}`);
      throw new BadRequestException('Failed to restore version');
    }

    // Create new version based on old version
    const newVersionNumber = file.currentVersion + 1;
    await this.createVersion(fileId, {
      versionNumber: newVersionNumber,
      key: newKey,
      filename: version.filename,
      size: version.size,
      mime: version.mime,
      uploadedBy: userId,
    });

    // Update file metadata
    await this.fileRepo.update(
      { id: fileId },
      {
        currentVersion: newVersionNumber,
        filename: version.filename,
        size: version.size,
        key: newKey,
        mime: version.mime,
        updatedAt: new Date(),
      },
    );

    // Update user storage (difference between old and new size)
    const sizeDifference = version.size - file.size;
    await this.updateStorageUsed(userId, sizeDifference);

    this.logger.log(`Version ${versionId} restored for file ${fileId} as version ${newVersionNumber}`);
    return this.findOne(fileId);
  }

  async getStorageUsed(ownerId: string): Promise<number> {
    const result = await this.fileRepo
      .createQueryBuilder('file')
      .select('SUM(file.size)', 'total')
      .where('file.ownerId = :ownerId', { ownerId })
      .andWhere('file.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    return parseInt(result.total) || 0;
  }

  async checkQuota(ownerId: string, fileSize: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const used = await this.getStorageUsed(ownerId);
    if (used + fileSize > user.storageQuota) {
      throw new BadRequestException('Storage quota exceeded');
    }
  }

  private async updateStorageUsed(ownerId: string, delta: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (user) {
      user.storageUsed = Math.max(0, user.storageUsed + delta);
      await this.userRepo.save(user);
    }
  }

  async delete(fileId: string, userId: string): Promise<void> {
    await this.softDelete(fileId, userId);
  }

  async search(
    ownerId: string,
    query: string,
    folderId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: FileEntity[]; total: number; page: number; limit: number }> {
    this.logger.log(`Searching files for user ${ownerId} with query: ${query}`);

    const queryBuilder = this.fileRepo.createQueryBuilder('file')
      .where('file.ownerId = :ownerId', { ownerId })
      .andWhere('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('(file.filename ILIKE :query OR file.mime ILIKE :query)', { query: `%${query}%` })
      .orderBy('file.createdAt', 'DESC');

    if (folderId) {
      queryBuilder.andWhere('file.folderId = :folderId', { folderId });
    }

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    this.logger.log(`Found ${total} files matching search query`);
    return { items, total, page, limit };
  }

  async generatePresignedUploadUrl(
    filename: string,
    contentType: string,
    ownerId: string,
  ): Promise<{ key: string; uploadUrl: string; expiresIn: number }> {
    this.logger.log(`Generating presigned upload URL for ${filename} by user ${ownerId}`);

    try {
      const { key, url } = await this.minioService.presignedPutObject(filename, 3600);
      
      this.logger.log(`Generated presigned upload URL for key: ${key}`);
      return {
        key,
        uploadUrl: url,
        expiresIn: 3600,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned upload URL: ${error.message}`);
      throw new BadRequestException('Failed to generate upload URL');
    }
  }

  async generatePresignedDownloadUrl(
    fileId: string,
    userId: string,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    this.logger.log(`Generating presigned download URL for file ${fileId} by user ${userId}`);

    const file = await this.findOne(fileId);

    // Check ownership or share permissions
    if (file.ownerId !== userId) {
      // TODO: Check if file is shared with user
      throw new ForbiddenException('Access denied to this file');
    }

    try {
      const downloadUrl = await this.minioService.presignedGetObject(file.key, 3600);
      
      this.logger.log(`Generated presigned download URL for file: ${file.filename}`);
      return {
        downloadUrl,
        expiresIn: 3600,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned download URL: ${error.message}`);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  async generateVersionDownloadUrl(
    fileId: string,
    versionId: string,
    userId: string,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    this.logger.log(`Generating presigned download URL for version ${versionId} of file ${fileId} by user ${userId}`);

    const file = await this.findOne(fileId);
    const version = await this.versionRepo.findOne({ where: { id: versionId, fileId } });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Check ownership or share permissions
    if (file.ownerId !== userId) {
      // TODO: Check if file is shared with user
      throw new ForbiddenException('Access denied to this file');
    }

    try {
      const downloadUrl = await this.minioService.presignedGetObject(version.key, 3600);
      
      this.logger.log(`Generated presigned download URL for version: ${version.filename} v${version.versionNumber}`);
      return {
        downloadUrl,
        expiresIn: 3600,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned download URL for version: ${error.message}`);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  async verifyOwnership(fileId: string, userId: string): Promise<boolean> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId, ownerId: userId, isDeleted: false },
    });
    return !!file;
  }

  async handleDuplicateFilename(
    ownerId: string,
    filename: string,
    folderId?: string,
  ): Promise<string> {
    const existingFile = await this.fileRepo.findOne({
      where: {
        ownerId,
        filename,
        folderId: folderId || null,
        isDeleted: false,
      },
    });

    if (!existingFile) {
      return filename;
    }

    // Generate versioned filename
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

    let counter = 1;
    let newFilename: string;

    do {
      newFilename = `${name} (${counter})${extension}`;
      counter++;

      const duplicate = await this.fileRepo.findOne({
        where: {
          ownerId,
          filename: newFilename,
          folderId: folderId || null,
          isDeleted: false,
        },
      });

      if (!duplicate) {
        break;
      }
    } while (counter < 100); // Prevent infinite loop

    this.logger.log(`Generated unique filename: ${newFilename} for original: ${filename}`);
    return newFilename;
  }
}
