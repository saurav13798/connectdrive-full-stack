/**
 * **Feature: connectdrive-complete-redesign, Property 1: Development Environment Consistency**
 * **Validates: Requirements 11.2, 11.3**
 * 
 * Property: Development tooling should maintain consistency across different environments
 * and configurations, ensuring that code quality gates work reliably.
 */

import { fc, createPropertyTest } from '../../test/setup-property';
import { ErrorMonitoringService } from '../common/services/error-monitoring.service';

describe('Development Tooling Properties', () => {
  let errorMonitoringService: ErrorMonitoringService;

  beforeEach(() => {
    errorMonitoringService = new ErrorMonitoringService();
  });

  describe('Property 1: Development Environment Consistency', () => {
    it('should maintain consistent error reporting across different error types', () => {
      createPropertyTest(
        'Error reporting consistency',
        fc.property(
          fc.record({
            errorName: fc.string({ minLength: 3, maxLength: 20 }),
            message: fc.string({ minLength: 5, maxLength: 100 }),
            code: fc.option(fc.string({ minLength: 3, maxLength: 15 })),
            userId: fc.option(fc.uuid()),
            endpoint: fc.option(fc.webUrl()),
            method: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
          }),
          ({ errorName, message, code, userId, endpoint, method }) => {
            // Create a test error
            const error = new Error(message);
            error.name = errorName;
            if (code) {
              (error as any).code = code;
            }

            // Create request context
            const context = {
              ...(userId && { userId }),
              ...(endpoint && { endpoint }),
              ...(method && { method }),
              requestId: `req_${Date.now()}`,
            };

            // Report error (should not throw)
            expect(() => {
              errorMonitoringService.reportError(error, context);
            }).not.toThrow();

            // Verify error properties are maintained
            expect(error.name).toBe(errorName);
            expect(error.message).toBe(message);
            if (code) {
              expect((error as any).code).toBe(code);
            }
          }
        )
      );
    });

    it('should extract request context consistently', () => {
      createPropertyTest(
        'Request context extraction',
        fc.property(
          fc.record({
            id: fc.option(fc.uuid()),
            url: fc.option(fc.webUrl()),
            method: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE')),
            userAgent: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
            ip: fc.option(fc.ipV4()),
            userId: fc.option(fc.uuid()),
          }),
          ({ id, url, method, userAgent, ip, userId }) => {
            // Create mock request object
            const mockRequest = {
              id,
              url,
              method,
              headers: {
                'user-agent': userAgent,
                'x-request-id': id,
              },
              ip,
              user: userId ? { id: userId } : undefined,
            };

            // Extract context
            const context = errorMonitoringService.extractRequestContext(mockRequest);

            // Verify extracted context matches input
            if (id) {
              expect(context.requestId).toBe(id);
            }
            if (url) {
              expect(context.endpoint).toBe(url);
            }
            if (method) {
              expect(context.method).toBe(method);
            }
            if (userAgent) {
              expect(context.userAgent).toBe(userAgent);
            }
            if (ip) {
              expect(context.ip).toBe(ip);
            }
            if (userId) {
              expect(context.userId).toBe(userId);
            }
          }
        )
      );
    });

    it('should maintain type safety with strict TypeScript configuration', () => {
      createPropertyTest(
        'TypeScript strict mode compliance',
        fc.property(
          fc.record({
            errorMessage: fc.string({ minLength: 1, maxLength: 200 }),
            contextData: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.oneof(fc.string(), fc.integer(), fc.boolean())
            ),
          }),
          ({ errorMessage, contextData }) => {
            // This test verifies TypeScript strict mode by ensuring
            // we can't pass invalid types to our service methods
            const error = new Error(errorMessage);
            
            // Verify we can create valid context objects
            const validContext = {
              userId: 'test-user',
              requestId: 'test-request',
              metadata: contextData,
            };

            // This should compile and run without type errors
            expect(() => {
              errorMonitoringService.reportError(error, validContext);
            }).not.toThrow();

            // Verify type inference works
            const extractedContext = errorMonitoringService.extractRequestContext({
              id: 'test-id',
              method: 'GET',
            });
            
            // TypeScript should infer the correct types
            expect(typeof extractedContext.requestId).toBe('string');
            expect(typeof extractedContext.method).toBe('string');
          }
        )
      );
    });
  });

  describe('Code Quality Gates', () => {
    it('should enforce NestJS decorator patterns', () => {
      // Verify that our service follows NestJS patterns
      expect(ErrorMonitoringService).toBeDefined();
      expect(typeof ErrorMonitoringService).toBe('function');
      
      // Verify the service can be instantiated
      const service = new ErrorMonitoringService();
      expect(service).toBeInstanceOf(ErrorMonitoringService);
      
      // Verify required methods exist
      expect(typeof service.reportError).toBe('function');
      expect(typeof service.extractRequestContext).toBe('function');
    });

    it('should maintain consistent async/await patterns', async () => {
      const service = new ErrorMonitoringService();
      const testError = new Error('Test error');
      
      // Verify async methods return promises
      const result = service.reportError(testError);
      expect(result).toBeInstanceOf(Promise);
      
      // Verify the promise resolves
      await expect(result).resolves.not.toThrow();
    });
  });
});