// File upload validation utilities
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateFile(file: File, options: FileValidationOptions = {}): FileValidationResult {
  const errors: string[] = [];
  
  // Default options
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = [],
    allowedExtensions = []
  } = options;

  // Size validation
  if (file.size > maxSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`);
  }

  // MIME type validation
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Extension validation
  if (allowedExtensions.length > 0) {
    const extension = getFileExtension(file.name);
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension "${extension}" is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }
  }

  // File name validation (prevent path traversal)
  if (containsPathTraversal(file.name)) {
    errors.push('File name contains invalid characters or path traversal attempts');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFiles(files: FileList | File[], options: FileValidationOptions = {}): FileValidationResult {
  const errors: string[] = [];
  const fileArray = Array.from(files);
  
  // Check file count
  if (options.maxFiles && fileArray.length > options.maxFiles) {
    errors.push(`Too many files selected. Maximum allowed: ${options.maxFiles}`);
  }

  // Validate each file
  fileArray.forEach((file, index) => {
    const result = validateFile(file, options);
    if (!result.isValid) {
      errors.push(`File ${index + 1} (${file.name}): ${result.errors.join(', ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase();
}

function containsPathTraversal(filename: string): boolean {
  // Check for path traversal patterns
  const dangerousPatterns = [
    '../',
    '..\\',
    './',
    '.\\',
    '//',
    '\\\\',
    '\0', // null byte
  ];
  
  return dangerousPatterns.some(pattern => filename.includes(pattern)) ||
         filename.includes('\0') ||
         filename.trim() !== filename || // leading/trailing whitespace
         filename.length === 0 ||
         filename.length > 255; // reasonable filename length limit
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Common file type configurations
export const FILE_VALIDATION_PRESETS = {
  images: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  documents: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  archives: {
    allowedTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ],
    allowedExtensions: ['.zip', '.rar', '.7z'],
    maxSize: 500 * 1024 * 1024, // 500MB
  },
  general: {
    allowedTypes: [], // Allow all types
    allowedExtensions: [], // Allow all extensions
    maxSize: 100 * 1024 * 1024, // 100MB
  }
};