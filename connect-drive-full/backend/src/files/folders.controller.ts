import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateFolderDto, UpdateFolderDto, MoveFileDto } from '../common/dtos';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private foldersService: FoldersService) {}

  @Post()
  async createFolder(
    @Body() dto: CreateFolderDto,
    @Request() req: any,
  ): Promise<any> {
    const folder = await this.foldersService.createFolder(
      req.user.id,
      dto.name,
      dto.parentId,
    );

    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
    };
  }

  @Get('tree')
  async getFolderTree(@Request() req: any): Promise<any[]> {
    return this.foldersService.getFolderTree(null, req.user.id);
  }

  @Get(':folderId')
  async getFolder(
    @Param('folderId') folderId: string,
    @Request() req: any,
  ): Promise<any> {
    const folder = await this.foldersService.getFolder(folderId, req.user.id);

    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  @Put(':folderId')
  async updateFolder(
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
    @Request() req: any,
  ): Promise<any> {
    const folder = await this.foldersService.updateFolder(folderId, req.user.id, dto.name);

    return {
      id: folder.id,
      name: folder.name,
      updatedAt: folder.updatedAt,
    };
  }

  @Delete(':folderId')
  @HttpCode(HttpStatus.OK)
  async deleteFolder(
    @Param('folderId') folderId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.foldersService.deleteFolder(folderId, req.user.id);
    return { message: 'Folder deleted successfully' };
  }

  @Get(':folderId/path')
  async getFolderPath(
    @Param('folderId') folderId: string,
    @Request() req: any,
  ): Promise<{ path: string }> {
    const path = await this.foldersService.getFolderPath(folderId);
    return { path };
  }
}
