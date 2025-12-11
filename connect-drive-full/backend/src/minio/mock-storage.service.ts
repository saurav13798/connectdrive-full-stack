import { Injectable } from '@nestjs/common';

@Injectable()
export class MockStorageService {
  private uploadedFiles = new Map<string, Buffer>();

  storeFile(key: string, buffer: Buffer): void {
    this.uploadedFiles.set(key, buffer);
    console.log(`Stored file with key: ${key}, size: ${buffer.length} bytes`);
  }

  getFile(key: string): Buffer | undefined {
    return this.uploadedFiles.get(key);
  }

  deleteFile(key: string): boolean {
    return this.uploadedFiles.delete(key);
  }

  listFiles(): string[] {
    return Array.from(this.uploadedFiles.keys());
  }

  getFileSize(key: string): number {
    const buffer = this.uploadedFiles.get(key);
    return buffer ? buffer.length : 0;
  }
}