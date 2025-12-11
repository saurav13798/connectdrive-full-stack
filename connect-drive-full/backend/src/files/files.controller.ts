import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ConfirmUploadDto,
  FileListResponseDto,
  PresignedUploadUrlDto,
  PaginationDto,
  FileListDto,
  SearchFilesDto,
} from '../common/dtos';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private filesService: FilesService,
  ) {}

  @Post('init')
  async initializeUpload(
    @Body() body: { filename: string; contentType: string; folderId?: string },
    @Request() req: any,
  ): Promise<PresignedUploadUrlDto> {
    this.logger.log(`Initializing upload for ${body.filename} by user ${req.user.id}`);

    // Handle duplicate filenames
    const uniqueFilename = await this.filesService.handleDuplicateFilename(
      req.user.id,
      body.filename,
      body.folderId,
    );

    const { key, uploadUrl, expiresIn } = await this.filesService.generatePresignedUploadUrl(
      uniqueFilename,
      body.contentType,
      req.user.id,
    );

    return {
      fileId: '', // Will be populated on confirm
      uploadUrl,
      key,
      expiresIn,
      filename: uniqueFilename, // Return the unique filename
    };
  }

  @Post('confirm')
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @Request() req: any,
  ): Promise<any> {
    this.logger.log(`Confirming upload for ${dto.filename} by user ${req.user.id}`);

    try {
      const file = await this.filesService.create({
        ownerId: req.user.id,
        folderId: dto.folderId,
        key: dto.key,
        filename: dto.filename,
        size: dto.size,
        mime: dto.mime,
        currentVersion: 1,
        isDeleted: false,
      });

      this.logger.log(`Upload confirmed for file ${file.id}: ${file.filename}`);

      return {
        id: file.id,
        filename: file.filename,
        size: file.size,
        mime: file.mime,
        key: file.key,
        createdAt: file.createdAt,
      };
    } catch (error) {
      this.logger.error(`Upload confirmation failed: ${error.message}`);
      throw error;
    }
  }

  @Get('list')
  async listFiles(
    @Query() query: PaginationDto,
    @Request() req: any,
  ): Promise<FileListResponseDto> {
    const page = parseInt(query.page?.toString()) || 1;
    const limit = parseInt(query.limit?.toString()) || 20;
    const folderId = query.folderId;

    this.logger.log(`Listing files for user ${req.user.id}, folder: ${folderId || 'root'}`);

    const result = await this.filesService.listByOwner(
      req.user.id,
      folderId,
      page,
      limit,
    );

    return {
      items: result.items.map((f) => ({
        id: f.id,
        filename: f.filename,
        size: f.size,
        mime: f.mime,
        currentVersion: f.currentVersion,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        folderId: f.folderId,
      })),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get('search')
  async searchFiles(
    @Query() query: SearchFilesDto,
    @Request() req: any,
  ): Promise<FileListResponseDto> {
    const page = parseInt(query.page?.toString()) || 1;
    const limit = parseInt(query.limit?.toString()) || 20;

    this.logger.log(`Searching files for user ${req.user.id} with query: ${query.q}`);

    const result = await this.filesService.search(
      req.user.id,
      query.q,
      query.folderId,
      page,
      limit,
    );

    return {
      items: result.items.map((f) => ({
        id: f.id,
        filename: f.filename,
        size: f.size,
        mime: f.mime,
        currentVersion: f.currentVersion,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        folderId: f.folderId,
      })),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get(':fileId')
  async getFileMetadata(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<any> {
    this.logger.log(`Getting metadata for file ${fileId} by user ${req.user.id}`);

    const file = await this.filesService.findOne(fileId);

    // Verify ownership
    if (!await this.filesService.verifyOwnership(fileId, req.user.id)) {
      throw new ForbiddenException('Access denied to this file');
    }

    return {
      id: file.id,
      filename: file.filename,
      size: file.size,
      mime: file.mime,
      key: file.key,
      currentVersion: file.currentVersion,
      folderId: file.folderId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      isDeleted: file.isDeleted,
    };
  }

  @Get(':fileId/download')
  async getDownloadUrl(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    this.logger.log(`Generating download URL for file ${fileId} by user ${req.user.id}`);

    const { downloadUrl, expiresIn } = await this.filesService.generatePresignedDownloadUrl(
      fileId,
      req.user.id,
    );

    return { downloadUrl, expiresIn };
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    this.logger.log(`Deleting file ${fileId} by user ${req.user.id}`);

    // Verify ownership
    if (!await this.filesService.verifyOwnership(fileId, req.user.id)) {
      throw new ForbiddenException('Access denied to this file');
    }

    await this.filesService.delete(fileId, req.user.id);
    this.logger.log(`File ${fileId} moved to recycle bin`);
    
    return { message: 'File moved to recycle bin successfully' };
  }

  @Get(':fileId/versions')
  async getVersions(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<any[]> {
    this.logger.log(`Getting versions for file ${fileId} by user ${req.user.id}`);

    // Verify ownership
    if (!await this.filesService.verifyOwnership(fileId, req.user.id)) {
      throw new ForbiddenException('Access denied to this file');
    }

    const versions = await this.filesService.getVersions(fileId);
    return versions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      filename: v.filename,
      size: v.size,
      mime: v.mime,
      uploadedAt: v.uploadedAt,
      uploadedBy: v.uploadedBy,
    }));
  }

  @Post(':fileId/versions/:versionId/restore')
  async restoreVersion(
    @Param('fileId') fileId: string,
    @Param('versionId') versionId: string,
    @Request() req: any,
  ): Promise<any> {
    this.logger.log(`Restoring version ${versionId} for file ${fileId} by user ${req.user.id}`);

    // Verify ownership
    if (!await this.filesService.verifyOwnership(fileId, req.user.id)) {
      throw new ForbiddenException('Access denied to this file');
    }

    const restored = await this.filesService.restoreVersion(fileId, versionId, req.user.id);
    this.logger.log(`Version restored for file ${fileId}, new version: ${restored.currentVersion}`);
    
    return {
      id: restored.id,
      filename: restored.filename,
      currentVersion: restored.currentVersion,
      restoredAt: new Date(),
    };
  }

  @Get(':fileId/versions/:versionId/download')
  async getVersionDownloadUrl(
    @Param('fileId') fileId: string,
    @Param('versionId') versionId: string,
    @Request() req: any,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    this.logger.log(`Generating download URL for version ${versionId} of file ${fileId} by user ${req.user.id}`);

    const { downloadUrl, expiresIn } = await this.filesService.generateVersionDownloadUrl(
      fileId,
      versionId,
      req.user.id,
    );

    return { downloadUrl, expiresIn };
  }
}
