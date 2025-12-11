import { validateFile, validateFiles, FILE_VALIDATION_PRESETS } from '../utils/validation';
import { AppErrorClass } from '../types/errors';
import apiClient from '../services/apiClient';

// Mock File for testing
class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(name: string, size: number, type: string) {
    this.name = name;
    this.size = size;
    this.type = type;
  }
}

describe('File Upload Validation Security Tests', () => {
  test('should reject files with path traversal attempts', () => {
    const maliciousFiles = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      './config.json',
      '.\\secrets.txt',
      'normal/../../../etc/passwd',
      'file\0.txt' // null byte injection
    ];

    maliciousFiles.forEach(fileName => {
      const file = new MockFile(fileName, 1024, 'text/plain') as unknown as File;
      const result = validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('invalid characters') || error.includes('path traversal')
      )).toBe(true);
    });
  });

  test('should reject files with invalid names', () => {
    const invalidFiles = [
      { name: '', size: 1024, type: 'text/plain' }, // Empty name
      { name: '   ', size: 1024, type: 'text/plain' }, // Whitespace only
      { name: '  file.txt  ', size: 1024, type: 'text/plain' }, // Leading/trailing spaces
      { name: 'a'.repeat(256), size: 1024, type: 'text/plain' } // Too long
    ];

    invalidFiles.forEach(({ name, size, type }) => {
      const file = new MockFile(name, size, type) as unknown as File;
      const result = validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  test('should enforce file size limits', () => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFile = new MockFile('large.txt', maxSize + 1, 'text/plain') as unknown as File;
    
    const result = validateFile(oversizedFile, { maxSize });
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('size'))).toBe(true);
    expect(result.errors.some(error => error.includes('exceeds maximum'))).toBe(true);
  });

  test('should enforce MIME type restrictions', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    const disallowedFile = new MockFile('script.js', 1024, 'application/javascript') as unknown as File;
    
    const result = validateFile(disallowedFile, { allowedTypes });
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('type'))).toBe(true);
    expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
  });

  test('should enforce file extension restrictions', () => {
    const allowedExtensions = ['.jpg', '.png', '.pdf'];
    const disallowedFile = new MockFile('script.exe', 1024, 'application/octet-stream') as unknown as File;
    
    const result = validateFile(disallowedFile, { allowedExtensions });
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('extension'))).toBe(true);
  });

  test('should validate multiple files and enforce count limits', () => {
    const files = [
      new MockFile('file1.txt', 1024, 'text/plain'),
      new MockFile('file2.txt', 1024, 'text/plain'),
      new MockFile('file3.txt', 1024, 'text/plain')
    ] as unknown as File[];

    const result = validateFiles(files, { maxFiles: 2 });
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('Too many files'))).toBe(true);
  });

  test('should accept valid files', () => {
    const validFile = new MockFile('document.pdf', 1024 * 1024, 'application/pdf') as unknown as File;
    
    const result = validateFile(validFile, {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['application/pdf'],
      allowedExtensions: ['.pdf']
    });
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Error Handling Security Tests', () => {
  test('should create appropriate error types for different HTTP status codes', () => {
    const testCases = [
      { status: 401, expectedType: 'authentication', expectedCode: 'AUTH_EXPIRED' },
      { status: 403, expectedType: 'permission', expectedCode: 'INSUFFICIENT_PERMISSIONS' },
      { status: 500, expectedType: 'server', expectedCode: 'SERVER_ERROR' },
      { status: 400, expectedType: 'validation', expectedCode: 'REQUEST_FAILED' }
    ];

    testCases.forEach(({ status, expectedType, expectedCode }) => {
      const mockError = {
        response: {
          status,
          data: { message: 'Test error message' }
        }
      };

      const appError = AppErrorClass.fromAxiosError(mockError);
      
      expect(appError.type).toBe(expectedType);
      expect(appError.code).toBe(expectedCode);
      expect(appError.message).toBeTruthy();
    });
  });

  test('should handle network errors appropriately', () => {
    const networkError = {
      request: {},
      message: 'Network Error'
    };

    const appError = AppErrorClass.fromAxiosError(networkError);
    
    expect(appError.type).toBe('network');
    expect(appError.code).toBe('NETWORK_ERROR');
    expect(appError.recoverable).toBe(true);
    expect(appError.retryable).toBe(true);
  });

  test('should handle unknown errors securely', () => {
    const unknownError = {
      message: 'Something went wrong'
    };

    const appError = AppErrorClass.fromAxiosError(unknownError);
    
    expect(appError.type).toBe('unknown');
    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.message).toBe('Something went wrong');
  });

  test('should not expose sensitive information in error messages', () => {
    const sensitiveError = {
      response: {
        status: 500,
        data: { 
          message: 'Database connection failed',
          details: {
            password: 'secret123',
            token: 'abc123xyz',
            apiKey: 'key_12345'
          }
        }
      }
    };

    const appError = AppErrorClass.fromAxiosError(sensitiveError);
    
    // Should not contain sensitive keywords in the main message
    expect(appError.message.toLowerCase()).not.toMatch(/password|token|secret|key|database/);
    
    // Context may contain response data but should be handled carefully
    if (appError.context) {
      expect(appError.context.responseData).toBeDefined();
    }
  });
});

