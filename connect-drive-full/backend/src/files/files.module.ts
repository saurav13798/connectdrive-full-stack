import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { Folder } from './entities/folder.entity';
import { Share } from './entities/share.entity';
import { FileVersion } from './entities/version.entity';
import { RecycleEntry } from './entities/recycle.entity';
import { User } from '../auth/entities/user.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { RecycleService } from './recycle.service';
import { RecycleController } from './recycle.controller';
import { MinioModule } from '../minio/minio.module';
import { FileShareLink } from './entities/file-share-link.entity';
import { FileSharingService } from './file-sharing.service';
import { FileSharingController } from './file-sharing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileEntity,
      Folder,
      Share,
      FileVersion,
      RecycleEntry,
      User,
      FileShareLink,
    ]),
    MinioModule,
  ],
  providers: [
    FilesService,
    FoldersService,
    SharesService,
    RecycleService,
    FileSharingService,
  ],
  controllers: [
    FilesController,
    FoldersController,
    SharesController,
    RecycleController,
    FileSharingController,
  ],
  exports: [FilesService, FoldersService, SharesService, RecycleService],
})
export class FilesModule {}
