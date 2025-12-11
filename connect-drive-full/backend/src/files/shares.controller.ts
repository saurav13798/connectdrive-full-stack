import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SharesService } from './shares.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateShareDto, RevokeShareDto } from '../common/dtos';

@Controller('shares')
export class SharesController {
  constructor(private sharesService: SharesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createShare(
    @Body() dto: CreateShareDto,
    @Request() req: any,
  ): Promise<any> {
    const share = await this.sharesService.createShare(
      req.user.id,
      dto.fileId,
      dto.folderId,
      dto.isPublic,
      dto.permissions,
      dto.expiresAt,
    );

    return {
      id: share.id,
      shareToken: share.shareToken,
      permissions: share.permissions,
      isPublic: share.isPublic,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listShares(@Request() req: any): Promise<any[]> {
    const shares = await this.sharesService.listShares(req.user.id);

    return shares.map((s) => ({
      id: s.id,
      shareToken: s.shareToken,
      fileId: s.fileId,
      folderId: s.folderId,
      permissions: s.permissions,
      isPublic: s.isPublic,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  @Get('public/:token')
  async getPublicShare(@Param('token') token: string): Promise<any> {
    const share = await this.sharesService.getPublicShare(token);

    return {
      id: share.id,
      fileId: share.fileId,
      folderId: share.folderId,
      permissions: share.permissions,
      createdAt: share.createdAt,
    };
  }

  @Get('public/:token/download/:fileId')
  async downloadPublicFile(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
  ): Promise<{ downloadUrl: string }> {
    const share = await this.sharesService.downloadPublicFile(token, fileId);

    // In a real scenario, you'd generate a presigned URL here
    return { downloadUrl: `https://connectdrive.com/api/files/${fileId}/download` };
  }

  @Delete(':shareId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeShare(
    @Param('shareId') shareId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.sharesService.revokeShare(shareId, req.user.id);
    return { message: 'Share revoked successfully' };
  }
}
