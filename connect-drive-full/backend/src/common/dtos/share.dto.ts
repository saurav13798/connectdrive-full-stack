import { IsUUID, IsOptional, IsBoolean, IsJSON, IsString, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class SharePermissionsDto {
  @IsBoolean({ message: 'Read permission must be a boolean' })
  read: boolean;

  @IsBoolean({ message: 'Write permission must be a boolean' })
  write: boolean;

  @IsBoolean({ message: 'Delete permission must be a boolean' })
  delete: boolean;
}

export class CreateShareDto {
  @IsOptional()
  @IsUUID(4, { message: 'File ID must be a valid UUID' })
  fileId?: string;

  @IsOptional()
  @IsUUID(4, { message: 'Folder ID must be a valid UUID' })
  folderId?: string;

  @IsBoolean({ message: 'isPublic must be a boolean' })
  isPublic: boolean = false;

  @IsOptional()
  @IsObject({ message: 'Permissions must be an object' })
  @ValidateNested()
  @Type(() => SharePermissionsDto)
  permissions?: SharePermissionsDto;

  @IsOptional()
  @IsDateString({}, { message: 'Expiration date must be a valid ISO date string' })
  expiresAt?: Date;
}

export class ShareResponseDto {
  id: string;
  fileId: string;
  folderId: string;
  shareToken: string;
  permissions: { read: boolean; write: boolean; delete: boolean };
  isPublic: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
}

export class ShareListDto {
  id: string;
  shareToken: string;
  permissions: { read: boolean; write: boolean; delete: boolean };
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export class RevokeShareDto {
  @IsUUID(4, { message: 'Share ID must be a valid UUID' })
  shareId: string;
}
