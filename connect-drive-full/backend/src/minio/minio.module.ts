import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import { MockMinioService } from './mock-minio.service';
import { MockStorageService } from './mock-storage.service';
import { MockUploadController } from './mock-upload.controller';
import { MockDownloadController } from './mock-download.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    MinioService,
    MockMinioService, 
    MockStorageService,
    // Use real MinIO service in production, mock in development
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (minioService: MinioService, mockMinioService: MockMinioService) => {
        return process.env.NODE_ENV === 'production' ? minioService : mockMinioService;
      },
      inject: [MinioService, MockMinioService],
    },
  ],
  controllers: [MockUploadController, MockDownloadController],
  exports: [MinioService, MockMinioService, MockStorageService, 'STORAGE_SERVICE'],
})
export class MinioModule {}