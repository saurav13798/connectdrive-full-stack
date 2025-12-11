import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileSharingService } from './file-sharing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShareLinkPermission } from './entities/file-share-link.entity';
import { MockMinioService } from '../minio/mock-minio.service';

@Controller('file-sharing')
export class FileSharingController {
  constructor(
    private fileSharingService: FileSharingService,
    private minioService: MockMinioService,
  ) {}

  @Post('links')
  @UseGuards(JwtAuthGuard)
  async createShareLink(
    @Body() body: {
      fileId: string;
      permission?: ShareLinkPermission;
      password?: string;
      expiresAt?: string;
      maxAccess?: number;
    },
    @Request() req: any,
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    
    const shareLink = await this.fileSharingService.createShareLink(
      body.fileId,
      req.user.id,
      body.permission,
      body.password,
      expiresAt,
      body.maxAccess,
    );

    return {
      ...shareLink,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareLink.token}`,
    };
  }

  @Get('links')
  @UseGuards(JwtAuthGuard)
  async getUserShareLinks(@Request() req: any) {
    const shareLinks = await this.fileSharingService.getUserShareLinks(req.user.id);
    
    return shareLinks.map(link => ({
      ...link,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${link.token}`,
    }));
  }

  @Get('public/:token')
  async getPublicFile(
    @Param('token') token: string,
    @Query('password') password?: string,
  ) {
    const shareLink = await this.fileSharingService.getShareLink(token, password);
    
    return {
      file: {
        id: shareLink.file.id,
        filename: shareLink.file.filename,
        size: shareLink.file.size,
        mime: shareLink.file.mime,
        createdAt: shareLink.file.createdAt,
      },
      permission: shareLink.permission,
      creator: {
        displayName: shareLink.creator.displayName,
      },
    };
  }

  @Get('public/:token/download')
  async downloadPublicFile(
    @Param('token') token: string,
    @Query('password') password?: string,
  ) {
    const shareLink = await this.fileSharingService.getShareLink(token, password);
    
    if (shareLink.permission === ShareLinkPermission.VIEW) {
      throw new Error('Download not allowed for this share link');
    }

    const downloadUrl = await this.minioService.presignedGetObject(shareLink.file.key, 3600);
    
    return { downloadUrl };
  }

  @Put('links/:token')
  @UseGuards(JwtAuthGuard)
  async updateShareLink(
    @Param('token') token: string,
    @Body() body: {
      permission?: ShareLinkPermission;
      password?: string;
      expiresAt?: string;
      maxAccess?: number;
    },
    @Request() req: any,
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    
    return this.fileSharingService.updateShareLink(token, req.user.id, {
      ...body,
      expiresAt,
    });
  }

  @Delete('links/:token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeShareLink(
    @Param('token') token: string,
    @Request() req: any,
  ) {
    await this.fileSharingService.revokeShareLink(token, req.user.id);
    return { message: 'Share link revoked successfully' };
  }
}