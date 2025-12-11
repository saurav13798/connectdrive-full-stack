import { Injectable, Logger } from '@nestjs/common';

export interface ErrorReport {
  id: string;
  type: string;
  code: string;
  message: string;
  stack?: string | undefined;
  timestamp: string;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ErrorMonitoringService {
  private readonly logger = new Logger(ErrorMonitoringService.name);
  private readonly isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env['NODE_ENV'] === 'production';
  }

  async reportError(
    error: Error,
    context: {
      userId?: string;
      requestId?: string;
      endpoint?: string;
      method?: string;
      userAgent?: string;
      ip?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      type: error.constructor.name,
      code: (error as any).code || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // Log error locally
    this.logger.error('Error reported', {
      errorId: errorReport.id,
      type: errorReport.type,
      code: errorReport.code,
      message: errorReport.message,
      userId: errorReport.userId,
      endpoint: errorReport.endpoint,
      metadata: errorReport.metadata,
    });

    if (this.isEnabled) {
      try {
        // In production, send to external monitoring service
        await this.sendToMonitoringService(errorReport);
      } catch (monitoringError) {
        this.logger.error('Failed to send error to monitoring service', monitoringError);
      }
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendToMonitoringService(errorReport: ErrorReport): Promise<void> {
    // This would integrate with services like Sentry, DataDog, etc.
    // For now, we'll just log it with structured data
    this.logger.error('Production Error Report', {
      ...errorReport,
      environment: process.env['NODE_ENV'],
      service: 'connectdrive-backend',
      version: process.env['npm_package_version'],
    });
  }

  // Helper method to extract request context
  extractRequestContext(request: any): {
    requestId?: string;
    endpoint?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
  } {
    return {
      requestId: request.id || request.headers?.['x-request-id'],
      endpoint: request.url || request.path,
      method: request.method,
      userAgent: request.headers?.['user-agent'],
      ip: request.ip || request.connection?.remoteAddress,
      userId: request.user?.id,
    };
  }
}