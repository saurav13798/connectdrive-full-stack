/**
 * Environment configuration with validation
 */

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PUBLIC_APP_VERSION: string;
}

/**
 * Validates and returns typed environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const config = {
    NODE_ENV: process.env.NODE_ENV as EnvironmentConfig['NODE_ENV'],
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'ConnectDrive',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  };

  // Validate required environment variables
  const requiredVars: (keyof EnvironmentConfig)[] = [
    'NODE_ENV',
    'NEXT_PUBLIC_API_URL',
  ];

  const missingVars = requiredVars.filter(key => !config[key]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate NODE_ENV
  if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
    throw new Error(
      `Invalid NODE_ENV: ${config.NODE_ENV}. Must be 'development', 'production', or 'test'`
    );
  }

  // Validate API URL format
  if (config.NEXT_PUBLIC_API_URL && !isValidUrl(config.NEXT_PUBLIC_API_URL)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_URL: ${config.NEXT_PUBLIC_API_URL}. Must be a valid URL`
    );
  }

  return config as EnvironmentConfig;
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Export validated config
export const env = getEnvironmentConfig();