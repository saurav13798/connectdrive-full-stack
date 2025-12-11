import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import { WorkerModule } from './worker/worker.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { FileEntity } from './files/entities/file.entity';
import { Folder } from './files/entities/folder.entity';
import { Share } from './files/entities/share.entity';
import { FileVersion } from './files/entities/version.entity';
import { RecycleEntry } from './files/entities/recycle.entity';
import { Organization } from './organizations/entities/organization.entity';
import { OrganizationMember } from './organizations/entities/organization-member.entity';
import { HealthModule } from './health/health.module';
import { MinioModule } from './minio/minio.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const hasDbHost = configService.get('DATABASE_HOST');
        
        if (hasDbHost) {
          // Use PostgreSQL in Docker/production
          return {
            type: 'postgres',
            host: configService.get('DATABASE_HOST', 'localhost'),
            port: configService.get('DATABASE_PORT', 5432),
            username: configService.get('DATABASE_USER', 'connect'),
            password: configService.get('DATABASE_PASSWORD', 'connectpass'),
            database: configService.get('DATABASE_NAME', 'connectdrive'),
            entities: [User, RefreshToken, FileEntity, Folder, Share, FileVersion, RecycleEntry, Organization, OrganizationMember],
            synchronize: true, // Set to false in production
          };
        } else {
          // Use SQLite for local development
          return {
            type: 'sqlite',
            database: 'connectdrive.db',
            entities: [User, RefreshToken, FileEntity, Folder, Share, FileVersion, RecycleEntry, Organization, OrganizationMember],
            synchronize: true,
          };
        }
      },
      inject: [ConfigService],
    }),
    AuthModule,
    FilesModule,
    HealthModule,
    MinioModule,
    OrganizationsModule,
    // WorkerModule, // Disabled for now
  ],
})
export class AppModule {}
