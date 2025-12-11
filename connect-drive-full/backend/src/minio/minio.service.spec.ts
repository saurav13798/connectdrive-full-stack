import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { MinioService } from './minio.service';
import { MockMinioService } from './mock-minio.service';

describe('MinIO Service Properties', () => {
  let service: MinioService;
  let mockService: MockMinioService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        MockMinioService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
    mockService = module.get<MockMinioService>(MockMinioService);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue: any) => {
      const config = {
        'MINIO_ENDPOINT': 'localhost',
        'MINIO_PORT': 9000,
        'MINIO_ACCESS_KEY': 'minioadmin',
        'MINIO_SECRET_KEY': 'minioadmin',
        'MINIO_USE_SSL': false,
        'MINIO_BUCKET': 'test-bucket',
      };
      return config[key] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // **Feature: connectdrive-completion, Property 6: Upload URL generation**
  describe('Upload URL Generation Properties', () => {
    it('should generate valid presigned URLs for any filename', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 60, max: 7200 }), // 1 minute to 2 hours
          async (filename, expires) => {
            const result = await mockService.presignedPutObject(filename, expires);

            // Verify the result structure
            expect(result).toHaveProperty('key');
            expect(result).toHaveProperty('url');
            expect(typeof result.key).toBe('string');
            expect(typeof result.url).toBe('string');
            expect(result.key.length).toBeGreaterThan(0);
            expect(result.url.length).toBeGreaterThan(0);
            
            // Verify key contains timestamp and filename elements
            expect(result.key).toContain(filename.replace(/[^a-zA-Z0-9._-]/g, '_'));
            
            // Verify URL is properly formatted
            expect(result.url).toMatch(/^https?:\/\//);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique keys for identical filenames', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (filename) => {
            const result1 = await mockService.presignedPutObject(filename);
            const result2 = await mockService.presignedPutObject(filename);

            // Keys should be different even for same filename
            expect(result1.key).not.toBe(result2.key);
            
            // Both should be valid
            expect(result1.key.length).toBeGreaterThan(0);
            expect(result2.key.length).toBeGreaterThan(0);
            expect(result1.url.length).toBeGreaterThan(0);
            expect(result2.url.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in filenames', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '!@#$%^&*()'),
          async (filenameWithSpecialChars) => {
            const result = await mockService.presignedPutObject(filenameWithSpecialChars);

            expect(result).toHaveProperty('key');
            expect(result).toHaveProperty('url');
            expect(result.key.length).toBeGreaterThan(0);
            expect(result.url.length).toBeGreaterThan(0);
            
            // Key should not contain problematic characters
            expect(result.key).not.toMatch(/[<>:"/\\|?*]/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: connectdrive-completion, Property 30: Download URL generation with expiration**
  describe('Download URL Generation Properties', () => {
    it('should generate valid download URLs for any key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 255 }),
          fc.integer({ min: 60, max: 7200 }),
          async (key, expires) => {
            const url = await mockService.presignedGetObject(key, expires);

            expect(typeof url).toBe('string');
            expect(url.length).toBeGreaterThan(0);
            expect(url).toMatch(/^https?:\/\//);
            expect(url).toContain(key);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different URLs for different keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key1, key2) => {
            fc.pre(key1 !== key2); // Ensure keys are different

            const url1 = await mockService.presignedGetObject(key1);
            const url2 = await mockService.presignedGetObject(key2);

            expect(url1).not.toBe(url2);
            expect(url1).toContain(key1);
            expect(url2).toContain(key2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Object Management Properties', () => {
    it('should handle object deletion for any key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 255 }),
          async (key) => {
            // Should not throw for any key
            await expect(mockService.deleteObject(key)).resolves.toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle object copying for any source and destination keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (sourceKey, destKey) => {
            // Should not throw for any valid keys
            await expect(mockService.copyObject(sourceKey, destKey)).resolves.toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return object info for any key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 255 }),
          async (key) => {
            const info = await mockService.getObjectInfo(key);

            expect(info).toBeDefined();
            expect(typeof info).toBe('object');
            expect(info).toHaveProperty('size');
            expect(info).toHaveProperty('lastModified');
            expect(info).toHaveProperty('etag');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should list objects with any prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ maxLength: 100 }),
          fc.boolean(),
          async (prefix, recursive) => {
            const objects = await mockService.listObjects(prefix, recursive);

            expect(Array.isArray(objects)).toBe(true);
            expect(objects.every(obj => typeof obj === 'string')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('URL Format Properties', () => {
    it('should generate URLs with consistent format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (filename) => {
            const uploadResult = await mockService.presignedPutObject(filename);
            const downloadUrl = await mockService.presignedGetObject(uploadResult.key);

            // Both URLs should follow HTTP(S) format
            expect(uploadResult.url).toMatch(/^https?:\/\/[^\/]+\//);
            expect(downloadUrl).toMatch(/^https?:\/\/[^\/]+\//);
            
            // URLs should contain the key/filename information
            expect(uploadResult.url).toContain('mock-upload');
            expect(downloadUrl).toContain('mock-download');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});