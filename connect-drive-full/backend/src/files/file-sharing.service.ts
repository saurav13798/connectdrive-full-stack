import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileShareLink, ShareLinkPermission } from './entities/file-share-link.entity';
import { FileEntity } from './entities/file.entity';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class FileSharingService {
  constructor(
    @InjectRepository(FileShareLink)
    private shareLinkRepository: Repository<FileShareLink>,
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
  ) {}

  async createShareLink(
    fileId: string,
    createdBy: string,
    permission: ShareLinkPermission = ShareLinkPermission.VIEW,
    password?: string,
    expiresAt?: Date,
    maxAccess?: number,
  ): Promise<FileShareLink> {
    // Verify file exists and user has access
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.ownerId !== createdBy) {
      throw new ForbiddenException('You can only share your own files');
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const shareLink = this.shareLinkRepository.create({
      fileId,
      createdBy,
      token,
      permission,
      ...(hashedPassword && { password: hashedPassword }),
      ...(expiresAt && { expiresAt }),
      ...(maxAccess && { maxAccess }),
    });

    return this.shareLinkRepository.save(shareLink);
  }

  async getShareLink(token: string, password?: string): Promise<FileShareLink> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token, isActive: true },
      relations: ['file', 'creator'],
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found or expired');
    }

    // Check if expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new ForbiddenException('Share link has expired');
    }

    // Check max access limit
    if (shareLink.maxAccess && shareLink.accessCount >= shareLink.maxAccess) {
      throw new ForbiddenException('Share link access limit reached');
    }

    // Check password if required
    if (shareLink.password) {
      if (!password) {
        throw new ForbiddenException('Password required');
      }

      const isPasswordValid = await bcrypt.compare(password, shareLink.password);
      if (!isPasswordValid) {
        throw new ForbiddenException('Invalid password');
      }
    }

    // Increment access count
    shareLink.accessCount += 1;
    await this.shareLinkRepository.save(shareLink);

    return shareLink;
  }

  async getUserShareLinks(userId: string): Promise<FileShareLink[]> {
    return this.shareLinkRepository.find({
      where: { createdBy: userId, isActive: true },
      relations: ['file'],
      order: { createdAt: 'DESC' },
    });
  }

  async revokeShareLink(token: string, userId: string): Promise<void> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token, createdBy: userId },
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    shareLink.isActive = false;
    await this.shareLinkRepository.save(shareLink);
  }

  async updateShareLink(
    token: string,
    userId: string,
    updates: {
      permission?: ShareLinkPermission;
      password?: string;
      expiresAt?: Date;
      maxAccess?: number;
    },
  ): Promise<FileShareLink> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token, createdBy: userId },
    });

    if (!shareLink) {
      throw new NotFoundException('Share link not found');
    }

    if (updates.permission) {
      shareLink.permission = updates.permission;
    }

    if (updates.password !== undefined) {
      shareLink.password = updates.password ? await bcrypt.hash(updates.password, 10) : null;
    }

    if (updates.expiresAt !== undefined) {
      shareLink.expiresAt = updates.expiresAt;
    }

    if (updates.maxAccess !== undefined) {
      shareLink.maxAccess = updates.maxAccess;
    }

    return this.shareLinkRepository.save(shareLink);
  }
}