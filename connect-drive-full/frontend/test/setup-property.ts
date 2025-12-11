import * as fc from 'fast-check';

// Global property test configuration
export const propertyTestConfig = {
  numRuns: 100, // Minimum 100 iterations per property as specified in design
  timeout: 10000,
  seed: Date.now(),
  verbose: process.env['NODE_ENV'] === 'development',
};

// Configure fast-check globally
fc.configureGlobal({
  numRuns: propertyTestConfig.numRuns,
  timeout: propertyTestConfig.timeout,
  seed: propertyTestConfig.seed,
  verbose: propertyTestConfig.verbose,
});

// Global test setup
beforeAll(() => {
  console.log('🧪 Property-based testing setup initialized');
  console.log(`📊 Running ${propertyTestConfig.numRuns} iterations per property`);
});

// Global test teardown
afterAll(() => {
  console.log('✅ Property-based testing completed');
});

// Helper function to create property test with consistent configuration
export const createPropertyTest = (
  _name: string,
  property: fc.IProperty<unknown>,
  config: Partial<fc.Parameters<unknown>> = {}
) => {
  return fc.assert(property, { ...propertyTestConfig, ...config });
};

// Export fast-check for use in tests
export { fc };