import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Folder } from './entities/folder.entity';
import { FileEntity } from './entities/file.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder) private folderRepo: Repository<Folder>,
    @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
  ) {}

  async createFolder(ownerId: string, name: string, parentId?: string): Promise<Folder> {
    // Validate parent exists if provided
    if (parentId) {
      const parent = await this.folderRepo.findOne({
        where: { id: parentId, ownerId, isDeleted: false },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const folder = this.folderRepo.create({
      name,
      ownerId,
      parentId: parentId || null,
      isDeleted: false,
    });

    return this.folderRepo.save(folder);
  }

  async getFolder(id: string, ownerId: string): Promise<Folder> {
    const folder = await this.folderRepo.findOne({
      where: { id, ownerId, isDeleted: false },
      relations: ['children', 'files'],
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  async getFolderTree(parentId: string | null, ownerId: string): Promise<any> {
    const folders = await this.folderRepo.find({
      where: {
        parentId: parentId || null,
        ownerId,
        isDeleted: false,
      },
      relations: ['children', 'files'],
    });

    const result = [];

    for (const folder of folders) {
      const files = await this.fileRepo.find({
        where: { folderId: folder.id, isDeleted: false },
      });

      const tree = await this.getFolderTree(folder.id, ownerId);

      result.push({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt,
        files: files.map((f) => ({
          id: f.id,
          filename: f.filename,
          size: f.size,
        })),
        children: tree,
      });
    }

    return result;
  }

  async updateFolder(id: string, ownerId: string, name: string): Promise<Folder> {
    const folder = await this.getFolder(id, ownerId);
    folder.name = name;
    return this.folderRepo.save(folder);
  }

  async deleteFolder(id: string, ownerId: string): Promise<void> {
    const folder = await this.getFolder(id, ownerId);

    // Soft delete folder and all contents recursively
    await this.softDeleteRecursive(id, ownerId);
  }

  private async softDeleteRecursive(folderId: string, ownerId: string): Promise<void> {
    // Delete all files in this folder
    await this.fileRepo.update(
      { folderId, ownerId },
      { isDeleted: true, deletedAt: new Date() },
    );

    // Recursively delete all subfolders
    const subfolders = await this.folderRepo.find({
      where: { parentId: folderId, ownerId, isDeleted: false },
    });

    for (const subfolder of subfolders) {
      await this.softDeleteRecursive(subfolder.id, ownerId);
    }

    // Delete the folder itself
    await this.folderRepo.update(
      { id: folderId },
      { isDeleted: true, deletedAt: new Date() },
    );
  }

  async moveFile(fileId: string, folderId: string | null, ownerId: string): Promise<FileEntity> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId, ownerId, isDeleted: false },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Validate target folder if provided
    if (folderId) {
      const folder = await this.folderRepo.findOne({
        where: { id: folderId, ownerId, isDeleted: false },
      });
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    file.folderId = folderId || null;
    return this.fileRepo.save(file);
  }

  async getFolderPath(folderId: string): Promise<string> {
    const folder = await this.folderRepo.findOne({ where: { id: folderId } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    let path = folder.name;
    let current = folder;

    while (current.parentId) {
      const parent = await this.folderRepo.findOne({
        where: { id: current.parentId },
      });
      if (!parent) break;
      path = `${parent.name}/${path}`;
      current = parent;
    }

    return path;
  }
}
