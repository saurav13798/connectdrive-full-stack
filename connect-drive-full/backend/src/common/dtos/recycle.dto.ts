import { IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class RecycleItemDto {
  id: string;
  itemName: string;
  itemType: 'file' | 'folder';
  size: number;
  deletedAt: Date;
  expiresAt: Date;
  originalPath: string;
}

export class RecycleListDto {
  items: RecycleItemDto[];
  total: number;
}

export class RestoreItemDto {
  @IsUUID(4, { message: 'Item ID must be a valid UUID' })
  itemId: string;
}

export class DeletePermanentlyDto {
  @IsUUID(4, { message: 'Item ID must be a valid UUID' })
  itemId: string;
}

export class EmptyRecycleDto {
  @IsOptional()
  @IsBoolean({ message: 'Force must be a boolean' })
  force?: boolean;
}