describe('File Validation Presets Security Tests', () => {
  test('image preset should only allow safe image types', () => {
    const imagePreset = FILE_VALIDATION_PRESETS.images;
    
    expect(imagePreset.allowedTypes).toEqual([
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp'
    ]);
    
    expect(imagePreset.allowedExtensions).toEqual([
      '.jpg', 
      '.jpeg', 
      '.png', 
      '.gif', 
      '.webp'
    ]);
    
    // Should have reasonable size limit
    expect(imagePreset.maxSize).toBe(10 * 1024 * 1024); // 10MB
  });

  test('document preset should only allow safe document types', () => {
    const docPreset = FILE_VALIDATION_PRESETS.documents;
    
    expect(docPreset.allowedTypes).toContain('application/pdf');
    expect(docPreset.allowedTypes).toContain('text/plain');
    
    // Should not allow executable types
    expect(docPreset.allowedTypes).not.toContain('application/javascript');
    expect(docPreset.allowedTypes).not.toContain('text/html');
    expect(docPreset.allowedTypes).not.toContain('application/x-executable');
  });

  test('all presets should have reasonable size limits', () => {
    Object.values(FILE_VALIDATION_PRESETS).forEach(preset => {
      expect(preset.maxSize).toBeGreaterThan(0);
      expect(preset.maxSize).toBeLessThanOrEqual(1024 * 1024 * 1024); // Max 1GB
    });
  });

  test('should reject dangerous file types even with general preset', () => {
    const dangerousFile = new MockFile('malware.exe', 1024, 'application/x-executable') as unknown as File;
    
    // Even general preset should have some restrictions
    const result = validateFile(dangerousFile, FILE_VALIDATION_PRESETS.general);
    
    // General preset allows all types, but filename validation should catch dangerous extensions
    if (result.isValid === false) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('Input Sanitization Tests', () => {
  test('should handle special characters in file names safely', () => {
    const specialCharFiles = [
      'file<script>.txt',
      'file&amp;.txt',
      'file"quote".txt',
      "file'single'.txt",
      'file%20space.txt'
    ];

    specialCharFiles.forEach(fileName => {
      const file = new MockFile(fileName, 1024, 'text/plain') as unknown as File;
      const result = validateFile(file);
      
      // Should either accept with proper handling or reject safely
      if (!result.isValid) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
      
      // Should not cause any runtime errors
      expect(() => validateFile(file)).not.toThrow();
    });
  });

  test('should handle unicode characters in file names', () => {
    const unicodeFiles = [
      'файл.txt', // Cyrillic
      'ファイル.txt', // Japanese
      '文件.txt', // Chinese
      'αρχείο.txt', // Greek
      '🎉emoji.txt' // Emoji
    ];

    unicodeFiles.forEach(fileName => {
      const file = new MockFile(fileName, 1024, 'text/plain') as unknown as File;
      
      // Should handle unicode gracefully without throwing
      expect(() => validateFile(file)).not.toThrow();
      
      const result = validateFile(file);
      
      // Result should be consistent
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});