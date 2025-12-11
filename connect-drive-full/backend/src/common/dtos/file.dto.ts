import { IsString, IsUUID, IsNumber, IsOptional, IsBoolean, IsPositive, MaxLength, IsIn, Min, Max } from 'class-validator';

export class FileResponseDto {
  id: string;
  filename: string;
  size: number;
  mime: string;
  ownerId: string;
  folderId: string;
  currentVersion: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FileListDto {
  id: string;
  filename: string;
  size: number;
  mime: string;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PresignedUploadUrlDto {
  fileId: string;
  uploadUrl: string;
  key: string;
  expiresIn: number;
  filename?: string; // Optional unique filename if modified
}

export class ConfirmUploadDto {
  @IsString({ message: 'Key is required' })
  key: string;

  @IsString({ message: 'Filename is required' })
  @MaxLength(255, { message: 'Filename must not exceed 255 characters' })
  filename: string;

  @IsNumber({}, { message: 'File size must be a number' })
  @IsPositive({ message: 'File size must be positive' })
  size: number;

  @IsString({ message: 'MIME type is required' })
  mime: string;

  @IsOptional()
  @IsUUID(4, { message: 'Folder ID must be a valid UUID' })
  folderId?: string;
}

export class CreateFileDto {
  @IsString()
  filename: string;

  @IsNumber()
  size: number;

  @IsString()
  mime: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsString()
  key: string;
}

export class PaginationDto {
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @IsOptional()
  @IsUUID(4, { message: 'Folder ID must be a valid UUID' })
  folderId?: string;
}

export class FileListResponseDto {
  items: FileListDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
