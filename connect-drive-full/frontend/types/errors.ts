export type ErrorType = 'network' | 'validation' | 'authentication' | 'permission' | 'unknown' | 'upload' | 'quota' | 'server' | 'client';

export interface ErrorMetadata {
  timestamp?: string;
  userId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  status?: number;
  url?: string;
  method?: string;
  [key: string]: unknown;
}

export interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  userFriendly: boolean;
  context?: ErrorMetadata;
}

export interface ErrorHandlingStrategy {
  display: (error: AppError) => React.ReactNode;
  recover: (error: AppError) => Promise<void>;
  report: (error: AppError) => void;
}

export class AppErrorClass extends Error implements AppError {
  public readonly timestamp: string;
  public readonly id: string;
  
  type: ErrorType;
  code: string;
  recoverable: boolean;
  retryable: boolean;
  userFriendly: boolean;
  context?: ErrorMetadata;

  constructor(
    type: ErrorType,
    code: string,
    message: string,
    recoverable = false,
    retryable = false,
    userFriendly = true,
    context?: ErrorMetadata
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.userFriendly = userFriendly;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppErrorClass.prototype);
  }

  static fromAxiosError(error: any, metadata: ErrorMetadata = {}): AppErrorClass {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      const enhancedMetadata = {
        ...metadata,
        status,
        url: error.config?.url,
        method: error.config?.method,
        responseData: data,
      };
      
      if (status === 401) {
        return new AppErrorClass(
          'authentication',
          'AUTH_EXPIRED',
          'Your session has expired. Please log in again.',
          true,
          false,
          true,
          enhancedMetadata
        );
      }
      
      if (status === 403) {
        return new AppErrorClass(
          'permission',
          'INSUFFICIENT_PERMISSIONS',
          'You do not have permission to perform this action.',
          false,
          false,
          true,
          enhancedMetadata
        );
      }
      
      if (status === 413) {
        return new AppErrorClass(
          'upload',
          'FILE_TOO_LARGE',
          'File size exceeds the maximum allowed limit',
          false,
          false,
          true,
          enhancedMetadata
        );
      }
      
      if (status === 422) {
        const sanitizedMessage = this.sanitizeErrorMessage(data.message || 'Invalid input');
        
        return new AppErrorClass(
          'validation',
          'VALIDATION_ERROR',
          sanitizedMessage,
          false,
          false,
          true,
          { ...enhancedMetadata, errors: data.errors }
        );
      }
      
      if (status === 429) {
        return new AppErrorClass(
          'server',
          'RATE_LIMITED',
          'Too many requests. Please try again later.',
          true,
          true,
          true,
          enhancedMetadata
        );
      }
      
      if (status >= 500) {
        return new AppErrorClass(
          'server',
          'SERVER_ERROR',
          'A server error occurred. Please try again later.',
          true,
          true,
          true,
          enhancedMetadata
        );
      }
      
      const sanitizedMessage = this.sanitizeErrorMessage(data?.message || 'Request failed');
      
      return new AppErrorClass(
        'validation',
        'REQUEST_FAILED',
        sanitizedMessage,
        false,
        false,
        true,
        enhancedMetadata
      );
    }
    
    if (error.request) {
      return new AppErrorClass(
        'network',
        'NETWORK_ERROR',
        'Network error. Please check your connection and try again.',
        true,
        true,
        true,
        { ...metadata, timeout: error.code === 'ECONNABORTED' }
      );
    }
    
    // Sanitize error message to avoid exposing sensitive information
    const sanitizedMessage = this.sanitizeErrorMessage(error.message || 'An unexpected error occurred');
    
    return new AppErrorClass(
      'unknown',
      'UNKNOWN_ERROR',
      sanitizedMessage,
      false,
      false,
      false,
      metadata
    );
  }

  static fromError(error: Error, type: ErrorType = 'client', metadata: ErrorMetadata = {}): AppErrorClass {
    if (error instanceof AppErrorClass) {
      return error;
    }
    
    const sanitizedMessage = this.sanitizeErrorMessage(error.message);
    
    return new AppErrorClass(
      type,
      'GENERIC_ERROR',
      sanitizedMessage,
      false,
      false,
      false,
      {
        ...metadata,
        originalError: error.name,
        stack: error.stack,
      }
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      retryable: this.retryable,
      userFriendly: this.userFriendly,
      timestamp: this.timestamp,
      context: this.context,
    };
  }

  getUserMessage(): string {
    if (!this.userFriendly) {
      return 'An unexpected error occurred. Please try again.';
    }
    return this.message;
  }

  private static sanitizeErrorMessage(message: string): string {
    // List of sensitive keywords that should not appear in error messages
    const sensitiveKeywords = /password|token|secret|key|auth|credential|session|jwt|bearer/i;
    
    if (sensitiveKeywords.test(message)) {
      return 'An error occurred while processing your request';
    }
    
    return message;
  }
}