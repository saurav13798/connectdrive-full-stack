import { IsString, IsOptional, IsArray, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class SearchDto {
  @IsString({ message: 'Search query is required' })
  q: string;

  @IsOptional()
  @IsArray({ message: 'File types must be an array' })
  @IsString({ each: true, message: 'Each file type must be a string' })
  fileTypes?: string[];

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum size must be a number' })
  @Min(0, { message: 'Minimum size must be non-negative' })
  minSize?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Maximum size must be a number' })
  @Min(0, { message: 'Maximum size must be non-negative' })
  maxSize?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;
}

export class SearchResultDto {
  id: string;
  filename: string;
  size: number;
  mime: string;
  folderId: string;
  folderPath: string;
  createdAt: Date;
  updatedAt: Date;
  relevanceScore: number;
}

export class SearchResponseDto {
  items: SearchResultDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
}

export class SearchFilesDto {
  @IsString({ message: 'Search query is required' })
  q: string;

  @IsOptional()
  @IsString({ message: 'Folder ID must be a string' })
  folderId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;
}