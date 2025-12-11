import { IsString, IsUUID, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateFolderDto {
  @IsString({ message: 'Folder name is required' })
  @MinLength(1, { message: 'Folder name cannot be empty' })
  @MaxLength(255, { message: 'Folder name must not exceed 255 characters' })
  @Matches(/^[^<>:"/\\|?*]+$/, { message: 'Folder name contains invalid characters' })
  name: string;

  @IsOptional()
  @IsUUID(4, { message: 'Parent ID must be a valid UUID' })
  parentId?: string;
}

export class UpdateFolderDto {
  @IsString({ message: 'Folder name is required' })
  @MinLength(1, { message: 'Folder name cannot be empty' })
  @MaxLength(255, { message: 'Folder name must not exceed 255 characters' })
  @Matches(/^[^<>:"/\\|?*]+$/, { message: 'Folder name contains invalid characters' })
  name: string;
}

export class FolderResponseDto {
  id: string;
  name: string;
  ownerId: string;
  parentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FolderTreeDto {
  id: string;
  name: string;
  ownerId: string;
  parentId: string;
  files: {
    id: string;
    filename: string;
    size: number;
  }[];
  children: FolderTreeDto[];
}

export class MoveFileDto {
  @IsUUID(4, { message: 'File ID must be a valid UUID' })
  fileId: string;

  @IsOptional()
  @IsUUID(4, { message: 'Folder ID must be a valid UUID' })
  folderId?: string;
}
