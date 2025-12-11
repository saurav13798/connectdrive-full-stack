import { AppErrorClass, ErrorMetadata } from '../types/errors';

export interface ErrorReport {
  error: AppErrorClass;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
}

class ErrorMonitoringService {
  private isEnabled: boolean;
  private endpoint: string;
  private sessionId: string;
  private userId: string | undefined;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.endpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_URL || '/api/errors';
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  clearUserId(): void {
    this.userId = undefined;
  }

  async reportError(error: AppErrorClass, additionalMetadata: ErrorMetadata = {}): Promise<void> {
    if (!this.isEnabled) {
      console.warn('Error monitoring disabled in development:', error);
      return;
    }

    try {
      // Update error context with additional metadata
      error.context = {
        ...error.context,
        ...additionalMetadata,
        sessionId: this.sessionId,
        ...(this.userId && { userId: this.userId }),
        ...(process.env.NEXT_PUBLIC_BUILD_VERSION && { buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION }),
      };

      const report: ErrorReport = {
        error,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId,
        ...(this.userId && { userId: this.userId }),
        ...(process.env.NEXT_PUBLIC_BUILD_VERSION && { buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION }),
      };

      // Send error report to monitoring service
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      console.info('Error reported successfully:', error.id);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      // Store error locally for later retry
      this.storeErrorLocally(error, additionalMetadata);
    }
  }

  private storeErrorLocally(error: AppErrorClass, metadata: ErrorMetadata): void {
    try {
      const storedErrors = this.getStoredErrors();
      storedErrors.push({
        error: error.toJSON(),
        metadata,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 10 errors to prevent storage bloat
      const recentErrors = storedErrors.slice(-10);
      localStorage.setItem('connectdrive_errors', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.error('Failed to store error locally:', storageError);
    }
  }

  private getStoredErrors(): any[] {
    try {
      const stored = localStorage.getItem('connectdrive_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async retryStoredErrors(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const storedErrors = this.getStoredErrors();
      if (storedErrors.length === 0) return;

      for (const storedError of storedErrors) {
        try {
          await this.reportError(
            AppErrorClass.fromError(new Error(storedError.error.message), storedError.error.type),
            storedError.metadata
          );
        } catch {
          // Ignore retry failures
        }
      }

      // Clear stored errors after successful retry
      localStorage.removeItem('connectdrive_errors');
    } catch (error) {
      console.error('Failed to retry stored errors:', error);
    }
  }

  // Global error handler setup
  setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = AppErrorClass.fromError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'client',
        { component: 'global', action: 'unhandledRejection' }
      );
      this.reportError(error);
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      const error = AppErrorClass.fromError(
        event.error || new Error(event.message),
        'client',
        {
          component: 'global',
          action: 'uncaughtError',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      );
      this.reportError(error);
    });

    // Retry stored errors on page load
    this.retryStoredErrors();
  }
}

export const errorMonitoring = new ErrorMonitoringService();