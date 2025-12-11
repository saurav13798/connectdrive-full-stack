import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RecycleService } from './recycle.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestoreItemDto, DeletePermanentlyDto, EmptyRecycleDto } from '../common/dtos';

@Controller('recycle')
@UseGuards(JwtAuthGuard)
export class RecycleController {
  constructor(private recycleService: RecycleService) {}

  @Get()
  async listRecycleBin(@Request() req: any): Promise<any[]> {
    const items = await this.recycleService.listRecycleItems(req.user.id);

    return items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      itemType: item.itemType,
      size: item.size,
      deletedAt: item.deletedAt,
      expiresAt: item.expiresAt,
      originalPath: item.originalPath,
    }));
  }

  @Post(':itemId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreItem(
    @Param('itemId') itemId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.recycleService.restoreItem(itemId, req.user.id);
    return { message: 'Item restored successfully' };
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  async deleteItemPermanently(
    @Param('itemId') itemId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.recycleService.deleteItemPermanently(itemId, req.user.id);
    return { message: 'Item deleted permanently' };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async emptyRecycleBin(@Request() req: any): Promise<{ message: string }> {
    await this.recycleService.emptyRecycleBin(req.user.id);
    return { message: 'Recycle bin emptied' };
  }
}
