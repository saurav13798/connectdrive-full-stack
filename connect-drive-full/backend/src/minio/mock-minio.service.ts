import { Injectable } from '@nestjs/common';

@Injectable()
export class MockMinioService {
  async presignedPutObject(filename: string, expires = 3600): Promise<{ key: string; url: string }> {
    const key = `mock-${Date.now()}-${filename}`;
    const url = `http://localhost:3001/mock-upload/${key}`;
    return { key, url };
  }

  async presignedGetObject(key: string, expires = 3600): Promise<string> {
    return `http://localhost:3001/mock-download/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    console.log(`Mock: Deleting object ${key}`);
  }

  async listObjects(prefix: string = '', recursive: boolean = true): Promise<string[]> {
    return [`mock-object-1`, `mock-object-2`];
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    console.log(`Mock: Copying ${sourceKey} to ${destinationKey}`);
  }

  async getObjectInfo(key: string): Promise<any> {
    return {
      size: 1024,
      lastModified: new Date(),
      etag: 'mock-etag'
    };
  }
}