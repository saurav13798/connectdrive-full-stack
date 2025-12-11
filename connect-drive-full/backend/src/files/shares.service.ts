import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Share } from './entities/share.entity';
import { FileEntity } from './entities/file.entity';
import { Folder } from './entities/folder.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(Share) private shareRepo: Repository<Share>,
    @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
    @InjectRepository(Folder) private folderRepo: Repository<Folder>,
  ) {}

  async createShare(
    ownerId: string,
    fileId?: string,
    folderId?: string,
    isPublic: boolean = false,
    permissions?: { read: boolean; write: boolean; delete: boolean },
    expiresAt?: Date,
  ): Promise<Share> {
    if (!fileId && !folderId) {
      throw new BadRequestException('Either fileId or folderId must be provided');
    }

    // Validate file or folder exists and belongs to user
    if (fileId) {
      const file = await this.fileRepo.findOne({ where: { id: fileId } });
      if (!file || file.ownerId !== ownerId) {
        throw new NotFoundException('File not found');
      }
    }

    if (folderId) {
      const folder = await this.folderRepo.findOne({ where: { id: folderId } });
      if (!folder || folder.ownerId !== ownerId) {
        throw new NotFoundException('Folder not found');
      }
    }

    const share = this.shareRepo.create({
      fileId,
      folderId,
      createdById: ownerId,
      shareToken: uuidv4(),
      permissions: JSON.stringify(permissions || { read: true, write: false, delete: false }),
      isPublic,
      isActive: true,
      expiresAt,
    });

    return this.shareRepo.save(share);
  }

  async getShare(shareId: string, ownerId: string): Promise<Share> {
    const share = await this.shareRepo.findOne({
      where: { id: shareId, createdById: ownerId },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    return share;
  }

  async listShares(ownerId: string): Promise<Share[]> {
    return this.shareRepo.find({
      where: { createdById: ownerId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getPublicShare(token: string): Promise<Share> {
    const share = await this.shareRepo.findOne({
      where: { shareToken: token, isPublic: true, isActive: true },
    });

    if (!share) {
      throw new NotFoundException('Public share not found or expired');
    }

    // Check if share has expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new BadRequestException('Share link has expired');
    }

    return share;
  }

  async revokeShare(shareId: string, ownerId: string): Promise<void> {
    const share = await this.getShare(shareId, ownerId);
    await this.shareRepo.update(
      { id: shareId },
      { isActive: false },
    );
  }

  async downloadPublicFile(token: string, fileId: string): Promise<Share> {
    const share = await this.getPublicShare(token);

    if (share.fileId !== fileId) {
      throw new BadRequestException('File does not match share');
    }

    const permissions = JSON.parse(share.permissions);
    if (!permissions.read) {
      throw new BadRequestException('You do not have permission to read this file');
    }

    return share;
  }
}
