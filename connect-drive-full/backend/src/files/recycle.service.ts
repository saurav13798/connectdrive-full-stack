import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RecycleEntry } from './entities/recycle.entity';
import { FileEntity } from './entities/file.entity';
import { Repository } from 'typeorm';
import { MockMinioService } from '../minio/mock-minio.service';

@Injectable()
export class RecycleService {
  constructor(
    @InjectRepository(RecycleEntry) private recycleRepo: Repository<RecycleEntry>,
    @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
    private minioService: MockMinioService,
  ) {}

  async listRecycleItems(ownerId: string): Promise<RecycleEntry[]> {
    return this.recycleRepo.find({
      where: { ownerId },
      order: { deletedAt: 'DESC' },
    });
  }

  async restoreItem(itemId: string, ownerId: string): Promise<void> {
    const item = await this.recycleRepo.findOne({
      where: { id: itemId, ownerId },
    });

    if (!item) {
      throw new NotFoundException('Item not found in recycle bin');
    }

    // Restore file or folder based on type
    if (item.itemType === 'file' && item.fileId) {
      await this.fileRepo.update(
        { id: item.fileId },
        { isDeleted: false, deletedAt: null },
      );
    }

    // Remove from recycle bin
    await this.recycleRepo.delete({ id: itemId });
  }

  async deleteItemPermanently(itemId: string, ownerId: string): Promise<void> {
    const item = await this.recycleRepo.findOne({
      where: { id: itemId, ownerId },
    });

    if (!item) {
      throw new NotFoundException('Item not found in recycle bin');
    }

    // Delete from MinIO if it's a file
    if (item.itemType === 'file' && item.fileId) {
      const file = await this.fileRepo.findOne({ where: { id: item.fileId } });
      if (file) {
        try {
          await this.minioService.deleteObject(file.key);
        } catch (error) {
          // Log error but continue with DB deletion
          console.error('Failed to delete from MinIO:', error);
        }
        // Delete file from DB
        await this.fileRepo.delete({ id: file.id });
      }
    }

    // Remove from recycle bin
    await this.recycleRepo.delete({ id: itemId });
  }

  async emptyRecycleBin(ownerId: string): Promise<void> {
    const items = await this.recycleRepo.find({ where: { ownerId } });

    for (const item of items) {
      await this.deleteItemPermanently(item.id, ownerId);
    }
  }

  async cleanupExpiredItems(): Promise<void> {
    const now = new Date();
    const expiredItems = await this.recycleRepo
      .createQueryBuilder('recycle')
      .where('recycle.expiresAt <= :now', { now })
      .getMany();

    for (const item of expiredItems) {
      try {
        await this.deleteItemPermanently(item.id, item.ownerId);
      } catch (error) {
        // Log error but continue with other items
        console.error('Failed to cleanup expired item:', error);
      }
    }
  }
}
