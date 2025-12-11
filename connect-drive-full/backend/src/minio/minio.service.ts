import { Injectable, OnModuleInit, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10);
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    const useSSL = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'connectdrive');

    try {
      this.client = new Minio.Client({
        endPoint: endpoint,
        port: port,
        useSSL: useSSL,
        accessKey: accessKey,
        secretKey: secretKey,
      });

      this.logger.log(`Connecting to MinIO at ${endpoint}:${port}`);
      
      // Ensure bucket exists
      await this.ensureBucketExists();
      
      this.logger.log(`MinIO service initialized with bucket: ${this.bucket}`);
    } catch (error) {
      this.logger.warn('MinIO service not available, running in mock mode', error.message);
      this.client = null; // Set to null to indicate mock mode
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await new Promise<boolean>((resolve, reject) => {
        this.client.bucketExists(this.bucket, (err, exists) => {
          if (err) return reject(err);
          resolve(exists);
        });
      });

      if (!exists) {
        await new Promise<void>((resolve, reject) => {
          this.client.makeBucket(this.bucket, '', (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${this.bucket}`, error);
      throw error;
    }
  }

  async presignedPutObject(filename: string, expires = 3600): Promise<{ key: string; url: string }> {
    const key = `${uuidv4()}-${Date.now()}-${this.sanitizeFilename(filename)}`;
    
    if (!this.client) {
      // Mock mode - return mock URLs
      const url = `http://localhost:3001/mock-upload/${key}`;
      this.logger.debug(`Generated mock PUT URL for key: ${key}`);
      return { key, url };
    }

    try {
      const url = await new Promise<string>((resolve, reject) => {
        this.client.presignedPutObject(this.bucket, key, expires, (err, url) => {
          if (err) return reject(err);
          resolve(url);
        });
      });
      
      this.logger.debug(`Generated presigned PUT URL for key: ${key}`);
      return { key, url };
    } catch (error) {
      this.logger.error(`Failed to generate presigned PUT URL for: ${filename}`, error);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async presignedGetObject(key: string, expires = 3600): Promise<string> {
    if (!this.client) {
      // Mock mode - return mock URLs
      const url = `http://localhost:3001/mock-download/${key}`;
      this.logger.debug(`Generated mock GET URL for key: ${key}`);
      return url;
    }

    try {
      const url = await new Promise<string>((resolve, reject) => {
        this.client.presignedGetObject(this.bucket, key, expires, (err, url) => {
          if (err) return reject(err);
          resolve(url);
        });
      });
      
      this.logger.debug(`Generated presigned GET URL for key: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned GET URL for key: ${key}`, error);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.client.removeObject(this.bucket, key, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      
      this.logger.debug(`Deleted object with key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete object with key: ${key}`, error);
      throw new InternalServerErrorException('Failed to delete object');
    }
  }

  async listObjects(prefix: string = '', recursive: boolean = true): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const objects: string[] = [];
      const stream = this.client.listObjects(this.bucket, prefix, recursive);

      stream.on('data', (obj) => {
        objects.push(obj.name);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      stream.on('end', () => {
        resolve(objects);
      });
    });
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const copyConditions = new Minio.CopyConditions();
        this.client.copyObject(
          this.bucket, 
          destinationKey, 
          `/${this.bucket}/${sourceKey}`, 
          copyConditions,
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      
      this.logger.debug(`Copied object from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      this.logger.error(`Failed to copy object from ${sourceKey} to ${destinationKey}`, error);
      throw new InternalServerErrorException('Failed to copy object');
    }
  }

  async getObjectInfo(key: string): Promise<any> {
    try {
      // Use promise-based approach for newer minio versions
      const stat = await this.client.statObject(this.bucket, key);
      return stat;
    } catch (error) {
      this.logger.error(`Failed to get object info for key: ${key}`, error);
      throw new InternalServerErrorException('Failed to get object information');
    }
  }

  async deleteObjects(keys: string[]): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.client.removeObjects(this.bucket, keys, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      
      this.logger.debug(`Deleted ${keys.length} objects`);
    } catch (error) {
      this.logger.error(`Failed to delete multiple objects`, error);
      throw new InternalServerErrorException('Failed to delete objects');
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters for object storage
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.listObjects('', false);
      return true;
    } catch (error) {
      this.logger.error('MinIO health check failed', error);
      return false;
    }
  }
}
